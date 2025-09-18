"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import apps from '../../apps.config';

interface AppMeta {
  id: string;
  title: string;
  icon: string;
  disabled?: boolean;
}

interface CommandLauncherProps {
  open: boolean;
  onClose: () => void;
  activationToken: number;
}

const FOCUSABLE_SELECTOR =
  'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])';

const CommandLauncher: React.FC<CommandLauncherProps> = ({ open, onClose, activationToken }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef(false);

  const [query, setQuery] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(0);

  const availableApps = useMemo(() => {
    const list = (apps as unknown as AppMeta[]).filter(app => !app.disabled);
    return [...list].sort((a, b) => a.title.localeCompare(b.title));
  }, []);

  const normalizedQuery = query.trim().toLowerCase();

  const results = useMemo(() => {
    if (!normalizedQuery) {
      return availableApps;
    }
    return availableApps.filter(app => {
      const title = app.title.toLowerCase();
      const id = app.id.toLowerCase();
      return title.includes(normalizedQuery) || id.includes(normalizedQuery);
    });
  }, [availableApps, normalizedQuery]);

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      setQuery('');
      setHighlightIndex(0);
    }
    wasOpenRef.current = open;
  }, [open]);

  useEffect(() => {
    if (!open) {
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
        previousFocusRef.current = null;
      }
      return;
    }

    previousFocusRef.current = document.activeElement as HTMLElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [open, activationToken]);

  useEffect(() => {
    if (!open) {
      return;
    }
    if (results.length > 0) {
      setHighlightIndex(0);
    } else {
      setHighlightIndex(-1);
    }
  }, [normalizedQuery, open, results.length]);

  useEffect(() => {
    if (!open) {
      return;
    }
    if (highlightIndex < 0) {
      return;
    }
    const node = resultRefs.current[highlightIndex];
    node?.scrollIntoView({ block: 'nearest' });
  }, [highlightIndex, open]);

  const getFocusableElements = () => {
    if (!containerRef.current) {
      return [] as HTMLElement[];
    }
    const elements = Array.from(
      containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
    );
    return elements.filter(el => !el.hasAttribute('disabled') && el.tabIndex !== -1);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!open) {
      return;
    }

    event.stopPropagation();

    if (event.key === 'Tab') {
      const focusable = getFocusableElements();
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey) {
        if (!active || !containerRef.current?.contains(active) || active === first) {
          event.preventDefault();
          last.focus();
        }
      } else if (!active || !containerRef.current?.contains(active) || active === last) {
        event.preventDefault();
        first.focus();
      }
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }

    if (event.key === 'ArrowDown') {
      if (results.length === 0) {
        return;
      }
      event.preventDefault();
      setHighlightIndex(index => {
        if (index < 0) {
          return 0;
        }
        return Math.min(index + 1, results.length - 1);
      });
      return;
    }

    if (event.key === 'ArrowUp') {
      if (results.length === 0) {
        return;
      }
      event.preventDefault();
      setHighlightIndex(index => {
        if (index <= 0) {
          return 0;
        }
        return index - 1;
      });
      return;
    }

    if (event.key === 'Enter') {
      if (highlightIndex < 0 || !results[highlightIndex]) {
        return;
      }
      event.preventDefault();
      openApplication(results[highlightIndex].id);
    }
  };

  const openApplication = (appId: string) => {
    window.dispatchEvent(new CustomEvent('open-app', { detail: appId }));
    onClose();
  };

  const handleOverlayMouseDown = () => {
    onClose();
  };

  const handlePanelMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
  };

  if (!open) {
    return null;
  }

  resultRefs.current = resultRefs.current.slice(0, results.length);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4"
      role="presentation"
      onMouseDown={handleOverlayMouseDown}
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Command launcher"
        className="w-full max-w-xl overflow-hidden rounded-lg border border-white/10 bg-[#1a1a1a] text-white shadow-2xl"
        tabIndex={-1}
        onMouseDown={handlePanelMouseDown}
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-white/70">Command Launcher</h2>
          <button
            type="button"
            className="rounded bg-white/10 px-2 py-1 text-xs font-medium uppercase tracking-wider transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-ub-orange"
            onClick={onClose}
          >
            Esc
          </button>
        </div>
        <div className="px-4 py-3">
          <label htmlFor="command-launcher-input" className="sr-only">
            Search applications
          </label>
          <input
            id="command-launcher-input"
            ref={inputRef}
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Type to search for an application"
            className="w-full rounded bg-black/40 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-ub-orange"
          />
        </div>
        <div className="max-h-80 overflow-y-auto px-2 pb-3">
          {results.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-white/60">No applications match that search.</p>
          ) : (
            <ul role="listbox" aria-label="Applications" className="space-y-1">
              {results.map((app, index) => (
                <li key={app.id}>
                  <button
                    ref={element => {
                      resultRefs.current[index] = element;
                    }}
                    type="button"
                    role="option"
                    aria-selected={highlightIndex === index}
                    onMouseEnter={() => setHighlightIndex(index)}
                    onClick={() => openApplication(app.id)}
                    className={`flex w-full items-center rounded px-3 py-2 text-left transition focus:outline-none focus:ring-2 focus:ring-ub-orange ${
                      highlightIndex === index ? 'bg-white/10' : 'bg-transparent'
                    }`}
                  >
                    <span className="mr-3 flex h-8 w-8 items-center justify-center overflow-hidden rounded bg-black/40">
                      <Image src={app.icon} alt="" width={24} height={24} className="h-6 w-6" />
                    </span>
                    <span className="flex-1">
                      <span className="block text-sm font-medium">{app.title}</span>
                      <span className="block text-xs text-white/50">{app.id}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommandLauncher;
