import React, { useState, useRef, useEffect } from "react";

const ExportDropdown = ({
  onExport,
  title = "Exportar",
  buttonClassName = "export-dropdown__btn",
  dropdownClassName = "export-dropdown__menu",
  style = {},
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const toggleDropdown = () => setIsOpen(!isOpen);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleExportClick = async (format) => {
    setIsOpen(false);
    if (onExport) {
      await onExport(format);
    }
  };

  const options = [
    {
      id: "pdf",
      label: "PDF",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
      ),
      color: "hover:text-red-600",
    },
    {
      id: "md",
      label: "Markdown",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 7V4a2 2 0 0 1 2-2h8.5L20 7.5V20a2 2 0 0 1-2 2h-6" />
          <polyline points="14 2 14 8 20 8" />
          <path d="M9 15l-3-3 3-3" />
          <path d="M12 15l3-3-3-3" />
        </svg>
      ),
      color: "hover:text-blue-500",
    },
    {
      id: "word",
      label: "Word",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
          <polyline points="14 2 14 8 20 8" />
          <path d="M12 18v-6" />
          <path d="M9 15h6" />
        </svg>
      ),
      color: "hover:text-blue-700",
    },
    {
      id: "json",
      label: "JSON",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <path d="M12 18h.01" />
          <path d="M16 12l-4 4-4-4" />
        </svg>
      ),
      color: "hover:text-orange-500",
    },
  ];

  return (
    <div className="export-dropdown" ref={dropdownRef}>
      <button
        onClick={toggleDropdown}
        className={buttonClassName}
        title={title}
        style={style}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="export-dropdown__icon"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" x2="12" y1="15" y2="3" />
        </svg>
        <span className="export-dropdown__label">{title}</span>
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
          className={`export-dropdown__arrow ${isOpen ? "is-open" : ""}`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {isOpen && (
        <div className={dropdownClassName}>
          <div className="export-dropdown__content">
            <div className="export-dropdown__header">Seleccionar Formato</div>
            {options.map((opt) => (
              <button
                key={opt.id}
                onClick={() => handleExportClick(opt.id)}
                className={`export-dropdown__option export-dropdown__option--${opt.id}`}
              >
                <span className="export-dropdown__option-icon">{opt.icon}</span>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ExportDropdown;
