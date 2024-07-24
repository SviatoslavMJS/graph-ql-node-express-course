const jwt = require("jsonwebtoken");
require("@dotenvx/dotenvx").config();

const jwtSecretKey = process.env.JSON_WEB_TOKEN_SECRET_KEY;

module.exports = (req, res, next) => {
  const authHeader = req.get("Authorization");
  if (!authHeader) {
    const err = new Error("Not authenticated.");
    err.statusCode = 401;
    throw err;
  }
  const [_, token] = authHeader.split(" ");
  let decodedToken;

  try {
    decodedToken = jwt.verify(token, jwtSecretKey);
  } catch (error) {
    error.statusCode = 500;
    throw error;
  }

  if (!decodedToken) {
    const err = new Error("Not authenticated.");
    err.statusCode = 401;
    throw err;
  }

  req.userId = decodedToken.userId;
  next();
};
