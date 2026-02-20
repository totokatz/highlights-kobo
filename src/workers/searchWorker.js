/* ===== Configuración optimizada ===== */
// Cache global para normalización
const normalizeCache = new Map();
const NORMALIZE_CACHE_SIZE = 5000;

/* ===== Utils ===== */
const normalize = (s) => {
  if (!s) return "";
  const str = s.toString().trim();

  if (normalizeCache.has(str)) return normalizeCache.get(str);

  const result = str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (normalizeCache.size >= NORMALIZE_CACHE_SIZE) {
    const firstKey = normalizeCache.keys().next().value;
    normalizeCache.delete(firstKey);
  }

  normalizeCache.set(str, result);
  return result;
};

// Simple hash function for stable IDs
const hashString = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
};

const slug = (s) =>
  normalize(s)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

const dateCache = new Map();
const DATE_CACHE_SIZE = 1000;

const formatKoTs = (ts) => {
  const key = `${ts}`;
  if (dateCache.has(key)) return dateCache.get(key);

  const n = typeof ts === "string" ? Number(ts) : ts;
  if (!Number.isFinite(n)) return "Fecha inválida";

  const isMillis = Math.abs(n) >= 1e12;
  const date = new Date(isMillis ? n : n * 1000);

  if (isNaN(date.getTime())) return "Fecha inválida";

  const fecha = new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);

  if (dateCache.size >= DATE_CACHE_SIZE) {
    const firstKey = dateCache.keys().next().value;
    dateCache.delete(firstKey);
  }

  dateCache.set(key, fecha);
  return fecha;
};

const parsePageFilter = (q) => {
  const m = q.match(/\bp:(\d+)(?:-(\d+))?\b/i);
  if (!m) return null;
  const from = Number(m[1]);
  const to = m[2] ? Number(m[2]) : from;
  return { from, to };
};

const parseChapterFilter = (q) => {
  const m = q.match(/\bc:"([^"]+)"|\bc:(\S+)/i);
  if (!m) return null;
  return m[1] || m[2];
};

const parseQuery = (raw) => {
  const q = raw.trim();
  if (!q)
    return {
      phrases: [],
      terms: [],
      page: null,
      chapter: null,
      starred: false,
    };

  const page = parsePageFilter(q);
  const chapter = parseChapterFilter(q);
  const starred = /\bis:starred\b/i.test(q);

  let qWithoutFilters = q
    .replace(/\bp:\d+(?:-\d+)?\b/gi, "")
    .replace(/\bc:"[^"]+"|\bc:\S+/gi, "")
    .replace(/\bis:starred\b/gi, "")
    .trim();

  const tokens = qWithoutFilters.match(/"([^"]+)"|\S+/g) || [];
  const phrases = [];
  const terms = [];

  for (const t of tokens) {
    if (t.startsWith('"') && t.endsWith('"')) {
      const inside = t.slice(1, -1).trim();
      if (inside) phrases.push(normalize(inside));
    } else {
      const normalized = normalize(t);
      if (normalized) terms.push(normalized);
    }
  }

  return { phrases, terms, page, chapter, starred };
};

/* ===== Estado del Worker ===== */
let allItems = [];
let booksList = [];

// Cache por libro para búsquedas rápidas dentro de libros
const bookItemsCache = new Map();

/* ===== Lógica Principal ===== */
const processData = (highlights) => {
  allItems = [];
  const bookCounts = new Map();
  const globalSeenHighlights = new Set();

  normalizeCache.clear();
  dateCache.clear();
  bookItemsCache.clear();

  if (!highlights?.length) return { books: [], count: 0 };

  // Pre-calculate common values to avoid repeated work
  for (let hi = 0; hi < highlights.length; hi++) {
    const h = highlights[hi];
    if (!h) continue;

    const entries = h.entries ?? [];
    if (entries.length === 0) continue;

    const autor = h.author ?? h.Autor ?? "Desconocido";
    const libro = h.title ?? h.Libro ?? "Sin título";
    const normalizedLibro = normalize(libro);

    const currentBookItems = [];

    for (let ei = 0; ei < entries.length; ei++) {
      const e = entries[ei];
      if (!e) continue;

      const highlight = e.text ?? "";
      if (!highlight.trim()) continue;

      const highlightNormalizado = normalize(highlight);
      const pagina = Number(e.page ?? 0);

      // Unique identifier for de-duplication
      const contentFingerprint = `${normalizedLibro}|${pagina}|${highlightNormalizado}`;

      if (globalSeenHighlights.has(contentFingerprint)) {
        continue;
      }
      globalSeenHighlights.add(contentFingerprint);

      const capitulo = e.chapter ?? "";
      const fecha = formatKoTs(e.time ?? 0);

      const item = {
        id:
          e._id ?? e.id ?? `${slug(libro)}-${pagina}-${hashString(highlight)}`,
        entryId: e._id ?? e.id,
        docId: h.id,
        starred: !!e.starred,
        Autor: autor,
        Libro: libro,
        Capitulo: capitulo,
        Highlight: highlight,
        Pagina: pagina,
        Fecha: fecha,
        Timestamp: e.time ?? 0,
        searchText: `${normalizedLibro} ${highlightNormalizado}`,
        normTitle: normalizedLibro,
        normHighlight: highlightNormalizado,
      };

      allItems.push(item);
      currentBookItems.push(item);
    }

    if (currentBookItems.length > 0) {
      bookCounts.set(
        libro,
        (bookCounts.get(libro) ?? 0) + currentBookItems.length,
      );

      if (!bookItemsCache.has(libro)) {
        bookItemsCache.set(libro, []);
      }
      const existingItems = bookItemsCache.get(libro);
      for (let i = 0; i < currentBookItems.length; i++) {
        existingItems.push(currentBookItems[i]);
      }
    }
  }

  // Sort book items by page
  for (const items of bookItemsCache.values()) {
    items.sort((a, b) => (a.Pagina ?? 0) - (b.Pagina ?? 0));
  }

  booksList = Array.from(bookCounts, ([title, count]) => ({
    title,
    count,
  }))
    .filter((b) => b.count >= 10)
    .sort((a, b) =>
      a.title.localeCompare(b.title, "es", { sensitivity: "base" }),
    );

  return { books: booksList, count: allItems.length };
};

const escapeRegExp = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const search = (data, query) => {
  const raw = (query ?? "").trim();
  if (!raw) return data;

  const {
    phrases,
    terms,
    page,
    chapter,
    starred: starredFilter,
  } = parseQuery(raw);

  // Prepare normalized query for scoring
  let qWithoutFilters = raw
    .replace(/\bp:\d+(?:-\d+)?\b/gi, "")
    .replace(/\bc:"[^"]+"|\bc:\S+/gi, "")
    .replace(/\bis:starred\b/gi, "")
    .trim();
  const normalizedQuery = normalize(qWithoutFilters);
  const wordRegex = normalizedQuery
    ? new RegExp(`\\b${escapeRegExp(normalizedQuery)}\\b`, "i")
    : null;

  let base = data;

  if (starredFilter) {
    base = base.filter((x) => x.starred);
  }

  if (page) {
    base = base.filter((x) => x.Pagina >= page.from && x.Pagina <= page.to);
  }

  if (chapter) {
    const normalizedChapter = normalize(chapter);
    base = base.filter((x) =>
      normalize(x.Capitulo).includes(normalizedChapter),
    );
  }

  if (!phrases.length && !terms.length) {
    return base;
  }

  // Filter Logic (Strict)
  base = base.filter((item) => {
    // 1. Check Phrases
    if (phrases.length > 0) {
      const allPhrasesMatch = phrases.every((ph) =>
        item.searchText.includes(ph),
      );
      if (!allPhrasesMatch) return false;
    }

    // 2. Check Terms (All must match)
    if (terms.length > 0) {
      const allTermsMatch = terms.every((t) => item.searchText.includes(t));
      if (!allTermsMatch) return false;
    }

    return true;
  });

  // Scoring & Sorting
  const scored = base.map((item) => {
    let score = 0;
    // Use pre-calculated normalized values if available, else normalize
    const normHighlight = item.normHighlight || normalize(item.Highlight);
    const normTitle = item.normTitle || normalize(item.Libro);

    // Priority 1: Exact Match (Score 1000)
    if (normHighlight === normalizedQuery || normTitle === normalizedQuery) {
      score = 1000;
    }
    // Priority 2: Starts With (Score 500)
    else if (
      normHighlight.startsWith(normalizedQuery) ||
      normTitle.startsWith(normalizedQuery)
    ) {
      score = 500;
    }
    // Priority 3: Word Match (Score 100)
    else if (
      wordRegex &&
      (wordRegex.test(normHighlight) || wordRegex.test(normTitle))
    ) {
      score = 100;
    }
    // Priority 4: Partial Match (Score 10)
    else if (
      normHighlight.includes(normalizedQuery) ||
      normTitle.includes(normalizedQuery)
    ) {
      score = 10;
    }
    // Fallback: Terms matched but full query didn't match as a phrase (Score 1)
    else {
      score = 1;
    }

    return { item, score };
  });

  // Sort descending by score
  scored.sort((a, b) => b.score - a.score);

  return scored.map((x) => x.item);
};

/* ===== Message Handler ===== */
self.onmessage = (e) => {
  const { type, payload, id } = e.data;

  try {
    switch (type) {
      case "PROCESS_DATA": {
        const result = processData(payload);
        self.postMessage({ type: "DATA_PROCESSED", payload: result, id });
        break;
      }
      case "SEARCH_MAIN": {
        const { query } = payload;
        // Fuse param removed
        const results = search(allItems, query);
        self.postMessage({ type: "SEARCH_RESULTS", payload: results, id });
        break;
      }
      case "INIT_FUSE": {
        // Legacy support - no op
        break;
      }
      case "SEARCH_BOOK": {
        const { bookTitle, query } = payload;
        const bookItems = bookItemsCache.get(bookTitle) || [];
        // Fuse logic removed
        const results = search(bookItems, query);
        self.postMessage({ type: "SEARCH_RESULTS", payload: results, id });
        break;
      }
    }
  } catch (err) {
    console.error("Worker Error:", err);
    self.postMessage({ type: "ERROR", payload: err.message, id });
  }
};
