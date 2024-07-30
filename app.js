const fs = require("fs");
// const https = require("https");
const path = require("path");
const multer = require("multer");
const helmet = require("helmet");
const morgan = require("morgan");
const express = require("express");
const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");
var { ruruHTML } = require("ruru/server");
const bodyParser = require("body-parser");
const compression = require("compression");
const { createHandler } = require("graphql-http/lib/use/express");
const { applyMiddleware } = require("graphql-middleware");
require("@dotenvx/dotenvx").config();

const { clearImage } = require("./utils/clear-image");

const graphqlSchema = require("./graphql/schema");
const graphqlResolver = require("./graphql/resolvers");
const { graphqlContext } = require("./context/graphql");
const { permissions } = require("./middleware/permissions");

const connectionUrl = process.env.NODE_MONGO_CONNECTION_URL;
// const httpsPrivateKey = fs.readFileSync("server.key");
// const httpsCertificate = fs.readFileSync("server.cert");

const fileStorage = multer.diskStorage({
  destination: "images",
  filename: function (req, file, cb) {
    const { filename, originalname, mimetype } = file ?? {};
    const [, type] = mimetype.split("/");
    cb(null, `img_${Date.now()}.${type || "jpg"}`);
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
const accessLogStream = fs.createWriteStream(
  path.join(__dirname, "access.log"),
  { flags: "a" }
);

// remove in prod mode
app.get("/ruru", (_req, res) => {
  res.type("html");
  res.end(ruruHTML({ endpoint: "/graphql" }));
});

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(compression());
app.use(morgan("combined", { stream: accessLogStream }));

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

app.put("/post-image", (req, res, next) => {
  if (!req.file) {
    return res.status(422).json({ message: "No file provided." });
  }
  if (req.body.oldPath) {
    clearImage(req.body.oldPath);
  }

  return res.status(201).json({
    message: "Success.",
    filePath: req.file.path.replaceAll("//", "/"),
  });
});

app.use(
  "/graphql",
  createHandler({
    schema,
    rootValue: graphqlResolver,
    context: (req) => graphqlContext(req),
    formatError(err) {
      const { originalError, message = "An error occured." } = err;
      if (!originalError) {
        return err;
      }
      const { data, code = 500 } = originalError;
      return { message, status: code, data };
    },
  })
);

app.use((error, req, res, next) => {
  console.log(error);
  const { statusCode, message, data } = error;
  return res.status(statusCode ?? 500).json({ message, data });
});

mongoose
  .connect(connectionUrl)
  .then((result) => {
    // https.createServer({ key: httpsPrivateKey, cert: httpsCertificate }, app)
    // .listen(process.env.NODE_SERVER_HOST || 3000);
    app.listen(process.env.NODE_SERVER_HOST);
    console.log("MONGODB_CONNECTED");
  })
  .catch((err) => console.log("CONNECTION_ERR", err));
