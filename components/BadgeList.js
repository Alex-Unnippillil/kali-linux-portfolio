import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';

const BadgeList = ({ badges, className = '' }) => {
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState(null);
  const triggerRef = useRef(null);
  const modalRef = useRef(null);

  const closeModal = () => {
    setSelected(null);
    triggerRef.current && triggerRef.current.focus();
  };

  useEffect(() => {
    if (!selected) return;

    const focusableSelectors =
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const focusable = modalRef.current?.querySelectorAll(focusableSelectors);
    const elements = Array.from(focusable ?? []);

    elements[0]?.focus();

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeModal();
      } else if (e.key === 'Tab' && elements.length > 0) {
        e.preventDefault();
        const index = elements.indexOf(document.activeElement);
        const next =
          (index + (e.shiftKey ? -1 : 1) + elements.length) % elements.length;
        elements[next].focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selected]);

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
        {filteredBadges.map((badge) => (
          <button
            key={badge.label}
            type="button"
            className="m-1 hover:scale-110 transition-transform cursor-pointer"
            onClick={(e) => {
              triggerRef.current = e.currentTarget;
              setSelected(badge);
            }}
            aria-label={badge.label}
          >
            <Image
              src={badge.src}
              alt={badge.alt}
              title={badge.description || badge.label}
              width={120}
              height={40}
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
        >
          <div
            ref={modalRef}
            className="bg-white text-black p-4 rounded shadow max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="font-bold mb-2">{selected.label}</div>
            <div className="text-sm">{selected.description}</div>
            <button
              className="mt-4 px-2 py-1 bg-blue-600 text-white rounded"
              onClick={closeModal}
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
