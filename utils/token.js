const jwt = require("jsonwebtoken");
require("@dotenvx/dotenvx").config();

const jwtSecretKey = process.env.JSON_WEB_TOKEN_SECRET_KEY;

module.exports.decodeToken = (reqToken) => {
  const result = { isAuth: false, userId: null };
  try {
    if (!reqToken) {
      return result;
    }

    const [_, token] = reqToken.split(" ");
    const decodedToken = jwt.verify(token, jwtSecretKey);
   
    if (!decodedToken) {
      return result;
    }

    return { ...decodedToken, isAuth: true };
  } catch (error) {
    return result;
  }
};
