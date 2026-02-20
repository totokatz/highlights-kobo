import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { changeFilter } from "../reducers/filterReducer";
import "../styles/styles.css";
import Filter from "./filter";
import Importar from "./importarButton";
import ExportDropdown from "./exportDropdown";
import ThemeToggle from "./ThemeToggle";
import { SkeletonSidebar } from "./skeletonCard";

export default React.memo(function Sidebar({
  books = [],
  selected,
  onSelect,
  onOpenStats,
  onExportAll,
  isLoading = false,
}) {
  const dispatch = useDispatch();
  const filter = useSelector((s) => s.filter);
  const highlights = useSelector((s) => s.highlights);

  const totalFavorites = React.useMemo(() => {
    return highlights.reduce(
      (acc, doc) => acc + doc.entries.filter((e) => e.starred).length,
      0,
    );
  }, [highlights]);

  const isFavoriteActive = filter?.includes("is:starred");

  const toggleFavorite = () => {
    onSelect(null); // Deseleccionar libro si se activan favoritos
    if (isFavoriteActive) {
      dispatch(changeFilter(filter.replace("is:starred", "").trim()));
    } else {
      dispatch(changeFilter(`${filter} is:starred`.trim()));
    }
  };

  return (
    <aside className="sidebar">
      <div
        className="sidebar__header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span>Toto Highlights</span>
        <ThemeToggle />
      </div>

      <div className="sidebar__section">
        <div className="sidebar__subheader">Buscar</div>
        <Filter />
      </div>

      <div className="sidebar__section">
        <div className="sidebar__subheader">Mi Colección</div>
        <ul className="sidebar__list">
          <li>
            <button
              type="button"
              className={`sidebar__item ${isFavoriteActive ? "is-active" : ""}`}
              onClick={toggleFavorite}
            >
              <div className="sidebar__itemMain">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill={isFavoriteActive ? "currentColor" : "none"}
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="sidebar__itemIcon"
                  style={{ color: isFavoriteActive ? "#f1c40f" : "inherit" }}
                >
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                <span className="sidebar__itemTitle">Mis Favoritos</span>
              </div>
              {totalFavorites > 0 && (
                <span className="sidebar__count">{totalFavorites}</span>
              )}
            </button>
          </li>
        </ul>
      </div>

      <div className="sidebar__section mb-4">
        <div className="sidebar__subheader">Acciones</div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "8px",
          }}
        >
          <button
            onClick={onOpenStats}
            className="btn"
            style={{
              fontSize: "0.75rem",
              padding: "6px 0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "4px",
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 3v18h18" />
              <path d="m19 9-5 5-4-4-3 3" />
            </svg>
            Stats
          </button>
          <ExportDropdown
            onExport={onExportAll}
            title="Exportar"
            style={{ fontSize: "0.75rem", padding: "6px 0" }}
          />
        </div>
      </div>

      <div
        className="sidebar__section"
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
        }}
      >
        <div className="sidebar__subheader">Tus Libros</div>
        {isLoading && books.length === 0 ? (
          <SkeletonSidebar count={6} />
        ) : (
          <ul className="sidebar__list">
            {books.map((b) => (
              <li key={b.title}>
                <button
                  type="button"
                  className={`sidebar__item ${
                    selected === b.title ? "is-active" : ""
                  }`}
                  onClick={() => onSelect(b.title)}
                  title={`${b.title} (${b.count})`}
                >
                  <span className="sidebar__itemTitle">
                    {b.title || "Sin título"}
                  </span>
                  <span className="sidebar__count">{b.count}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="sidebar__footer">
        <Importar />
      </div>
    </aside>
  );
});
