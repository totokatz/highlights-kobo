const express = require("express");
const mongoose = require("mongoose");
const Highlight = require("./moduls/highlight.js");
require("dotenv").config();
const app = express();
const highlightRouter = require("./routes/highlights.js");

const cors = require("cors");

const url = process.env.MONGODB_URI;

console.log("connecting to", url);

mongoose
  .connect(url)
  .then((result) => {
    console.log("connected to MongoDB");
  })
  .catch((error) => {
    console.log("error connecting to MongoDB:", error.message);
  });

app.use(express.static("dist"));
app.use(
  express.json({
    limit: "200mb",
    type: ["application/json", "application/*+json"],
  })
);

app.use(express.urlencoded({ extended: true, limit: "200mb" }));
app.use(cors());
app.use("/api/highlights", highlightRouter);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
