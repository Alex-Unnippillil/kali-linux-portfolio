import React, { useState, useRef } from 'react';
import useFocusTrap from '../hooks/useFocusTrap';

const BadgeList = ({ badges, className = '' }) => {
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState(null);
  const modalRef = useRef(null);
  const lastFocused = useRef(null);
  useFocusTrap(modalRef, !!selected);

  const openBadge = (badge) => {
    lastFocused.current = document.activeElement;
    setSelected(badge);
  };

  const closeModal = () => {
    setSelected(null);
    lastFocused.current?.focus();
  };

  const filteredBadges = badges.filter((badge) =>
    badge.label.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <label htmlFor="badge-filter" className="mb-1">
        Filter skills
      </label>
      <input
        id="badge-filter"
        type="text"
        placeholder="Filter skills"
        className="mb-2 px-2 py-1 rounded text-black font-normal"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />
      <div className="flex flex-wrap justify-center items-start w-full">
        {filteredBadges.map((badge, idx) => (
          <button
            key={idx}
            type="button"
            className="m-1 hover:scale-110 transition-transform cursor-pointer"
            onClick={() => openBadge(badge)}
            aria-label={badge.label}
          >
            <img
              src={badge.src}
              alt={badge.alt}
              title={badge.description || badge.label}
            />
          </button>
        ))}
      </div>
      {selected && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={closeModal}
          role="dialog"
          aria-modal="true"
          ref={modalRef}
        >
          <div
            className="bg-white text-black p-4 rounded shadow max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="font-bold mb-2">{selected.label}</div>
            <div className="text-sm">{selected.description}</div>
            <button
              className="mt-4 px-2 py-1 bg-blue-600 text-white rounded"
              onClick={closeModal}
              autoFocus
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BadgeList;
