import React, {
  useMemo,
  useState,
  useRef,
  useEffect,
  useCallback,
} from "react";
import { useSelector } from "react-redux";
import Sidebar from "./sidebar";
import "../styles/styles.css";
// Importar Worker (Vite syntax)
import SearchWorker from "../workers/searchWorker?worker";

// Virtualized list simple para highlights - con soporte para scroll automático
const VirtualizedHighlights = React.memo(
  ({ items, onOpenInBook, showBookContext, itemRefs, pendingScrollId }) => {
    const [visibleRange, setVisibleRange] = useState({ start: 0, end: 50 });
    const containerRef = useRef(null);

    // Effect para manejar scroll automático a un elemento específico
    useEffect(() => {
      if (!pendingScrollId.current || !items.length) return;

      const targetId = pendingScrollId.current;
      const targetIndex = items.findIndex((item) => item.id === targetId);

      if (targetIndex === -1) {
        pendingScrollId.current = null;
        return;
      }

      // Calcular el rango que incluye el elemento target
      const itemHeight = 200;
      const containerHeight = containerRef.current?.clientHeight || 800;
      const visibleCount = Math.ceil(containerHeight / itemHeight);

      const newStart = Math.max(0, targetIndex - Math.floor(visibleCount / 2));
      const newEnd = Math.min(items.length, newStart + visibleCount + 10);

      setVisibleRange({ start: newStart, end: newEnd });

      // Hacer scroll después de que se renderice
      setTimeout(() => {
        if (containerRef.current) {
          const scrollTop = targetIndex * itemHeight;
          containerRef.current.scrollTop = scrollTop;

          // Buscar y destacar el elemento después del scroll
          setTimeout(() => {
            const el = itemRefs.current.get(targetId);
            if (el) {
              el.scrollIntoView({ behavior: "smooth", block: "center" });
              el.classList.add("card--pulse");
              setTimeout(() => el.classList.remove("card--pulse"), 900);
            }
            pendingScrollId.current = null;
          }, 100);
        }
      }, 50);
    }, [items, pendingScrollId]);

    // Throttled scroll handler
    const handleScroll = useCallback(
      (() => {
        let ticking = false;
        return () => {
          if (!ticking && containerRef.current) {
            requestAnimationFrame(() => {
              const container = containerRef.current;
              if (!container) return;

              const scrollTop = container.scrollTop;
              const itemHeight = 200;
              const containerHeight = container.clientHeight;

              const start = Math.floor(scrollTop / itemHeight);
              const visibleCount = Math.ceil(containerHeight / itemHeight);
              const end = Math.min(start + visibleCount + 10, items.length);

              setVisibleRange({ start: Math.max(0, start - 5), end });
              ticking = false;
            });
          }
          ticking = true;
        };
      })(),
      [items.length]
    );

    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      container.addEventListener("scroll", handleScroll, { passive: true });
      handleScroll(); // Calcular rango inicial

      return () => container.removeEventListener("scroll", handleScroll);
    }, [handleScroll]);

    const visibleItems = items.slice(visibleRange.start, visibleRange.end);

    return (
      <div
        ref={containerRef}
        className="results"
        style={{ height: "100vh", overflow: "auto" }}
      >
        <div style={{ height: visibleRange.start * 200 }} />
        {visibleItems.map((h, index) => (
          <HighlightCard
            key={h.id}
            highlight={h}
            onOpenInBook={onOpenInBook}
            showBookContext={showBookContext}
            ref={(el) => {
              if (el) itemRefs.current.set(h.id, el);
              else itemRefs.current.delete(h.id);
            }}
          />
        ))}
        <div style={{ height: (items.length - visibleRange.end) * 200 }} />
      </div>
    );
  }
);

// Componente HighlightCard más optimizado
const HighlightCard = React.memo(
  React.forwardRef(
    ({ highlight, onOpenInBook, showBookContext = true }, ref) => (
      <article className="card" ref={ref}>
        <header className="card__header">
          <span className="card__book">{highlight.Libro}</span>
          <span className="card__dot">•</span>
          <span className="card__page">Pág. {highlight.Pagina}</span>
          <span className="card__dot">•</span>
          <span className="card__page">Cap: {highlight.Capitulo}</span>
          <span className="card__dot">•</span>
          <span className="card__page">{highlight.Fecha}</span>
        </header>

        <p className="card__text">{highlight.Highlight}</p>

        <footer
          className={`card__footer ${
            showBookContext ? "card__footer--actions" : ""
          }`}
        >
          <span className="card__author">{highlight.Autor}</span>
          {showBookContext && (
            <button
              type="button"
              className="btn"
              onClick={() => onOpenInBook(highlight)}
            >
              Ver en contexto
            </button>
          )}
        </footer>
      </article>
    )
  ),
  (prevProps, nextProps) => {
    // Comparación personalizada para evitar re-renders innecesarios
    return (
      prevProps.highlight.id === nextProps.highlight.id &&
      prevProps.showBookContext === nextProps.showBookContext
    );
  }
);

export default function Highlights() {
  const highlights = useSelector((s) => s.highlights);
  const filter = useSelector((s) => s.filter);

  // Estados
  const [selectedBook, setSelectedBook] = useState(null);
  const [localFilter, setLocalFilter] = useState("");
  const itemRefs = useRef(new Map());
  const pendingScrollId = useRef(null);
  
  // Estado de datos (provenientes del worker)
  const [books, setBooks] = useState([]);
  const [listData, setListData] = useState([]);
  const [bookItems, setBookItems] = useState([]); // Items filtrados del libro seleccionado
  const [isProcessing, setIsProcessing] = useState(false);

  // Worker Ref
  const workerRef = useRef(null);

  // Inicializar Worker
  useEffect(() => {
    workerRef.current = new SearchWorker();
    
    workerRef.current.onmessage = (e) => {
      const { type, payload, id } = e.data;
      
      switch (type) {
        case "DATA_PROCESSED":
          setBooks(payload.books);
          setIsProcessing(false);
          // Trigger initial search to populate listData
          workerRef.current.postMessage({ type: "SEARCH_MAIN", payload: { query: "" }, id: "init" });
          break;
        case "SEARCH_RESULTS":
          if (id === "main") {
            setListData(payload);
          } else if (id === "book") {
            setBookItems(payload);
          } else if (id === "init") {
             setListData(payload);
          }
          break;
        case "ERROR":
          console.error("Worker Error:", payload);
          setIsProcessing(false);
          break;
      }
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  // Enviar datos al worker cuando cambien
  useEffect(() => {
    if (highlights && highlights.length > 0 && workerRef.current) {
      setIsProcessing(true);
      workerRef.current.postMessage({ type: "PROCESS_DATA", payload: highlights, id: "process" });
    }
  }, [highlights]);

  // Buscar en vista principal
  useEffect(() => {
    if (workerRef.current && !selectedBook) {
      workerRef.current.postMessage({ 
        type: "SEARCH_MAIN", 
        payload: { query: filter }, 
        id: "main" 
      });
    }
  }, [filter, selectedBook]); // Re-run when filter changes or we return to main view

  // Buscar en libro seleccionado
  useEffect(() => {
    if (workerRef.current && selectedBook) {
      workerRef.current.postMessage({ 
        type: "SEARCH_BOOK", 
        payload: { bookTitle: selectedBook, query: localFilter }, 
        id: "book" 
      });
    }
  }, [selectedBook, localFilter]);

  // Callbacks estables
  const openInBook = useCallback((item) => {
    setSelectedBook(item.Libro);
    setLocalFilter(""); // Limpiar filtro local para mostrar todos los highlights
    pendingScrollId.current = item.id;
  }, []);

  // Callbacks para sidebar
  const handleBookSelect = useCallback((title) => {
    setSelectedBook(title);
    setLocalFilter("");
    pendingScrollId.current = null;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleCloseBook = useCallback(() => {
    setSelectedBook(null);
    setLocalFilter("");
    pendingScrollId.current = null;
    itemRefs.current.clear();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // Render condicional optimizado
  if (selectedBook) {
    return (
      <div className="layout layout--left">
        <Sidebar
          books={books}
          selected={selectedBook}
          onSelect={handleBookSelect}
        />
        <div className="content">
          <div className="bookbar">
            <button className="btn" onClick={handleCloseBook}>
              ← Volver
            </button>
            <div className="bookbar__search">
              <input
                type="text"
                placeholder="Buscar en este libro..."
                value={localFilter}
                onChange={(e) => setLocalFilter(e.target.value)}
                className="search-input"
              />
            </div>
            <div className="bookbar__info">
              <strong>{selectedBook}</strong>
              <span className="bookbar__count">
                {bookItems.length} highlights
              </span>
            </div>
          </div>

          {bookItems.length === 0 ? (
            <div className="results">
              <p className="empty">
                {localFilter?.trim()
                  ? `Sin resultados para "${localFilter}" en este libro`
                  : "Sin highlights en este libro"}
              </p>
            </div>
          ) : (
            <VirtualizedHighlights
              items={bookItems}
              onOpenInBook={openInBook}
              showBookContext={false}
              itemRefs={itemRefs}
              pendingScrollId={pendingScrollId}
            />
          )}
        </div>
      </div>
    );
  }

  // Vista general
  return (
    <div className="layout layout--left">
      <Sidebar books={books} selected={null} onSelect={handleBookSelect} />
      <div className="content">
        {isProcessing ? (
           <div className="results"><p className="empty">Procesando highlights...</p></div>
        ) : listData.length === 0 ? (
          <div className="results">
            <p className="empty">Sin resultados</p>
          </div>
        ) : (
          <VirtualizedHighlights
            items={listData}
            onOpenInBook={openInBook}
            showBookContext={true}
            itemRefs={itemRefs}
            pendingScrollId={pendingScrollId}
          />
        )}
      </div>
    </div>
  );
}
