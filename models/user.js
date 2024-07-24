const { model, Schema } = require("mongoose");

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    status: {
        type: String,
        default: 'Active'
    },
    posts: [
      {
        type: Schema.ObjectId,
        ref: "Post",
      },
    ],
  },
);

module.exports = model("User", userSchema);
