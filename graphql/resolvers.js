const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { isEmail, isEmpty, isLength } = require("validator");
require("@dotenvx/dotenvx").config();

const User = require("../models/user");
const Post = require("../models/post");

const perPage = 2;
const jwtSecretKey = process.env.JSON_WEB_TOKEN_SECRET_KEY;

module.exports = {
  createUser: async function (args, req) {
    const errors = [];
    const { email, name, password } = args.userInput;

    if (!isEmail(email)) {
      errors.push({ message: "Email is invalid." });
    }
    if (isEmpty(password) || !isLength(password, { min: 6 })) {
      errors.push({ message: "Password is too short." });
    }

    if (errors.length) {
      const error = new Error("Invalid input");
      error.data = errors;
      error.code = 422;
      throw error;
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      const error = new Error("User already exist");
      throw error;
    }

    const hashedPwd = await bcrypt.hash(password, 13);
    const user = new User({ email, name, password: hashedPwd });
    const createdUser = await user.save();

    return { ...createdUser._doc, _id: createdUser._id.toString() };
  },

  login: async function ({ email, password }) {
    console.log(email, password);
    const user = await User.findOne({ email });
    if (!user) {
      const error = new Error("User not found.");
      error.code = 404;
      throw error;
    }

    const isEqual = await bcrypt.compare(password, user.password);

    if (!isEqual) {
      const error = new Error("Wrong password or email.");
      error.code = 401;
      throw error;
    }

    const token = jwt.sign(
      {
        userId: user._id.toString(),
        email: user.email,
      },
      jwtSecretKey,
      { expiresIn: "1h" }
    );

    return {
      token,
      userId: user._id.toString(),
    };
  },

  createPost: async function ({ postInput }, args, ctx, info) {
    const errors = [];
    const { title, content, imageUrl } = postInput;

    if (isEmpty(title) || !isLength(title, { min: 5 })) {
      errors.push({ message: "Title is too short." });
    }
    if (isEmpty(content) || !isLength(content, { min: 5 })) {
      errors.push({ message: "Content is too short." });
    }

    if (errors.length > 0) {
      const error = new Error("Invalid input");
      error.data = errors;
      error.code = 422;
      throw error;
    }

    const user = await User.findById(args.userId, "name _id email posts");
    if (!user) {
      const error = new Error("Invalid user.");
      error.code = 401;
      throw error;
    }

    const post = new Post({
      title,
      content,
      imageUrl: decodeURI(imageUrl),
      creator: user,
    });
    const createdPost = await post.save();
    user.posts.push(createdPost);
    await user.save();

    return {
      ...createdPost._doc,
      _id: createdPost._id.toString(),
      createdAt: createdPost.createdAt.toISOString(),
      updatedAt: createdPost.updatedAt.toISOString(),
      creator: user,
    };
  },

  posts: async ({ page = 1 }, args, ctx, info) => {
    const totalCount = await Post.find().countDocuments();
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * perPage)
      .limit(perPage)
      .populate("creator", 'name _id email createdAt');

    return {
      posts: posts.map(
        ({ _id, createdAt, updatedAt, title, content, imageUrl, creator }) => ({
          title,
          content,
          creator,
          imageUrl,
          _id: _id.toString(),
          createdAt: createdAt.toISOString(),
          updatedAt: updatedAt.toISOString(),
        })
      ),
      totalCount,
    };
  },

  postDetails: async ({ postId }, args, ctx, info) => {
    console.log("PPP", postId);
    const { _id, title, content, creator, createdAt, updatedAt, imageUrl } =
      (await Post.findOne({ _id: postId }).populate("creator", 'name _id email createdAt')) ?? {};

    return {
      title,
      content,
      creator,
      imageUrl,
      _id: _id.toString(),
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt.toISOString(),
    };
  },

  updatePost: async function ({ postInput }, args, ctx, info) {
    const errors = [];
    const { _id, title, content, imageUrl } = postInput;

    if (isEmpty(title) || !isLength(title, { min: 5 })) {
      errors.push({ message: "Title is too short." });
    }
    if (isEmpty(content) || !isLength(content, { min: 5 })) {
      errors.push({ message: "Content is too short." });
    }

    if (errors.length > 0) {
      const error = new Error("Invalid input");
      error.data = errors;
      error.code = 422;
      throw error;
    }

    const post = await Post.findById(_id).populate("creator", 'name _id email createdAt');
    if (!post) {
      const error = new Error("Post not found.");
      error.data = errors;
      error.code = 404;
      throw error;
    }
    if (post.creator._id.toString() !== args.userId) {
      const error = new Error("Not allowed to update.");
      error.data = errors;
      error.code = 401;
      throw error;
    }
    const decodedImageUrl = decodeURI(imageUrl);
    const updatedPost = await Post.findByIdAndUpdate(
      { _id },
      { title, content, imageUrl: decodedImageUrl },
      {
        returnDocument: "after",
      }
    ).populate("creator", 'name _id email createdAt');

    return {
      ...updatedPost._doc,
      _id: updatedPost._id.toString(),
      createdAt: updatedPost.createdAt.toISOString(),
      updatedAt: updatedPost.updatedAt.toISOString(),
    };
  },
};
