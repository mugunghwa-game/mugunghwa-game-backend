require("dotenv").config();

const express = require("express");
const createError = require("http-errors");
const http = require("http");
const cors = require("cors");
const app = express();
const server = http.createServer(app);
app.use(cors());

const socket = require("./src/socket");
socket(server);

app.use(express.json());

app.use("/", (req, res, next) => {
  res.json("hello");
  console.log("hello");
});

app.use(express.urlencoded({ extended: false }));

app.use(function (req, res, next) {
  next(createError(404));
});

app.use(function (err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  res.status(err.status || 500);

  console.log({
    status: err.status,
    message: res.locals.message,
    stack: err.stack,
  });
});

server.listen(process.env.PORT || 8080, () =>
  console.log("server is running on port 8080")
);

server.on("error", (error) => console.error(error));
server.on("listening", () => console.log(`listening on port 8080`));

module.exports = app;
