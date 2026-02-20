import React, {
  useMemo,
  useState,
  useRef,
  useEffect,
  useCallback,
  Suspense,
} from "react";
import { useSelector, useDispatch } from "react-redux";
import { Virtuoso } from "react-virtuoso";
import Sidebar from "./sidebar";
const StatsModal = React.lazy(() => import("./statsModal"));
import ExportDropdown from "./exportDropdown";
import SkeletonCard, { SkeletonSidebar, SkeletonBookbar } from "./skeletonCard";
import { updateEntry } from "../reducers/highlightsReducer";
import highlightService from "../services/highlightService";
import "../styles/styles.css";
// Importar Worker (Vite syntax)
import SearchWorker from "../workers/searchWorker?worker";

// Fisher-Yates shuffle O(n) - mucho más rápido que .sort(Math.random())
const fisherYatesShuffle = (arr) => {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// Helper para crear regex (memoizable)
const createHighlightRegex = (query) => {
  if (!query || !query.trim()) return null;

  const qWithoutFilters = query
    .replace(/\bp:\d+(?:-\d+)?\b/gi, "")
    .replace(/\bc:"[^"]+"|\bc:\S+/gi, "")
    .trim();
  const tokens = qWithoutFilters.match(/"([^"]+)"|\S+/g) || [];
  const terms = tokens
    .map((t) =>
      t.startsWith('"') && t.endsWith('"') ? t.slice(1, -1).trim() : t,
    )
    .filter((t) => t.length > 0);

  if (terms.length === 0) return null;

  terms.sort((a, b) => b.length - a.length);

  const escapedTerms = terms.map((t) =>
    t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
  );

  return new RegExp(`(${escapedTerms.join("|")})`, "gi");
};

const highlightMatches = (text, regex) => {
  if (!regex) return text;

  const parts = [];
  let lastIndex = 0;
  let match;

  // Reset lastIndex for the regex if it's reused (though 'match' usually handles new search on new string if we don't depend on global state)
  // For 'g' flag, exec() advances lastIndex of the regex object itself.
  // CRITICAL: Since we share the regex object across cards, we MUST reset lastIndex or clone it.
  // Actually, exec() on a NEW string resets lastIndex usually? No, strictly only if it didn't match.
  // Safer to use String.matchAll or loop with a cloned regex or reset lastIndex = 0 before use.
  // But regex is passed as prop.
  // BEST APPROACH: 'search' or 'matchAll' or reset lastIndex.

  regex.lastIndex = 0; // Reset state for this new search

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }

    const matchText = match[0];
    const startIndex = match.index;
    const endIndex = startIndex + matchText.length;

    const charBefore = startIndex > 0 ? text[startIndex - 1] : null;
    const charAfter = endIndex < text.length ? text[endIndex] : null;

    const isWordChar = (char) => char && /[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ]/.test(char);
    const isExact = !isWordChar(charBefore) && !isWordChar(charAfter);

    parts.push(
      <span
        key={startIndex}
        className={isExact ? "highlight-exact" : "highlight-partial"}
      >
        {matchText}
      </span>,
    );

    lastIndex = endIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts;
};

// Componente de lista personalizado para Virtuoso para mantener el estilo original de PC
const VirtuosoList = React.forwardRef(({ style, children, ...props }, ref) => (
  <div
    ref={ref}
    {...props}
    className="results__inner"
    style={{
      ...style,
      // Virtuoso pasa estilos de posición que debemos mantener
    }}
  >
    {children}
  </div>
));

// Componentes de Navegación Global
const SearchNavigation = ({ summary, currentIndex, onJump }) => {
  if (summary.length <= 1) return null;

  return (
    <div className="search-nav">
      <button
        onClick={() => onJump(currentIndex - 1)}
        disabled={currentIndex <= 0}
        className="search-nav__btn"
        title="Anterior Libro"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="search-nav__icon"
        >
          <path d="m15 18-6-6 6-6" />
        </svg>
      </button>

      <div className="search-nav__info">
        <span className="search-nav__label">Navegación</span>
        <div className="search-nav__text">
          Libro <span className="text-accent">{currentIndex + 1}</span>{" "}
          <span className="search-nav__separator">/</span> {summary.length}
        </div>
      </div>

      <button
        onClick={() => onJump(currentIndex + 1)}
        disabled={currentIndex >= summary.length - 1}
        className="search-nav__btn"
        title="Siguiente Libro"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="search-nav__icon"
        >
          <path d="m9 18 6-6-6-6" />
        </svg>
      </button>
    </div>
  );
};

const ShuffleNavigation = ({ onShuffle }) => {
  return (
    <div onClick={onShuffle} className="shuffle-nav">
      <div className="shuffle-nav__icon-wrapper">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="shuffle-nav__icon"
        >
          <path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.7-1.1 2-1.7 3.3-1.7H22" />
          <path d="m18 2 4 4-4 4" />
          <path d="M2 6h1.9c1.5 0 2.9.9 3.6 2.2" />
          <path d="M22 18h-5.9c-1.3 0-2.6-.7-3.3-1.8l-.5-.8" />
          <path d="m18 14 4 4-4 4" />
        </svg>
      </div>

      <div className="shuffle-nav__content">
        <span className="shuffle-nav__label">Explorar</span>
        <div className="shuffle-nav__text">Randomizar</div>
      </div>
    </div>
  );
};

const MiniMap = ({ summary, currentIndex, onJump }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (summary.length <= 1) return null;

  return (
    <div className="fixed right-8 top-1/2 -translate-y-1/2 z-50 flex flex-col items-end">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-4 rounded-full shadow-lg border transition-all duration-300 ${isOpen ? "bg-accent text-white border-accent" : "bg-white/90 backdrop-blur-md text-gray-700 border-white/20 hover:shadow-xl hover:-translate-y-0.5"}`}
        title="Índice de resultados"
      >
        {isOpen ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 6h16M4 12h16M4 18h10" />
          </svg>
        )}
      </button>

      {isOpen && (
        <div className="mt-4 w-72 max-h-[70vh] overflow-hidden bg-white/95 backdrop-blur-xl rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-white/20 flex flex-col animate-in fade-in slide-in-from-right-8 duration-300">
          <div className="px-6 py-5 border-bottom border-gray-100/50 bg-gray-50/50">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">
              Resultados por Libro
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto py-2 custom-scrollbar">
            {summary.map((item, idx) => (
              <button
                key={item.title}
                onClick={() => {
                  onJump(idx);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-6 py-4 flex justify-between items-start gap-4 transition-all hover:bg-accent/[0.03] relative ${idx === currentIndex ? "bg-accent/[0.06]" : ""}`}
              >
                {idx === currentIndex && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent rounded-r-full" />
                )}
                <div className="flex-1 min-w-0">
                  <div
                    className={`text-sm leading-tight truncate ${idx === currentIndex ? "font-bold text-accent" : "text-gray-700 font-medium"}`}
                  >
                    {item.title}
                  </div>
                </div>
                <div
                  className={`text-[11px] px-2 py-0.5 rounded-md font-bold ${idx === currentIndex ? "bg-accent text-white" : "bg-gray-100 text-gray-500"}`}
                >
                  {item.count}
                </div>
              </button>
            ))}
          </div>
          <div className="p-4 bg-gray-50/50 border-t border-gray-100/50 text-[10px] text-center text-gray-400 font-medium">
            Mostrando {summary.length} libros con coincidencias
          </div>
        </div>
      )}
    </div>
  );
};

// Componente HighlightCard más optimizado
const HighlightCard = React.memo(
  ({
    highlight,
    onOpenInBook,
    onToggleStar,
    showBookContext = true,
    query,
    highlightRegex,
    onChapterClick,
    isTarget,
  }) => {
    const cardRef = useRef(null);

    useEffect(() => {
      if (isTarget && cardRef.current) {
        // Asegurarnos de limpiar cualquier clase previa
        cardRef.current.classList.remove("card--pulse");

        // Forzar un reflow para que la animación se reinicie si ya existía
        void cardRef.current.offsetWidth;

        // Animación de pulso
        cardRef.current.classList.add("card--pulse");
        const timer = setTimeout(() => {
          cardRef.current?.classList.remove("card--pulse");
        }, 2000); // Un poco más de tiempo para asegurar que se vea
        return () => clearTimeout(timer);
      }
    }, [isTarget]);

    return (
      <article
        ref={cardRef}
        className={`card ${highlight.isRandom ? "card--random" : ""}`}
        style={{ marginBottom: "16px" }}
      >
        {highlight.isRandom && <div className="card__diamond" />}
        <header className="card__header">
          <span className="card__book">{highlight.Libro}</span>
          <span className="card__dot">•</span>
          <span className="card__page">Pág. {highlight.Pagina}</span>
          <span className="card__dot">•</span>
          <span
            className="card__page cursor-pointer hover-accent"
            title="Filtrar por este capítulo"
            onClick={() => onChapterClick?.(highlight)}
          >
            Cap: {highlight.Capitulo}
          </span>
          <span className="card__dot">•</span>
          <span className="card__page">{highlight.Fecha}</span>
        </header>

        <p className="card__text">
          {highlightMatches(highlight.Highlight, highlightRegex)}
        </p>

        <footer className="card__footer card__footer--actions">
          <span className="card__author">{highlight.Autor}</span>
          <div className="card__btns">
            <button
              type="button"
              className={`btn-star ${highlight.starred ? "is-starred" : ""}`}
              onClick={() => onToggleStar?.(highlight)}
              title={
                highlight.starred ? "Quitar de favoritos" : "Añadir a favoritos"
              }
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill={highlight.starred ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </button>
            {showBookContext && (
              <button
                type="button"
                className="btn"
                onClick={() => onOpenInBook(highlight)}
              >
                Ver en contexto
              </button>
            )}
          </div>
        </footer>
      </article>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.highlight.id === nextProps.highlight.id &&
      prevProps.highlight.starred === nextProps.highlight.starred &&
      prevProps.showBookContext === nextProps.showBookContext &&
      prevProps.query === nextProps.query && // Keep query check for safety/consistency
      prevProps.highlightRegex === nextProps.highlightRegex && // Check regex ref equality
      prevProps.isTarget === nextProps.isTarget
    );
  },
);

export default function Highlights() {
  const highlights = useSelector((s) => s.highlights);
  const filter = useSelector((s) => s.filter);
  const dispatch = useDispatch();

  // Estados
  const [selectedBook, setSelectedBook] = useState(null);
  const [localFilter, setLocalFilter] = useState("");
  const [scrollId, setScrollId] = useState(null);
  const [shuffleSeed, setShuffleSeed] = useState(0);
  const [isShuffled, setIsShuffled] = useState(false);

  // ... (keeping existing states)

  const handleToggleStar = useCallback(
    async (item) => {
      const newStarred = !item.starred;
      try {
        // Actualización optimista
        dispatch(
          updateEntry({
            docId: item.docId,
            entryId: item.entryId,
            updates: { starred: newStarred },
          }),
        );

        await highlightService.toggleStarred(
          item.docId,
          item.entryId,
          newStarred,
        );
      } catch (error) {
        console.error("Error toggling star:", error);
        // Revertir en caso de error
        dispatch(
          updateEntry({
            docId: item.docId,
            entryId: item.entryId,
            updates: { starred: item.starred },
          }),
        );
      }
    },
    [dispatch],
  );

  // ... rest of the component

  // Estado de datos (provenientes del worker)
  const [books, setBooks] = useState([]);
  const [listData, setListData] = useState([]);
  const [allHighlights, setAllHighlights] = useState([]); // Todos los highlights aplanados
  const [bookItems, setBookItems] = useState([]); // Items filtrados del libro seleccionado
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentBookIndex, setCurrentBookIndex] = useState(0);
  const [isStatsOpen, setIsStatsOpen] = useState(false);

  // Refs
  const virtuosoRef = useRef(null);

  // Random highlights logic - Fisher-Yates O(n) parcial (solo 3 swaps)
  const randomHighlights = useMemo(() => {
    if (allHighlights.length === 0) return [];
    const arr = [...allHighlights];
    const count = Math.min(3, arr.length);
    for (let i = 0; i < count; i++) {
      const j = i + Math.floor(Math.random() * (arr.length - i));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr.slice(0, count).map((h) => ({
      ...h,
      isRandom: true,
      originalId: h.id,
      id: `random-${h.id}-${shuffleSeed}`,
    }));
  }, [allHighlights, shuffleSeed]);

  // Shuffle state guardado para evitar re-shuffle en cada render
  const shuffledItemsRef = useRef([]);

  // Combine listData with random highlights if no filter is active
  const displayItems = useMemo(() => {
    if (selectedBook) return bookItems;

    let items = listData;

    // Si estamos en modo randomizado y no hay filtro, usamos el shuffle cacheado
    if (!filter && !selectedBook && isShuffled && allHighlights.length > 0) {
      items = shuffledItemsRef.current;
    }

    if (!filter && !selectedBook && items.length > 0) {
      return [...randomHighlights, ...items];
    }
    return items;
  }, [
    filter,
    selectedBook,
    listData,
    randomHighlights,
    isShuffled,
    allHighlights,
    bookItems,
  ]);

  // Resumen de búsqueda para navegación por bloques
  const searchSummary = useMemo(() => {
    if (!filter || selectedBook || displayItems.length === 0) return [];

    const summary = [];
    const seenBooks = new Map();

    displayItems.forEach((item, index) => {
      if (item.isRandom) return;

      if (!seenBooks.has(item.Libro)) {
        seenBooks.set(item.Libro, summary.length);
        summary.push({
          title: item.Libro,
          firstIndex: index,
          count: 1,
        });
      } else {
        const summaryIndex = seenBooks.get(item.Libro);
        summary[summaryIndex].count++;
      }
    });

    return summary;
  }, [displayItems, filter, selectedBook]);

  // Reset currentBookIndex when search changes
  useEffect(() => {
    setCurrentBookIndex(0);
  }, [filter]);

  const jumpToBook = useCallback(
    (index) => {
      if (index >= 0 && index < searchSummary.length && virtuosoRef.current) {
        setCurrentBookIndex(index);

        // Scroll smoothly to the first item of the selected book
        virtuosoRef.current.scrollToIndex({
          index: searchSummary[index].firstIndex,
          align: "start",
          behavior: "smooth",
        });
      }
    },
    [searchSummary],
  );

  // Ref para evitar recrear handleRangeChanged en cada cambio de currentBookIndex
  const currentBookIndexRef = useRef(currentBookIndex);
  currentBookIndexRef.current = currentBookIndex;

  const handleRangeChanged = useCallback(
    (range) => {
      if (searchSummary.length === 0) return;

      const startIndex = range.startIndex;

      // Encontrar el libro actualmente visible
      let foundIndex = 0;
      for (let i = searchSummary.length - 1; i >= 0; i--) {
        if (searchSummary[i].firstIndex <= startIndex) {
          foundIndex = i;
          break;
        }
      }

      if (foundIndex !== currentBookIndexRef.current) {
        setCurrentBookIndex(foundIndex);
      }
    },
    [searchSummary],
  );

  // Worker Ref
  const workerRef = useRef(null);
  const lastProcessedRef = useRef(null);

  // Inicializar Worker + precargar si ya hay datos en Redux (del cache)
  useEffect(() => {
    workerRef.current = new SearchWorker();

    workerRef.current.onmessage = (e) => {
      const { type, payload, id } = e.data;

      switch (type) {
        case "DATA_PROCESSED":
          setBooks(payload.books);
          setIsProcessing(false);
          // Trigger initial search to populate listData
          workerRef.current.postMessage({
            type: "SEARCH_MAIN",
            payload: { query: "" },
            id: "init",
          });
          break;
        case "SEARCH_RESULTS":
          if (id === "main") {
            setListData(payload);
          } else if (id === "book") {
            setBookItems(payload);
          } else if (id === "init") {
            setListData(payload);
            setAllHighlights(payload);
          }
          break;
        case "ERROR":
          console.error("Worker Error:", payload);
          setIsProcessing(false);
          break;
      }
    };

    // Precargar datos si ya están en Redux (vienen del cache IndexedDB)
    if (highlights && highlights.length > 0) {
      setIsProcessing(true);
      workerRef.current.postMessage({
        type: "PROCESS_DATA",
        payload: highlights,
        id: "process",
      });
      lastProcessedRef.current = highlights;
    }

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  // Enviar datos al worker cuando cambien
  useEffect(() => {
    if (highlights && highlights.length > 0 && workerRef.current) {
      // Evitar re-procesar si los datos son los mismos (referencia o longitud)
      if (lastProcessedRef.current === highlights) return;

      setIsProcessing(true);
      workerRef.current.postMessage({
        type: "PROCESS_DATA",
        payload: highlights,
        id: "process",
      });
      lastProcessedRef.current = highlights;
    }
  }, [highlights]);

  // Buscar en vista principal
  useEffect(() => {
    if (workerRef.current && !selectedBook) {
      workerRef.current.postMessage({
        type: "SEARCH_MAIN",
        payload: { query: filter },
        id: "main",
      });
    }
  }, [filter, selectedBook]); // Re-run when filter changes or we return to main view

  // Buscar en libro seleccionado
  useEffect(() => {
    if (workerRef.current && selectedBook) {
      workerRef.current.postMessage({
        type: "SEARCH_BOOK",
        payload: { bookTitle: selectedBook, query: localFilter },
        id: "book",
      });
    }
  }, [selectedBook, localFilter]);

  // Manejar Scroll Automático
  useEffect(() => {
    if (scrollId && virtuosoRef.current) {
      const items = selectedBook ? bookItems : displayItems;
      const index = items.findIndex(
        (item) => item.id === scrollId || item.originalId === scrollId,
      );

      if (index !== -1) {
        // Pequeño delay para asegurar que Virtuoso esté listo y los items cargados
        const timer = setTimeout(() => {
          virtuosoRef.current?.scrollToIndex({
            index,
            align: "center",
            behavior: "smooth",
          });

          // Mantener el scrollId activo un poco más para que la tarjeta detecte isTarget
          const resetTimer = setTimeout(() => setScrollId(null), 3000);
          return () => clearTimeout(resetTimer);
        }, 150);
        return () => clearTimeout(timer);
      }
    }
  }, [scrollId, selectedBook, bookItems, displayItems]);

  // Callbacks estables
  const openInBook = useCallback((item) => {
    setSelectedBook(item.Libro);
    setLocalFilter(""); // Limpiar filtro local
    setScrollId(item.originalId || item.id);
  }, []);

  // Callbacks para sidebar
  const handleBookSelect = useCallback((title) => {
    setSelectedBook(title);
    setLocalFilter("");
    setScrollId(null);
  }, []);

  const handleCloseBook = useCallback(() => {
    setSelectedBook(null);
    setLocalFilter("");
    setScrollId(null);
  }, []);

  const handleChapterClick = useCallback(
    (item) => {
      if (!item || !item.Capitulo) return;
      const chapterFilter = `c:"${item.Capitulo}"`;

      if (selectedBook === item.Libro) {
        setLocalFilter(chapterFilter);
      } else {
        // Ir al libro y aplicar el filtro de capítulo
        setSelectedBook(item.Libro);
        setLocalFilter(chapterFilter);
        setScrollId(null);
      }
    },
    [selectedBook],
  );

  const handleOpenStats = useCallback(() => setIsStatsOpen(true), []);
  const handleCloseStats = useCallback(() => setIsStatsOpen(false), []);

  const handleShuffle = useCallback(() => {
    // Pre-computar shuffle con Fisher-Yates y guardar en ref
    shuffledItemsRef.current = fisherYatesShuffle(allHighlights);
    setShuffleSeed((s) => s + 1);
    setIsShuffled(true);
    // Scroll smoothly to top
    virtuosoRef.current?.scrollToIndex({
      index: 0,
      align: "start",
      behavior: "smooth",
    });
  }, [allHighlights]);

  const handleExportBook = useCallback(
    async (format) => {
      if (!selectedBook || bookItems.length === 0) return;

      // Lazy import del servicio de exportación
      const exportService = await import("../services/exportService");

      switch (format) {
        case "pdf":
          await exportService.exportToPdf(selectedBook, bookItems);
          break;
        case "word":
          await exportService.exportToWord(selectedBook, bookItems);
          break;
        case "md":
          exportService.exportToMarkdown(selectedBook, bookItems);
          break;
        case "json":
          exportService.exportToJson(selectedBook, bookItems);
          break;
      }
    },
    [selectedBook, bookItems],
  );

  const handleExportAll = useCallback(
    async (format) => {
      if (allHighlights.length === 0) return;

      // Lazy import del servicio de exportación
      const exportService = await import("../services/exportService");

      const grouped = allHighlights.reduce((acc, h) => {
        if (!acc[h.Libro]) acc[h.Libro] = [];
        acc[h.Libro].push(h);
        return acc;
      }, {});

      switch (format) {
        case "pdf":
          await exportService.exportAllToPdf(grouped);
          break;
        case "word":
          await exportService.exportAllToWord(grouped);
          break;
        case "md":
          exportService.exportAllToMarkdown(grouped);
          break;
        case "json":
          exportService.exportAllToJson(grouped);
          break;
      }
    },
    [allHighlights],
  );

  // Memoize regex for current filter
  const activeQuery = selectedBook ? localFilter : filter;
  const highlightRegex = useMemo(
    () => createHighlightRegex(activeQuery),
    [activeQuery],
  );

  // Configuración de Virtuoso
  const renderItem = useCallback(
    (index, item) => {
      return (
        <HighlightCard
          highlight={item}
          onOpenInBook={openInBook}
          onToggleStar={handleToggleStar}
          showBookContext={!selectedBook}
          query={activeQuery}
          highlightRegex={highlightRegex}
          onChapterClick={handleChapterClick}
          isTarget={item.id === scrollId || item.originalId === scrollId}
        />
      );
    },
    [
      openInBook,
      handleToggleStar,
      selectedBook,
      activeQuery,
      highlightRegex,
      handleChapterClick,
      scrollId,
    ],
  );

  // Render condicional optimizado
  return (
    <div className="layout layout--left">
      <Sidebar
        books={books}
        selected={selectedBook}
        onSelect={handleBookSelect}
        onOpenStats={handleOpenStats}
        onExportAll={handleExportAll}
        isLoading={isProcessing && books.length === 0}
      />
      <div className="content relative">
        {isStatsOpen && (
          <Suspense fallback={null}>
            <StatsModal
              isOpen={isStatsOpen}
              onClose={handleCloseStats}
              highlights={allHighlights}
              books={books}
            />
          </Suspense>
        )}

        {selectedBook ? (
          <>
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
              <ExportDropdown onExport={handleExportBook} />
            </div>

            {isProcessing && bookItems.length === 0 ? (
              <div className="results">
                <div className="skeleton-container">
                  <SkeletonCard count={6} />
                </div>
              </div>
            ) : bookItems.length === 0 ? (
              <div className="results">
                <p className="empty">
                  {localFilter?.trim()
                    ? `Sin resultados para "${localFilter}" en este libro`
                    : "Sin highlights en este libro"}
                </p>
              </div>
            ) : (
              <div className="results">
                <Virtuoso
                  ref={virtuosoRef}
                  style={{ height: "100%", width: "100%" }}
                  data={bookItems}
                  itemContent={renderItem}
                  components={{ List: VirtuosoList }}
                  computeItemKey={(index, item) => item.id}
                  overscan={200}
                />
              </div>
            )}
          </>
        ) : (
          <>
            <SearchNavigation
              summary={searchSummary}
              currentIndex={currentBookIndex}
              onJump={jumpToBook}
            />
            <MiniMap
              summary={searchSummary}
              currentIndex={currentBookIndex}
              onJump={jumpToBook}
            />

            {!filter && allHighlights.length > 0 && (
              <ShuffleNavigation onShuffle={handleShuffle} />
            )}

            {isProcessing && displayItems.length === 0 ? (
              <div className="results">
                <div className="skeleton-container">
                  <SkeletonCard count={8} />
                </div>
              </div>
            ) : displayItems.length === 0 ? (
              <div className="results">
                <p className="empty">Sin resultados</p>
              </div>
            ) : (
              <div className="results">
                <Virtuoso
                  ref={virtuosoRef}
                  style={{ height: "100%", width: "100%" }}
                  data={displayItems}
                  itemContent={renderItem}
                  components={{ List: VirtuosoList }}
                  computeItemKey={(index, item) => item.id}
                  overscan={200}
                  rangeChanged={handleRangeChanged}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
