import { useState } from "react";
import { useDispatch } from "react-redux";
import { addHighlight } from "../reducers/highlightsReducer";
import highlightService from "../services/highlightService";

const Importar = () => {
  const dispatch = useDispatch();
  const [files, setFiles] = useState([]);

  const FiltrarData = async (File) => {
    for (const file of files) {
      const text = await file.text();
      const data = JSON.parse(text);
      console.log("Data: ", data);
      const librosQueCumplenFormato = {
        documents: [],
      };

      for (let document of data.documents) {
        if (
          document.entries[0].color !== undefined &&
          document.entries[0].page !== undefined &&
          document.entries.length > 45
        ) {
          librosQueCumplenFormato.documents.push(document);
        }
      }
      console.log("Libros Que cumplen: ", librosQueCumplenFormato);
      const newHighlights = await highlightService.postHighlights(
        librosQueCumplenFormato
      );
      console.log("newHigligh :", newHighlights);
      dispatch(addHighlight(newHighlights));
    }
  };

  const handleChange = (e) => {
    setFiles(Array.from(e.target.files || []));
  };

  const handleOnSubmit = async (e) => {
    e.preventDefault();
    FiltrarData(files);
    setFiles([]);
    e.target.reset();
  };

  return (
    <div>
      <form onSubmit={handleOnSubmit}>
        <label>
          Subí tu archivo:
          <input
            type="file"
            name="highlights"
            multiple
            accept=".json,application/json"
            onChange={handleChange}
          />
        </label>
        <button type="submit" disabled={files.length === 0}>
          Subir
        </button>
      </form>
    </div>
  );
};

export default Importar;
