'use client';

import React, { useEffect, useRef } from 'react';
import {
  DESKTOP_GESTURES,
  DESKTOP_KEY_BINDING_SECTIONS,
} from '../../data/desktop/interactionGuides';
import useFocusTrap from '../../hooks/useFocusTrap';

interface CheatSheetOverlayProps {
  open: boolean;
  onClose: () => void;
}

function Keycaps({ keys }: { keys: string[] }) {
  return (
    <span className="keycaps" aria-label={keys.join(' plus ')}>
      {keys.map((key) => (
        <kbd key={key} className="keycaps__item">
          {key}
        </kbd>
      ))}
    </span>
  );
}

const CheatSheetOverlay: React.FC<CheatSheetOverlayProps> = ({ open, onClose }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useFocusTrap(containerRef, open);

  useEffect(() => {
    if (!open) return undefined;
    closeButtonRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="overlay-backdrop"
      role="presentation"
      onClick={onClose}
      data-testid="cheat-sheet-overlay"
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="desktop-cheat-sheet-title"
        className="overlay-panel"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="overlay-panel__header">
          <div>
            <h2 id="desktop-cheat-sheet-title">Desktop cheat sheet</h2>
            <p className="overlay-panel__subtitle">
              Keyboard shortcuts and touch gestures for navigating the Kali desktop.
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="overlay-panel__close"
            onClick={onClose}
          >
            Close
          </button>
        </header>

        <div className="overlay-grid">
          {DESKTOP_KEY_BINDING_SECTIONS.map((section) => (
            <section key={section.id} aria-labelledby={`${section.id}-title`}>
              <h3 id={`${section.id}-title`} className="overlay-section__title">
                {section.title}
              </h3>
              <ul className="overlay-section__list">
                {section.bindings.map((binding) => (
                  <li key={binding.id} className="overlay-section__item">
                    <div className="overlay-section__item-heading">
                      <h4>{binding.title}</h4>
                      <Keycaps keys={binding.displayKeys} />
                    </div>
                    <p className="overlay-section__description">{binding.note ?? binding.description}</p>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <section aria-labelledby="gestures-title" className="overlay-gestures">
          <h3 id="gestures-title" className="overlay-section__title">
            Touch gestures
          </h3>
          <ul className="overlay-section__list">
            {DESKTOP_GESTURES.map((gesture) => (
              <li key={gesture.id} className="overlay-section__item">
                <div className="overlay-section__item-heading">
                  <h4>{gesture.title}</h4>
                </div>
                <p className="overlay-section__description">{gesture.description}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <style jsx>{`
        .overlay-backdrop {
          position: fixed;
          inset: 0;
          z-index: 50;
          display: flex;
          padding: clamp(1rem, 2vw, 3rem);
          overflow-y: auto;
          justify-content: center;
          background: rgba(0, 0, 0, 0.75);
        }

        .overlay-panel {
          position: relative;
          width: min(64rem, 100%);
          border-radius: 1rem;
          border: 1px solid var(--color-border);
          background: var(--color-surface);
          color: var(--color-text);
          box-shadow: 0 24px 72px rgba(0, 0, 0, 0.5);
          padding: clamp(1.5rem, 2vw, 2.5rem);
        }

        .overlay-panel__header {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          align-items: flex-start;
          justify-content: space-between;
        }

        .overlay-panel__subtitle {
          margin-top: 0.25rem;
          color: rgba(255, 255, 255, 0.75);
        }

        .overlay-panel__close {
          align-self: flex-end;
          border-radius: 9999px;
          border: 1px solid var(--color-border);
          padding: 0.35rem 0.85rem;
          background: var(--color-muted);
          color: var(--color-text);
          font-size: 0.85rem;
        }

        .overlay-grid {
          display: grid;
          gap: clamp(1.25rem, 2vw, 2rem);
          margin-top: clamp(1.5rem, 2vw, 2.5rem);
        }

        @media (min-width: 768px) {
          .overlay-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        .overlay-section__title {
          font-size: 1.05rem;
          font-weight: 600;
          margin-bottom: 0.75rem;
        }

        .overlay-section__list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .overlay-section__item {
          border-radius: 0.75rem;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.03);
          padding: 0.85rem;
        }

        .overlay-section__item-heading {
          display: flex;
          gap: 0.75rem;
          justify-content: space-between;
          align-items: center;
        }

        .overlay-section__description {
          margin-top: 0.5rem;
          color: rgba(255, 255, 255, 0.72);
          line-height: 1.5;
        }

        .overlay-gestures {
          margin-top: clamp(1.5rem, 2vw, 2.5rem);
        }

        .keycaps {
          display: flex;
          gap: 0.4rem;
          flex-wrap: wrap;
        }

        .keycaps__item {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 2.5rem;
          padding: 0.35rem 0.65rem;
          border-radius: 0.5rem;
          border: 1px solid var(--color-border);
          background: var(--color-muted);
          color: var(--color-text);
          font-size: 0.85rem;
          line-height: 1.2;
          font-family: 'Ubuntu Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
            'Liberation Mono', 'Courier New', monospace;
        }

        @media (min-width: 1024px) {
          .overlay-panel__header {
            flex-direction: row;
            align-items: center;
          }

          .overlay-panel__close {
            margin-left: auto;
          }
        }
      `}</style>
    </div>
  );
};

export default CheatSheetOverlay;
