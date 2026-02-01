import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { changeFilter } from "../reducers/filterReducer";

export default function Filter() {
  const dispatch = useDispatch();
  const value = useSelector((s) => s.filter);
  const [localValue, setLocalValue] = useState(value);

  // Sync local state with redux state
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Debounce dispatch
  useEffect(() => {
    const handler = setTimeout(() => {
      if (localValue !== value) {
        dispatch(changeFilter(localValue));
      }
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [localValue, value, dispatch]);

  const onChange = (e) => setLocalValue(e.target.value);
  const onClear = () => {
    setLocalValue("");
    dispatch(changeFilter(""));
  };

  return (
    <div className="search">
      <div className="search__box">
        <svg
          className="search__icon"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M10 4a6 6 0 1 1 0 12 6 6 0 0 1 0-12m11.3 15.9-4.2-4.2a8 8 0 1 0-1.4 1.4l4.2 4.2a1 1 0 0 0 1.4-1.4Z" />
        </svg>

        {localValue && (
          <button
            type="button"
            className="search__clear"
            aria-label="Limpiar búsqueda"
            onClick={onClear}
          >
            ×
          </button>
        )}

        <input
          type="text"
          className="search__input"
          value={localValue}
          onChange={onChange}
          placeholder="Buscar en tus highlights…"
          spellCheck={false}
        />
      </div>
    </div>
  );
}
