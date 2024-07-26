const { decodeToken } = require("../utils/token");

module.exports.graphqlContext = (req, ...args) => {
  return { ...decodeToken(req.get("Authorization")), params: req.params };
};
