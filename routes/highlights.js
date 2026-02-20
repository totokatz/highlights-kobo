// routes/highlights.js
const highlightRouter = require("express").Router();
const Highlight = require("../moduls/highlight.js");

highlightRouter.get("/", async (_req, res) => {
  const highlights = await Highlight.find({});
  res.json(highlights);
});

// highlightRouter.post("/", async (req, res) => {
//   try {
//     const data = req.body;
//     console.log("Data present?", !!data, "keys:", data && Object.keys(data));

//     if (!data || !Array.isArray(data.documents)) {
//       return res
//         .status(400)
//         .json({ error: "Formato inválido: se esperaba { documents: [...] }" });
//     }

//     const results = await Highlight.insertMany(data.documents, {
//       ordered: false,
//     });
//     return res.status(201).json(results);
//   } catch (error) {
//     console.error("Error al guardar:", error);
//     return res.status(500).json({
//       error: "Error al procesar el archivo",
//       detail: String(error?.message || error),
//     });
//   }
// });

highlightRouter.post("/", async (req, res) => {
  try {
    const data = req.body;
    if (!data || !Array.isArray(data.documents)) {
      return res
        .status(400)
        .json({ error: "Formato inválido: se esperaba { documents: [...] }" });
    }

    const bulkOps = data.documents.map((doc) => ({
      updateOne: {
        filter: { file: doc.file, title: doc.title },
        update: {
          $set: {
            file: doc.file,
            title: doc.title,
            number_of_pages: doc.number_of_pages,
          },
          $addToSet: { entries: { $each: doc.entries || [] } },
        },
        upsert: true,
      },
    }));

    const result = await Highlight.bulkWrite(bulkOps);
    return res.status(201).json(result);
  } catch (error) {
    console.error("Error al guardar:", error);
    return res.status(500).json({
      error: "Error al procesar el archivo",
      detail: String(error?.message || error),
    });
  }
});

module.exports = highlightRouter;
