import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Filter from "./components/filter.jsx";
import Highlights from "./components/highlights.jsx";
import { addHighlight } from "./reducers/highlightsReducer.js";
import Importar from "./components/importarButton.jsx";
import highlightService from "./services/highlightService.js";

function App() {
  const [count, setCount] = useState(0);

  // const dispatch = useDispatch();
  const prueba = useSelector((state) => state.Highlights);
  console.log("Prueba ", prueba);
  // const Agregar = () => {
  //   dispatch(addHighlight(kindle));
  // };
  const dispatch = useDispatch();

  useEffect(() => {
    const fetchHighlights = async () => {
      const highlight = await highlightService.getAll();
      dispatch(addHighlight(highlight));
    };
    fetchHighlights();
  }, []);
  return (
    <div>
      <div>
        <Filter />
      </div>
      <Highlights />
      <div>
        <Importar />
      </div>
    </div>
  );
}

export default App;
