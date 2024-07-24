const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");
require("@dotenvx/dotenvx").config();

const jwtSecretKey = process.env.JSON_WEB_TOKEN_SECRET_KEY;

const User = require("../models/user");

exports.signup = async (req, res, next) => {
  try {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      const error = new Error("Validation error.");
      error.statusCode = 422;
      error.data = errors.array();
      throw error;
    }

    const { email, name, password } = req.body;

    const cryptedPwd = await bcrypt.hash(password, 12);

    const user = new User({ email, name, password: cryptedPwd });
    await user.save();
    res.status(201).json({ message: "Successfully created", user });
  } catch (err) {
    console.log("CREATE_USER_ERR", err);
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email });
    if (!user) {
      const error = new Error("Can't find user with this email.");
      error.statusCode = 401;
      throw error;
    }

    const isEqual = await bcrypt.compare(password, user.password);
    if (!isEqual) {
      const error = new Error("Wrong user or password");
      error.statusCode = 401;
      throw error;
    }
    const token = jwt.sign(
      {
        email: user.email,
        userId: user._id.toString(),
      },
      jwtSecretKey,
      { expiresIn: "1h" }
    );

    res.status(200).json({ token, userId: user._id.toString() });
  } catch (err) {
    console.log("CLOGIN_ERR", err);
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.getStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);

    if (!user) {
      const error = new Error("Can't find user.");
      error.statusCode = 404;
      throw error;
    }

    res.status(200).json({ message: "Success.", status: user.status });
  } catch (err) {
    console.log("GET_STATUS_ERR", err);
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const user = await User.findById(req.userId);

    if (!user) {
      const error = new Error("Can't find user.");
      error.statusCode = 404;
      throw error;
    }
    user.status = status;
    const updatedUser = await user.save();

    console.log("STATUS_UPDATED - " + updatedUser.status);
    res.status(200).json({ message: "Success.", status: updatedUser.status });
  } catch (err) {
    console.log("UPDATE_STATUS_ERR", err);
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};
