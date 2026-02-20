import { createSlice, current } from "@reduxjs/toolkit";
//import initialState from "../../all.json" assert { type: "json" };

//console.log("Initial state", initialState);

const highlightSlice = createSlice({
  name: "highlights",
  //initialState: [initialState.documents],
  initialState: [],
  reducers: {
    setHighlights(state, action) {
      return action.payload;
    },
    addHighlight(state, action) {
      const payload = action.payload;
      if (!Array.isArray(payload)) return;

      // Usar un Map para búsquedas más rápidas por título
      const stateMap = new Map(state.map(lib => [lib.title?.trim().toLowerCase(), lib]));

      for (let document of payload) {
        const titulo = document.title?.trim();
        if (!titulo) continue;

        const libroEncontrado = stateMap.get(titulo.toLowerCase());

        if (!libroEncontrado) {
          // Si el libro es nuevo, aún así de-duplicamos sus entradas internas
          const uniqueEntries = [];
          const seenTexts = new Set();

          for (let entry of document.entries ?? []) {
            const txt = entry.text?.trim();
            if (txt && !seenTexts.has(txt)) {
              seenTexts.add(txt);
              uniqueEntries.push({ ...entry, text: txt });
            }
          }
          const newLibro = { ...document, title: titulo, entries: uniqueEntries };
          state.push(newLibro);
          stateMap.set(titulo.toLowerCase(), newLibro);
        } else {
          // Si el libro ya existe, añadimos solo las entradas que no tengamos
          const seenTexts = new Set(libroEncontrado.entries.map(e => e.text?.trim()));
          
          for (let highlight of document.entries ?? []) {
            const txt = highlight.text?.trim();
            if (!txt || seenTexts.has(txt)) continue;

            seenTexts.add(txt);
            libroEncontrado.entries.push({ ...highlight, text: txt });
          }
        }
      }
    },
    updateEntry(state, action) {
      const { docId, entryId, updates } = action.payload;
      const doc = state.find((d) => d.id === docId);
      if (doc) {
        const entry = doc.entries.find((e) => (e._id || e.id) === entryId);
        if (entry) {
          Object.assign(entry, updates);
        }
      }
    },
  },
});

export const { addHighlight, setHighlights, updateEntry } = highlightSlice.actions;
export default highlightSlice.reducer;
