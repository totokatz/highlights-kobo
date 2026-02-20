const express = require("express");
const path = require("path");
require("dotenv").config();

const highlightRouter = require("./routes/highlights.cjs");
const cors = require("cors");

const app = express();

app.use(express.static(path.join(__dirname, "dist")));
app.use(
  express.json({
    limit: "200mb",
    type: ["application/json", "application/*+json"],
  })
);

app.use(express.urlencoded({ extended: true, limit: "200mb" }));
app.use(cors());
app.use("/api/highlights", highlightRouter);

app.use((req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

if (require.main === module) {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
