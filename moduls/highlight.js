// moduls/highlight.js
const mongoose = require("mongoose");
mongoose.set("strictQuery", false);

const EntrySchema = new mongoose.Schema({
  page: { type: Number, required: true },
  time: Number,
  color: String,
  sort: String,
  drawer: String,
  chapter: String,
  text: { type: String, required: true },
});

const DocumentSchema = new mongoose.Schema(
  {
    file: { type: String, required: true },
    title: { type: String, required: true },
    number_of_pages: Number,
    entries: { type: [EntrySchema], default: [] },
  },
  { timestamps: true }
);

DocumentSchema.index({ file: 1, title: 1 }, { unique: true });

DocumentSchema.set("toJSON", {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
  },
});

// 👇 esta línea evita redefinir el modelo si nodemon recompila
module.exports =
  mongoose.models.Highlight || mongoose.model("Highlight", DocumentSchema);
