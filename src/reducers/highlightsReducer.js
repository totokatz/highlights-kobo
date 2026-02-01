import { createSlice, current } from "@reduxjs/toolkit";
//import initialState from "../../all.json" assert { type: "json" };

//console.log("Initial state", initialState);

const highlightSlice = createSlice({
  name: "highlights",
  //initialState: [initialState.documents],
  initialState: [],
  reducers: {
    addHighlight(state, action) {
      const payload = action.payload;
      for (let document of payload) {
        const titulo = document.title;
        const libroEncontrado = state.find((d) => d.title === titulo);
        if (!libroEncontrado) {
          state.push(document);
        } else {
          for (let highlight of document.entries ?? []) {
            const highlightEncontrado = libroEncontrado.entries.some(
              (h) => h.text === highlight.text
            );
            if (!highlightEncontrado) libroEncontrado.entries.push(highlight);
          }
        }
      }
    },
  },
});

export const { addHighlight } = highlightSlice.actions;
export default highlightSlice.reducer;
