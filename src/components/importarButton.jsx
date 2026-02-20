import { useState, useRef } from "react";
import { useDispatch } from "react-redux";
import { addHighlight } from "../reducers/highlightsReducer";
import highlightService from "../services/highlightService";

const Importar = () => {
  const dispatch = useDispatch();
  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);

  const parseSDRFilename = (filename) => {
    const cleanName = filename.replace(/\.sdr\.json$/i, "");
    // Intenta extraer Título (Autor)
    const match = cleanName.match(/^(.+?)\s*\((.+?)\)/);
    if (match) {
      return { title: match[1].trim(), author: match[2].trim() };
    }
    return { title: cleanName, author: "Desconocido" };
  };

  const extractAuthorFromPath = (path) => {
    if (!path) return "Desconocido";
    
    // Extraer nombre del archivo del path
    const filename = path.split('/').pop().split('\\').pop().replace(/\.(epub|mobi|pdf|azw3)$/i, "").trim();
    
    // 1. Caso Título (Autor) (Z-Library) - Común en descargas
    const zLibMatch = filename.match(/\(([^()]+)\)\s*\(Z-Library\)/i);
    if (zLibMatch) return zLibMatch[1].trim();

    // 2. Caso Título (Autor) - Al final del nombre
    const parenMatch = filename.match(/\(([^()]+)\)$/);
    if (parenMatch) return parenMatch[1].trim();

    // 3. Caso Título - Autor o Autor - Título
    // Intentamos buscar un guión rodeado de espacios
    if (filename.includes(" - ")) {
      const parts = filename.split(" - ");
      // Si hay dos partes, solemos asumir que la segunda es el autor en este contexto
      // pero si la primera parece un autor (Nombre Apellido) y la segunda un título largo...
      // Por simplicidad, tomamos la última parte que no sea numérica
      const lastPart = parts[parts.length - 1].trim();
      if (!/^\d+$/.test(lastPart)) return lastPart;
      if (parts.length > 1) return parts[0].trim();
    }

    return "Desconocido";
  };

  const parseSDRContent = (data, filename) => {
    const { title, author } = parseSDRFilename(filename);
    const entries = Object.values(data)
      .filter((val) => val && typeof val === "object" && val.text)
      .map((val) => ({
        text: val.text,
        page: val.pageno || 0,
        chapter: val.chapter || "",
        // SDR suele tener "2026-02-04 17:55:03", lo convertimos a timestamp
        time: val.datetime ? new Date(val.datetime.replace(" ", "T")).getTime() : 0,
        id: val.pos0 || `sdr-${Math.random().toString(36).substr(2, 9)}`,
      }));

    return { author, title, entries };
  };

  const FiltrarData = async (filesToProcess) => {
    setIsUploading(true);
    try {
      for (const file of filesToProcess) {
        const text = await file.text();
        const data = JSON.parse(text);

        let librosValidos = [];

        // Detección automática de tipo de archivo
        if (data.documents && Array.isArray(data.documents)) {
          // Formato all-books (tiene documents con entries)
          librosValidos = data.documents
            .filter((doc) => doc.entries && doc.entries.length > 0)
            .map((doc) => {
              const author = doc.author || extractAuthorFromPath(doc.file, doc.title);
              return {
                ...doc,
                author: author === "Z-Library" ? "Desconocido" : author,
                title: doc.title || "Sin título"
              };
            });
        } else if (data.books && Array.isArray(data.books)) {
          // Formato highlights_all (tiene books con highlights)
          librosValidos = data.books
            .filter((book) => book.highlights && book.highlights.length > 0)
            .map((book) => ({
              title: book.title || "Sin título",
              author: book.author || "Desconocido",
              number_of_pages: book.pages || 0,
              file: book.file || "",
              entries: book.highlights.map((h) => ({
                text: h.text,
                chapter: h.chapter || "",
                page: typeof h.page === "number" ? h.page : 0,
                time: h.datetime ? new Date(h.datetime.replace(" ", "T")).getTime() : 0,
                color: h.color || "gray",
                drawer: h.style || "lighten",
                sort: "highlight",
                note: h.note || "",
              })),
            }));
        } else if (file.name.toLowerCase().endsWith(".sdr.json") || Object.values(data).some(v => v && v.text)) {
          // Formato SDR (KOReader)
          const sdrLibro = parseSDRContent(data, file.name);
          if (sdrLibro.entries.length > 0) {
            librosValidos = [sdrLibro];
          }
        }

        if (librosValidos.length === 0) {
          console.warn(`El archivo ${file.name} no contiene libros con highlights o el formato no es soportado.`);
          continue;
        }

        console.log(`Subiendo ${librosValidos.length} libros de ${file.name}...`);

        await highlightService.postHighlights({
          documents: librosValidos,
        });

        // Una vez subidos exitosamente, los agregamos al estado global
        dispatch(addHighlight(librosValidos));
      }
      alert("¡Libros importados con éxito!");
    } catch (error) {
      console.error("Error al importar highlights:", error);
      alert("Hubo un error al subir los libros. Por favor, intenta de nuevo.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = ""; // Reset input so same file can be selected again
      }
    }
  };

  const handleChange = async (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length > 0) {
      await FiltrarData(selectedFiles);
    }
  };

  const handleButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="w-full">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleChange}
        accept=".json,application/json"
        multiple
        style={{ display: "none" }}
        disabled={isUploading}
      />
      <button
        type="button"
        onClick={handleButtonClick}
        disabled={isUploading}
        className={`btn--primary ${isUploading ? "is-uploading" : ""}`}
      >
        {isUploading ? "Subiendo..." : "Subir Libros"}
      </button>
    </div>
  );
};

export default Importar;
