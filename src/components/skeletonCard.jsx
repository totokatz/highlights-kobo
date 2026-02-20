import React from "react";

/**
 * Componente SkeletonCard - Muestra un estado de carga animado tipo skeleton
 * para mejorar la percepción de velocidad de la aplicación.
 *
 * @param {Object} props
 * @param {number} props.count - Número de skeletons a renderizar (default: 1)
 * @param {string} props.className - Clases CSS adicionales
 */
const SkeletonCard = ({ count = 1, className = "" }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className={`card skeleton-card ${className}`}
          aria-hidden="true"
        >
          {/* Header simulado */}
          <div className="skeleton-card__header">
            <div className="skeleton skeleton-text skeleton-text--short" />
          </div>

          {/* Contenido simulado */}
          <div className="skeleton-card__content">
            <div className="skeleton skeleton-text" />
            <div className="skeleton skeleton-text" />
            <div className="skeleton skeleton-text skeleton-text--medium" />
          </div>

          {/* Footer simulado */}
          <div className="skeleton-card__footer">
            <div className="skeleton skeleton-text skeleton-text--short" />
            <div className="skeleton skeleton-text skeleton-text--tiny" />
          </div>
        </div>
      ))}
    </>
  );
};

/**
 * Componente SkeletonSidebar - Muestra skeletons para el estado de carga del sidebar
 *
 * @param {Object} props
 * @param {number} props.count - Número de items a renderizar (default: 6)
 */
export const SkeletonSidebar = ({ count = 6 }) => {
  return (
    <div className="skeleton-sidebar" aria-hidden="true">
      {/* Header simulado */}
      <div className="skeleton-sidebar__header">
        <div className="skeleton skeleton-text skeleton-text--medium" />
        <div className="skeleton skeleton-text skeleton-text--short" />
      </div>

      {/* Items de lista simulados */}
      <div className="skeleton-sidebar__list">
        {Array.from({ length: count }).map((_, index) => (
          <div key={index} className="skeleton-sidebar__item">
            <div className="skeleton skeleton-circle skeleton-circle--small" />
            <div className="skeleton skeleton-text skeleton-text--long" />
            <div className="skeleton skeleton-badge" />
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Componente SkeletonBookbar - Muestra skeleton para el header del libro seleccionado
 */
export const SkeletonBookbar = () => {
  return (
    <div className="skeleton-bookbar" aria-hidden="true">
      <div className="skeleton skeleton-input" />
      <div className="skeleton-bookbar__info">
        <div className="skeleton skeleton-text skeleton-text--medium" />
        <div className="skeleton skeleton-text skeleton-text--short" />
      </div>
      <div className="skeleton skeleton-button" />
    </div>
  );
};

export default SkeletonCard;
