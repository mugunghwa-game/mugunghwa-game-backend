require("dotenv").config();

const express = require("express");
const createError = require("http-errors");
const http = require("http");
const app = express();
const server = http.createServer(app);

const socket = require("./src/socket");
socket(server);

const cors = require("cors");

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());

server.listen(process.env.PORT || 8000, () =>
  console.log("server is running on port 8000")
);

app.use(function (req, res, next) {
  next(createError(404));
});

app.use(function (err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  res.status(err.status || 500);

  console.log({ status: err.status, message: res.locals.message });
});

module.exports = app;
