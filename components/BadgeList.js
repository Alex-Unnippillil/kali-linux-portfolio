import React, { useEffect, useMemo, useRef, useState } from 'react';
import useIntersection from '../hooks/useIntersection';

const BadgeList = ({ badges, className = '' }) => {
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const triggerRef = useRef(null);
  const modalRef = useRef(null);
  const listRef = useRef(null);
  const listVisible = useIntersection(listRef);
  const listId = useMemo(
    () => `badge-list-${Math.random().toString(36).slice(2, 9)}`,
    []
  );

  const MAX_VISIBLE_BADGES = 50;

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

  const hiddenCount = Math.max(filteredBadges.length - MAX_VISIBLE_BADGES, 0);
  const visibleBadges = isExpanded
    ? filteredBadges
    : filteredBadges.slice(0, MAX_VISIBLE_BADGES);

  useEffect(() => {
    setIsExpanded(false);
  }, [filter]);

  useEffect(() => {
    if (filteredBadges.length <= MAX_VISIBLE_BADGES && isExpanded) {
      setIsExpanded(false);
    }
  }, [filteredBadges.length, isExpanded]);

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
      <div ref={listRef} id={listId} className="badge-list-container">
        {listVisible &&
          visibleBadges.map((badge) => (
            <button
              key={badge.label}
              type="button"
              className="badge-button"
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
                className="badge-image"
              />
            </button>
          ))}
        {listVisible && hiddenCount > 0 && (
          <button
            type="button"
            className="badge-summary"
            onClick={() => setIsExpanded((prev) => !prev)}
            aria-expanded={isExpanded}
            aria-controls={listId}
          >
            {isExpanded ? 'Show fewer badges' : `+${hiddenCount} more`}
          </button>
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
      <style jsx>{`
        .badge-list-container {
          container-type: inline-size;
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          align-items: flex-start;
          width: 100%;
          gap: 0.5rem;
        }

        .badge-button,
        .badge-summary {
          margin: 0.25rem;
          border-radius: 0.5rem;
          background: transparent;
          border: none;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0.25rem;
          color: inherit;
        }

        .badge-button:focus-visible,
        .badge-summary:focus-visible {
          outline: 2px solid #38bdf8;
          outline-offset: 2px;
        }

        .badge-button {
          transition: transform 150ms ease;
        }

        .badge-button:hover {
          transform: scale(1.05);
        }

        .badge-summary {
          background: rgba(30, 41, 59, 0.9);
          color: #f8fafc;
          font-size: 0.875rem;
          font-weight: 600;
          padding: 0.35rem 0.75rem;
        }

        .badge-summary:hover {
          background: rgba(37, 99, 235, 0.9);
        }

        .badge-image {
          max-height: 3rem;
          max-width: 5rem;
        }

        @container (max-width: 480px) {
          .badge-image {
            max-height: 2.5rem;
            max-width: 4rem;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .badge-button,
          .badge-summary {
            transition: none;
          }

          .badge-button:hover {
            transform: none;
          }
        }
      `}</style>
    </div>
  );
};

export default BadgeList;
