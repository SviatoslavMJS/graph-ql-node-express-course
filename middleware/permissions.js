const { rule, shield } = require("graphql-shield");

const isAuthenticated = rule({ cache: "contextual" })(
  async (parent, args, ctx, info) => {
    console.log("CTX", ctx);
    return ctx.isAuth;
  }
);

module.exports.permissions = shield(
  {
    Query: {
      posts: isAuthenticated,
      userStatus: isAuthenticated,
    },
    Mutation: {
      deletePost: isAuthenticated,
      updatePost: isAuthenticated,
      createPost: isAuthenticated,
      updateUserStatus: isAuthenticated,
    },
  },
  { allowExternalErrors: true }
);
