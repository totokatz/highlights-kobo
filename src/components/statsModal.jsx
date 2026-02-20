import React, { useMemo } from "react";

const StatsModal = ({ isOpen, onClose, highlights, books }) => {
  if (!isOpen) return null;

  const stats = useMemo(() => {
    if (!highlights || highlights.length === 0) return null;

    // 1. Total Highlights
    const totalHighlights = highlights.length;

    // 2. Total Books
    const totalBooks = books.length;

    // 3. Top Books
    const topBooks = [...books].sort((a, b) => b.count - a.count).slice(0, 5);

    // 4. Highlights by Month
    const byMonth = highlights.reduce((acc, h) => {
      if (!h.Timestamp) return acc;
      const date = new Date(
        h.Timestamp * (String(h.Timestamp).length >= 12 ? 1 : 1000),
      );
      const monthYear = date.toLocaleString("es-ES", {
        month: "short",
        year: "numeric",
      });
      acc[monthYear] = (acc[monthYear] || 0) + 1;
      return acc;
    }, {});

    // Last 6 months with data
    const lastMonths = Object.entries(byMonth).reverse().slice(0, 6);

    // 5. Avg Highlight Length
    const totalChars = highlights.reduce(
      (sum, h) => sum + (h.Highlight?.length || 0),
      0,
    );
    const avgLength = Math.round(totalChars / totalHighlights);

    return {
      totalHighlights,
      totalBooks,
      topBooks,
      lastMonths,
      avgLength,
    };
  }, [highlights, books]);

  const renderContent = () => {
    if (!stats) {
      return (
        <div className="flex-1 flex items-center justify-center p-20 text-center">
          <div>
            <div className="text-gray-300 mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="64"
                height="64"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mx-auto"
              >
                <path d="M3 3v18h18" />
                <path d="m19 9-5 5-4-4-3 3" />
              </svg>
            </div>
            <p className="text-gray-500 font-medium">
              Aún no hay suficientes datos para generar estadísticas.
            </p>
            <p className="text-xs text-gray-400 mt-2">
              Importa algunos highlights primero.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        {/* Main Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div
            className="p-6 rounded-3xl border"
            style={{
              background: "var(--stats-bg-1)",
              borderColor: "var(--accent)",
              borderOpacity: 0.2,
            }}
          >
            <div className="text-accent text-3xl font-black mb-1">
              {stats.totalHighlights}
            </div>
            <div
              className="text-xs uppercase tracking-wider font-bold"
              style={{ color: "var(--muted)" }}
            >
              Highlights
            </div>
          </div>
          <div
            className="p-6 rounded-3xl border"
            style={{
              background: "var(--stats-bg-2)",
              borderColor: "#a855f7",
              borderOpacity: 0.2,
            }}
          >
            <div className="text-purple-600 text-3xl font-black mb-1">
              {stats.totalBooks}
            </div>
            <div
              className="text-xs uppercase tracking-wider font-bold"
              style={{ color: "#a855f7", opacity: 0.7 }}
            >
              Libros
            </div>
          </div>
          <div
            className="p-6 rounded-3xl border"
            style={{
              background: "var(--stats-bg-3)",
              borderColor: "#f97316",
              borderOpacity: 0.2,
            }}
          >
            <div className="text-orange-600 text-3xl font-black mb-1">
              {stats.avgLength}
            </div>
            <div
              className="text-xs uppercase tracking-wider font-bold"
              style={{ color: "#f97316", opacity: 0.7 }}
            >
              Caract. Avg
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* Top Books */}
          <div>
            <h3
              className="text-xs font-black uppercase tracking-widest mb-4"
              style={{ color: "var(--muted)" }}
            >
              Libros más destacados
            </h3>
            <div className="space-y-3">
              {stats.topBooks.map((book, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                    style={{
                      background: "var(--hover-bg)",
                      color: "var(--muted)",
                    }}
                  >
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div
                      className="text-sm font-bold truncate"
                      style={{ color: "var(--text)" }}
                    >
                      {book.title}
                    </div>
                    <div
                      className="text-[10px] font-bold"
                      style={{ color: "var(--muted)" }}
                    >
                      {book.count} highlights
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recency */}
          <div>
            <h3
              className="text-xs font-black uppercase tracking-widest mb-4"
              style={{ color: "var(--muted)" }}
            >
              Actividad reciente
            </h3>
            <div className="space-y-3">
              {stats.lastMonths.length > 0 ? (
                stats.lastMonths.map(([month, count], idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div
                      className="text-sm font-bold w-20"
                      style={{ color: "var(--text)" }}
                    >
                      {month}
                    </div>
                    <div
                      className="flex-1 h-2 rounded-full overflow-hidden"
                      style={{ background: "var(--hover-bg)" }}
                    >
                      <div
                        className="h-full bg-accent rounded-full"
                        style={{
                          width: `${Math.min(100, (count / (stats.totalHighlights / 5)) * 100)}%`,
                        }}
                      />
                    </div>
                    <div className="text-xs font-black text-accent">
                      {count}
                    </div>
                  </div>
                ))
              ) : (
                <div
                  className="text-sm italic"
                  style={{ color: "var(--muted)" }}
                >
                  No hay datos de fechas disponibles
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      style={{ animation: "none" }}
    >
      <div className="bg-white w-full max-w-2xl rounded-[32px] shadow-[0_32px_64px_rgba(0,0,0,0.2)] border border-white/20 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-black text-gray-800 tracking-tight">
              Tus Estadísticas
            </h2>
            <p className="text-sm text-gray-500 font-medium">
              Un resumen de tus lecturas
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400"
          >
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
          </button>
        </div>

        {/* Content */}
        {renderContent()}

        {/* Footer */}
        <div className="px-8 py-6 bg-gray-50/50 border-t border-gray-100 flex justify-center">
          <p className="text-[11px] text-gray-400 font-medium">
            Datos generados automáticamente desde tu base de datos local
          </p>
        </div>
      </div>
    </div>
  );
};

export default StatsModal;
