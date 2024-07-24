const fs = require("fs");
const path = require("path");
const { validationResult } = require("express-validator");

const io = require("../socket");
const Post = require("../models/post");
const User = require("../models/user");
const user = require("../models/user");

const itemsPerPage = 2;

const clearImage = (imageUrl) => {
  fs.unlink(path.join(__dirname, "..", imageUrl), (err) =>
    console.log(
      err
        ? "FS_CLEAR_IMAGE_FAILED"
        : "FS_IMAGE_SUCCESSFULY_REMOVED - " + imageUrl
    )
  );
};

exports.getPosts = async (req, res, next) => {
  try {
    const page = req.query.page || 1;
    const totalItems = (await Post.find().countDocuments()) || 0;

    const posts = await Post.find()
      .populate("creator", "_id email name")
      .sort({ createdAt: -1 })
      .skip((page - 1) * itemsPerPage)
      .limit(itemsPerPage);

    if (!posts) {
      const error = new Error("No posts found.");
      error.statusCode = 404;
      throw error;
    }
    res
      .status(200)
      .json({ message: "Success", posts: posts ?? [], totalItems });
  } catch (err) {
    console.log("GET_POSTS_ERR", err);
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.createPost = async (req, res, next) => {
  try {
    const file = req.file;
    const errors = validationResult(req);

    if (!errors.isEmpty() || !file) {
      const error = new Error(
        !file ? "Image is required field." : "Validation error."
      );
      error.statusCode = 422;
      throw error;
    }

    const { title, content } = req.body;

    const post = new Post({
      title,
      content,
      imageUrl: file.path,
      creator: req.userId,
    });

    const newPost = await post.save();
    console.log("POST_CREATED", newPost);

    const creator = await User.findById(req.userId);

    creator.posts.push(post);
    await creator.save();

    io.getIO().emit("posts", {
      action: "create",
      post: { ...post._doc, creator: { _id: req.userId, name: creator.name } },
    });

    res.status(201).json({
      post,
      message: "Post created successfully!",
      creator: {
        _id: creator._id,
        name: creator.name,
      },
    });
  } catch (err) {
    console.log("CREATE_POST_ERR", err);
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.getPost = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const post = await Post.findById(postId).populate(
      "creator",
      "_id name email"
    );

    if (!post) {
      const error = new Error("Cant find a post - " + postId);
      error.statusCode = 404;
      throw error;
    }
    res.status(200).json({ message: "Success", post });
  } catch (err) {
    console.log("GET_POST_ERR", err);
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.updatePost = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const file = req.file;
    const errors = validationResult(req);
    const isNewImage = !!file?.path;

    if (!errors.isEmpty()) {
      const error = new Error("Validation error.");
      error.statusCode = 422;
      throw error;
    }

    const { title, content } = req.body;
    const payload = {
      title,
      content,
      imageUrl: isNewImage ? file.path : undefined,
    };
    const post = await Post.findById(postId);

    if (!post) {
      throw new Error("Post not found.");
    }
    if (post.creator._id.toString() !== req.userId.toString()) {
      const error = new Error("Not alowed to update.");
      error.statusCode = 403;
      throw error;
    }

    const newPost = await Post.findByIdAndUpdate(postId, payload, {
      returnDocument: "after",
    });
    console.log("POST_UPDATED", newPost);

    io.getIO().emit("posts", {
      action: "update",
      post: newPost,
    });

    res.status(201).json({
      message: "Post updated successfully!",
      post: newPost,
    });

    if (isNewImage) {
      clearImage(post.imageUrl);
    }
  } catch (err) {
    console.log("UPDATE_POST_ERR", err);
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.deletePost = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const post = await Post.findById(postId);

    if (!post) {
      throw new Error("Post not found.");
    }

    if (post.creator._id.toString() !== req.userId.toString()) {
      const error = new Error("Not allowed to delete.");
      error.statusCode = 403;
      throw error;
    }

    clearImage(post.imageUrl);
    await Post.findByIdAndDelete(postId);
    io.getIO().emit("posts", {
      action: "delete",
      postId,
    });
    const user = await User.findById(req.userId);

    user.posts.pull(postId);
    await user.save();

    res.status(200).json({ message: "Successfully deleted." });
  } catch (err) {
    console.log("DELETE_POST_ERR", err);
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};
