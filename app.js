const path = require("path");
const multer = require("multer");
const express = require("express");
const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");
var { ruruHTML } = require("ruru/server")
const bodyParser = require("body-parser");
const { createHandler } = require("graphql-http/lib/use/express");
const { applyMiddleware } = require("graphql-middleware");
require("@dotenvx/dotenvx").config();

const graphqlSchema = require("./graphql/schema");
const graphqlResolver = require("./graphql/resolvers");
const { graphqlContext } = require("./context/graphql");
const { permissions } = require("./middleware/permissions");

const connectionUrl = process.env.NODE_MONGO_CONNECTION_URL;

const fileStorage = multer.diskStorage({
  destination: "images",
  filename: function (req, { filename, originalname }, cb) {
    cb(null, `${uuidv4()}-${originalname ?? ""}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === "image/png" ||
    file.mimetype === "image/jpg" ||
    file.mimetype === "image/jpeg"
  ) {
    cb(null, true);
  } else {
    cd(null, false);
  }
};

const schema = applyMiddleware(graphqlSchema, permissions);

const app = express();

// remove in prod mode
app.get("/ruru", (_req, res) => {
  res.type("html")
  res.end(ruruHTML({ endpoint: "/graphql" }))
})


app.use(bodyParser.json());
app.use(multer({ storage: fileStorage, fileFilter }).single("image"));
app.use("/images", express.static(path.join(__dirname, "images")));

app.use((req, res, next) => {
  res.setHeader("Accept", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "OPTIONS, GET, POST, PUT, PATCH, DELETE"
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

app.all("/graphql", (...args) =>
  createHandler({
    schema,
    rootValue: graphqlResolver,
    context: graphqlContext(...args),
    formatError(err) {
      console.log("FORMAT_ERR", err);
      const { originalError, message = "An error occured." } = err;
      if (!originalError) {
        return err;
      }
      const { data, code = 500 } = originalError;
      return { message, status: code, data };
    },
  })(...args)
);

app.use((error, req, res, next) => {
  console.log(error);
  const { statusCode, message, data } = error;
  return res.status(statusCode ?? 500).json({ message, data });
});

mongoose
  .connect(connectionUrl)
  .then((result) => {
    app.listen(8080);
    console.log("MONGODB_CONNECTED");
  })
  .catch((err) => console.log("CONNECTION_ERR", err));
