import { useEffect } from "react";
import { useDispatch } from "react-redux";
import Highlights from "./components/highlights.jsx";
import { setHighlights } from "./reducers/highlightsReducer.js";
import highlightService from "./services/highlightService.js";
import { getData, saveData } from "./services/dbService.js";

function App() {
  const dispatch = useDispatch();

  useEffect(() => {
    const fetchHighlights = async () => {
      // 1. Intentar cargar desde caché
      const cached = await getData("raw-highlights");
      if (cached) {
        dispatch(setHighlights(cached));
      }

      // 2. Cargar desde API
      try {
        const highlights = await highlightService.getAll();
        
        // Optimización: Comparación básica para evitar actualizaciones innecesarias
        // Evitamos JSON.stringify que bloquea el hilo principal con grandes datasets
        const isLengthMatch = cached && cached.length === highlights.length;
        // Si tiene la misma longitud, asumimos que es el mismo set para evitar re-renders costosos
        // Idealmente el backend debería devolver un hash/etag
        if (isLengthMatch) {
          // Verificación superficial del primer y último elemento si existen
          const firstMatch = cached.length > 0 && cached[0]?.id === highlights[0]?.id;
          const lastMatch = cached.length > 0 && cached[cached.length - 1]?.id === highlights[highlights.length - 1]?.id;
          
          if (firstMatch && lastMatch) {
             console.log("Highlights appear identical (length & boundary check), skipping update");
             return;
          }
        }

        dispatch(setHighlights(highlights));
        
        // 3. Guardar en caché para la próxima vez
        await saveData("raw-highlights", highlights);
      } catch (error) {
        console.error("Error fetching highlights:", error);
      }
    };
    fetchHighlights();
  }, [dispatch]);

  return (
    <div className="app-container">
      <Highlights />
    </div>
  );
}

export default App;
