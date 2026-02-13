import React, { useEffect, useRef, useState } from 'react';
import useIntersection from '../hooks/useIntersection';

const MAX_INLINE_BADGES = 5;

const BadgeList = ({ badges, className = '' }) => {
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState(null);
  const triggerRef = useRef(null);
  const modalRef = useRef(null);
  const listRef = useRef(null);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const overflowButtonRef = useRef(null);
  const overflowPanelRef = useRef(null);
  const listVisible = useIntersection(listRef);

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

  useEffect(() => {
    if (!overflowOpen) return;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOverflowOpen(false);
        overflowButtonRef.current?.focus();
      }
    };

    const handlePointerDown = (event) => {
      if (
        !overflowPanelRef.current?.contains(event.target) &&
        !overflowButtonRef.current?.contains(event.target)
      ) {
        setOverflowOpen(false);
      }
    };

    if (overflowButtonRef.current === document.activeElement) {
      overflowPanelRef.current?.focus();
    }

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [overflowOpen]);

  const filteredBadges = badges.filter((badge) =>
    badge.label.toLowerCase().includes(filter.toLowerCase())
  );

  const visibleBadges = filteredBadges.slice(0, MAX_INLINE_BADGES);
  const hiddenBadges = filteredBadges.slice(MAX_INLINE_BADGES);

  useEffect(() => {
    if (hiddenBadges.length === 0) {
      setOverflowOpen(false);
    }
  }, [hiddenBadges.length]);

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
        aria-label="Filter skills"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />
      <div ref={listRef} className="flex flex-wrap justify-center items-start w-full">
        {listVisible &&
          visibleBadges.map((badge) => (
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
              <img
                src={badge.src}
                alt={badge.alt}
                title={badge.description || badge.label}
              />
            </button>
          ))}
        {listVisible && hiddenBadges.length > 0 && (
          <div className="relative m-1">
            <button
              type="button"
              ref={overflowButtonRef}
              className="flex items-center justify-center rounded-full bg-gray-800 px-3 py-1 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              onClick={() => setOverflowOpen((prev) => !prev)}
              aria-haspopup="dialog"
              aria-expanded={overflowOpen}
              aria-controls="hidden-badges-popover"
              aria-label={`${hiddenBadges.length} more badges`}
            >
              +{hiddenBadges.length}
              <span className="sr-only"> more badges</span>
            </button>
            {overflowOpen && (
              <div
                id="hidden-badges-popover"
                ref={overflowPanelRef}
                role="dialog"
                aria-label="Hidden badges"
                tabIndex="-1"
                className="absolute left-1/2 z-10 mt-2 w-48 -translate-x-1/2 rounded bg-white p-3 text-sm text-black shadow-lg focus:outline-none"
              >
                <p className="mb-2 font-semibold text-gray-800">Hidden badges</p>
                <ul className="space-y-1">
                  {hiddenBadges.map((badge) => (
                    <li key={badge.label} className="break-words">
                      {badge.label}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  className="mt-3 rounded bg-blue-600 px-2 py-1 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onClick={() => {
                    setOverflowOpen(false);
                    overflowButtonRef.current?.focus();
                  }}
                >
                  Close
                </button>
              </div>
            )}
          </div>
        )}
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
