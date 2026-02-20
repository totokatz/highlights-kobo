/**
 * Script de migración: MongoDB → Supabase
 * Uso: node migrate-mongo-to-supabase.cjs
 */
const { MongoClient } = require("mongodb");
const { createClient } = require("@supabase/supabase-js");

const MONGO_URI =
  "mongodb+srv://totokatzenelson:gatotorta789@cluster0.0bjslkw.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const SUPABASE_URL = "https://xiwaiaudlwkjclwdgbmb.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhpd2FpYXVkbHdramNsd2RnYm1iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTIwMzQ4MCwiZXhwIjoyMDg2Nzc5NDgwfQ.pePtq3-0YSN-Ch0lP0cGw-Kvd_EC9JKxiKvqmZSpv7k";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function migrate() {
  console.log("Conectando a MongoDB...");
  const mongo = new MongoClient(MONGO_URI);
  await mongo.connect();

  // Buscar la base de datos correcta (la default suele ser "test" o el nombre del cluster)
  const adminDb = mongo.db().admin();
  const { databases } = await adminDb.listDatabases();
  console.log(
    "Bases de datos disponibles:",
    databases.map((d) => d.name)
  );

  // Probar cada DB para encontrar la colección "highlights"
  let collection = null;
  let dbName = null;
  for (const dbInfo of databases) {
    if (["admin", "local", "config"].includes(dbInfo.name)) continue;
    const db = mongo.db(dbInfo.name);
    const collections = await db.listCollections().toArray();
    const names = collections.map((c) => c.name);
    console.log(`  DB "${dbInfo.name}": colecciones = [${names.join(", ")}]`);
    if (names.includes("highlights")) {
      collection = db.collection("highlights");
      dbName = dbInfo.name;
      break;
    }
  }

  if (!collection) {
    console.error("No se encontró la colección 'highlights' en ninguna DB.");
    await mongo.close();
    process.exit(1);
  }

  console.log(`\nUsando DB "${dbName}", colección "highlights"`);
  const docs = await collection.find({}).toArray();
  console.log(`Encontrados ${docs.length} documentos en MongoDB.\n`);

  let totalEntries = 0;
  let docsOk = 0;

  for (const doc of docs) {
    const title = doc.title || "Sin título";
    const file = doc.file || "";
    const entries = doc.entries || [];

    console.log(`📖 "${title}" — ${entries.length} highlights`);

    // Upsert documento
    const { data: upserted, error: docErr } = await supabase
      .from("documents")
      .upsert(
        {
          file,
          title,
          author: doc.author || null,
          number_of_pages: doc.number_of_pages || null,
        },
        { onConflict: "file,title" }
      )
      .select("id")
      .single();

    if (docErr) {
      console.error(`  ❌ Error en documento: ${docErr.message}`);
      continue;
    }

    docsOk++;
    const docId = upserted.id;

    // Insertar entries en batches de 500
    const BATCH_SIZE = 500;
    for (let i = 0; i < entries.length; i += BATCH_SIZE) {
      const batch = entries.slice(i, i + BATCH_SIZE).map((e) => ({
        document_id: docId,
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

      const { data: inserted, error: entryErr } = await supabase
        .from("entries")
        .upsert(batch, {
          onConflict: "document_id,text_hash",
          ignoreDuplicates: true,
        })
        .select("id");

      if (entryErr) {
        console.error(`  ❌ Error en entries batch: ${entryErr.message}`);
      } else {
        totalEntries += (inserted || []).length;
      }
    }
  }

  console.log(`\n✅ Migración completa!`);
  console.log(`   Documentos: ${docsOk}/${docs.length}`);
  console.log(`   Entries insertados: ${totalEntries}`);

  await mongo.close();
}

migrate().catch((err) => {
  console.error("Error fatal:", err);
  process.exit(1);
});
