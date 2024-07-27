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
      // login: allowAll,
      posts: isAuthenticated,
    },
    Mutation: {
      // createUser: allowAll,
      createPost: isAuthenticated,
    },
  },
  { allowExternalErrors: true }
);
