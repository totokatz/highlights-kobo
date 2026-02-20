const highlightRouter = require("express").Router();
const supabase = require("../lib/supabase.cjs");

// GET / — Devuelve todos los documentos con sus entries anidados
highlightRouter.get("/", async (_req, res) => {
  try {
    const { data: documents, error } = await supabase
      .from("documents")
      .select("*, entries(*)")
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Transformar para mantener compatibilidad con el frontend
    const result = documents.map((doc) => ({
      id: doc.id,
      file: doc.file,
      title: doc.title,
      author: doc.author,
      number_of_pages: doc.number_of_pages,
      createdAt: doc.created_at,
      updatedAt: doc.updated_at,
      entries: (doc.entries || []).map((e) => ({
        id: e.id,
        page: e.page,
        time: e.time,
        color: e.color,
        sort: e.sort,
        drawer: e.drawer,
        chapter: e.chapter,
        text: e.text,
        note: e.note,
        starred: e.starred,
      })),
    }));

    res.json(result);
  } catch (error) {
    console.error("Error al obtener highlights:", error);
    res.status(500).json({ error: "Error al obtener highlights" });
  }
});

// POST / — Upsert documentos con sus entries
highlightRouter.post("/", async (req, res) => {
  try {
    const data = req.body;
    if (!data || !Array.isArray(data.documents)) {
      return res
        .status(400)
        .json({ error: "Formato inválido: se esperaba { documents: [...] }" });
    }

    let docsUpserted = 0;
    let entriesInserted = 0;

    for (const doc of data.documents) {
      // Upsert del documento
      const { data: upsertedDoc, error: docError } = await supabase
        .from("documents")
        .upsert(
          {
            file: doc.file || "",
            title: doc.title,
            author: doc.author || null,
            number_of_pages: doc.number_of_pages || null,
          },
          { onConflict: "file,title" }
        )
        .select("id")
        .single();

      if (docError) throw docError;
      docsUpserted++;

      // Insert entries (ON CONFLICT DO NOTHING para dedup)
      const entries = (doc.entries || []).map((e) => ({
        document_id: upsertedDoc.id,
        page: typeof e.page === "number" ? e.page : 0,
        time: e.time || null,
        color: e.color || null,
        sort: e.sort || null,
        drawer: e.drawer || null,
        chapter: e.chapter || null,
        text: e.text,
        note: e.note || null,
        starred: e.starred || false,
      }));

      if (entries.length > 0) {
        const { data: inserted, error: entryError } = await supabase
          .from("entries")
          .upsert(entries, {
            onConflict: "document_id,text_hash",
          })
          .select("id");

        if (entryError) throw entryError;
        entriesInserted += (inserted || []).length;
      }
    }

    return res.status(201).json({
      message: "Importación exitosa",
      docsUpserted,
      entriesInserted,
    });
  } catch (error) {
    console.error("Error al guardar:", error);
    return res.status(500).json({
      error: "Error al procesar el archivo",
      detail: String(error?.message || error),
    });
  }
});

// PATCH /:docId/entries/:entryId/star — Toggle starred
highlightRouter.patch("/:docId/entries/:entryId/star", async (req, res) => {
  try {
    const { entryId } = req.params;
    const { starred } = req.body;

    const { data, error } = await supabase
      .from("entries")
      .update({ starred })
      .eq("id", entryId)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error("Error al actualizar starred:", error);
    res.status(500).json({ error: "Error al actualizar starred" });
  }
});

module.exports = highlightRouter;
