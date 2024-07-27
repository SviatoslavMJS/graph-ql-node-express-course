const { decodeToken } = require("../utils/token");

module.exports.graphqlContext = (req) => {
  const decoded = decodeToken(req.raw.get("Authorization"));
  return {
    ...decoded,
    query: req.raw.query,
    params: req.raw.params,
  };
};
