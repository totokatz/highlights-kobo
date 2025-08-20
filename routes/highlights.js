// routes/highlights.js
const highlightRouter = require("express").Router();
const Highlight = require("../moduls/highlight.js");

highlightRouter.get("/", async (_req, res) => {
  const highlights = await Highlight.find({}).limit(100);
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

    const results = [];

    for (const doc of data.documents) {
      // upsert documento (si no existe lo crea)
      const update = {
        $setOnInsert: {
          file: doc.file,
          title: doc.title,
          number_of_pages: doc.number_of_pages,
        },
      };

      // para cada entry, usás $addToSet
      if (doc.entries && doc.entries.length > 0) {
        for (const entry of doc.entries) {
          const updated = await Highlight.updateOne(
            { file: doc.file, title: doc.title }, // criterio de documento
            {
              ...update,
              $addToSet: { entries: entry }, // agrega solo si no existe ese objeto exacto
            },
            { upsert: true }
          );
          results.push(updated);
        }
      }
    }

    return res.status(201).json(results);
  } catch (error) {
    console.error("Error al guardar:", error);
    return res.status(500).json({
      error: "Error al procesar el archivo",
      detail: String(error?.message || error),
    });
  }
});

module.exports = highlightRouter;
