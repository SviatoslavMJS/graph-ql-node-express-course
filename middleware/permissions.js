const { rule, shield } = require("graphql-shield");

const isAuthenticated = rule({ cache: "contextual" })(
  async (parent, args, ctx, info) => {
    return ctx.isAuth;
  }
);

module.exports.permissions = shield(
  {
    Query: {
      // login: allowAll,
    },
    Mutation: {
      // createUser: allowAll,
      createPost: isAuthenticated,
    },
  },
  { allowExternalErrors: true }
);
