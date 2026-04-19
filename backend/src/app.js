const path = require("path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const env = require("./config/env");
const apiRoutes = require("./routes");
const { notFoundHandler, errorHandler } = require("./middlewares/error");

const app = express();

app.disable("x-powered-by");

app.use(helmet());
app.use(
  cors({
    origin: env.allowedOrigins,
    credentials: true,
  })
);
app.use(morgan("dev"));
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));
app.use("/api/v1", apiRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;