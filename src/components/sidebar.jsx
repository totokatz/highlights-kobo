import React from "react";
import "../styles/styles.css";

export default function Sidebar({ books = [], selected, onSelect }) {
  return (
    <aside className="sidebar">
      <div className="sidebar__header">Libros</div>
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
    </aside>
  );
}
