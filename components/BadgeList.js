import React, { useState, useRef, useEffect } from 'react';

const STRINGS = {
  en: {
    filterPlaceholder: 'Filter skills',
    close: 'Close',
    viewDetails: 'View details for',
  },
  es: {
    filterPlaceholder: 'Filtrar habilidades',
    close: 'Cerrar',
    viewDetails: 'Ver detalles de',
  },
};

const BadgeList = ({ badges, className = '' }) => {
  const locale =
    typeof navigator !== 'undefined'
      ? navigator.language.slice(0, 2)
      : 'en';
  const strings = STRINGS[locale] || STRINGS.en;

  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState(null);
  const closeRef = useRef(null);
  const lastFocused = useRef(null);

  useEffect(() => {
    if (selected && closeRef.current) {
      closeRef.current.focus();
    }
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setSelected(null);
      }
    };
    if (selected) {
      document.addEventListener('keydown', onKey);
    }
    return () => document.removeEventListener('keydown', onKey);
  }, [selected]);

  const openModal = (badge) => {
    lastFocused.current = document.activeElement;
    setSelected(badge);
  };

  const closeModal = () => {
    setSelected(null);
    lastFocused.current && lastFocused.current.focus();
  };

  const filteredBadges = badges.filter((badge) =>
    badge.label.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <input
        type="text"
        placeholder={strings.filterPlaceholder}
        aria-label={strings.filterPlaceholder}
        className="mb-2 px-2 py-1 rounded text-black font-normal"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />
      <div
        className="flex flex-wrap justify-center items-start w-full"
        role="list"
      >
        {filteredBadges.map((badge, idx) => (
          <button
            key={idx}
            type="button"
            className="m-1 hover:scale-110 transition-transform cursor-pointer"
            onClick={() => openModal(badge)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openModal(badge);
              }
            }}
            aria-label={`${strings.viewDetails} ${badge.label}`}
          >
            <img src={badge.src} alt={badge.alt} />
          </button>
        ))}
      </div>
      {selected && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={closeModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="badge-title"
          aria-describedby="badge-description"
        >
          <div
            className="bg-white text-black p-4 rounded shadow max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div id="badge-title" className="font-bold mb-2">
              {selected.label}
            </div>
            <div id="badge-description" className="text-sm">
              {selected.description}
            </div>
            <button
              ref={closeRef}
              className="mt-4 px-2 py-1 bg-blue-600 text-white rounded"
              onClick={closeModal}
            >
              {strings.close}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BadgeList;
