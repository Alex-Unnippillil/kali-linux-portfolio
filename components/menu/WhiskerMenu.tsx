import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Image from 'next/image';
import UbuntuApp from '../base/ubuntu_app';
import apps, { utilities, games } from '../../apps.config';
import { safeLocalStorage } from '../../utils/safeStorage';
import { trackEvent } from '@/lib/analytics-client';

type AppMeta = {
  id: string;
  title: string;
  icon: string;
  disabled?: boolean;
  favourite?: boolean;
};

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'favorites', label: 'Favorites' },
  { id: 'recent', label: 'Recent' },
  { id: 'utilities', label: 'Utilities' },
  { id: 'games', label: 'Games' }
];

const HINTS_SEEN_KEY = 'launcher-hints-seen';
const HINTS_OPT_OUT_KEY = 'launcher-hints-opt-out';

const WhiskerMenu: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [storageReady, setStorageReady] = useState(false);
  const [hintsSeen, setHintsSeen] = useState(false);
  const [optedOut, setOptedOut] = useState(false);
  const [sessionAcknowledged, setSessionAcknowledged] = useState(false);
  const [hintsVisible, setHintsVisible] = useState(false);

  const allApps: AppMeta[] = apps as any;
  const favoriteApps = useMemo(() => allApps.filter(a => a.favourite), [allApps]);
  const recentApps = useMemo(() => {
    try {
      const ids: string[] = JSON.parse(safeLocalStorage?.getItem('recentApps') || '[]');
      return ids.map(id => allApps.find(a => a.id === id)).filter(Boolean) as AppMeta[];
    } catch {
      return [];
    }
  }, [allApps, open]);
  const utilityApps: AppMeta[] = utilities as any;
  const gameApps: AppMeta[] = games as any;

  const currentApps = useMemo(() => {
    let list: AppMeta[];
    switch (category) {
      case 'favorites':
        list = favoriteApps;
        break;
      case 'recent':
        list = recentApps;
        break;
      case 'utilities':
        list = utilityApps;
        break;
      case 'games':
        list = gameApps;
        break;
      default:
        list = allApps;
    }
    if (query) {
      const q = query.toLowerCase();
      list = list.filter(a => a.title.toLowerCase().includes(q));
    }
    return list;
  }, [category, query, allApps, favoriteApps, recentApps, utilityApps, gameApps]);

  useEffect(() => {
    if (!open) return;
    setHighlight(0);
  }, [open, category, query]);

  useEffect(() => {
    try {
      const seen = safeLocalStorage?.getItem(HINTS_SEEN_KEY) === 'true';
      const optOut = safeLocalStorage?.getItem(HINTS_OPT_OUT_KEY) === 'true';
      setHintsSeen(seen);
      setOptedOut(optOut);
    } catch {
      setHintsSeen(false);
      setOptedOut(false);
    } finally {
      setStorageReady(true);
    }
  }, []);

  const openSelectedApp = (id: string) => {
    window.dispatchEvent(new CustomEvent('open-app', { detail: id }));
    setOpen(false);
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Meta' && !e.ctrlKey && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        setOpen(o => !o);
        return;
      }
      if (!open) return;
      if (e.key === 'Escape') {
        setOpen(false);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlight(h => Math.min(h + 1, currentApps.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlight(h => Math.max(h - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const app = currentApps[highlight];
        if (app) openSelectedApp(app.id);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, currentApps, highlight]);

  useEffect(() => {
    if (!open) {
      setHintsVisible(false);
      return;
    }
    if (!storageReady || optedOut || sessionAcknowledged) return;
    if (!hintsSeen) {
      setHintsVisible(true);
    }
  }, [open, storageReady, optedOut, sessionAcknowledged, hintsSeen]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (!open) return;
      const target = e.target as Node;
      if (!menuRef.current?.contains(target) && !buttonRef.current?.contains(target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  useEffect(() => {
    if (!hintsVisible) return;
    const overlay = overlayRef.current;
    const selectors =
      'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])';
    const focusables = overlay
      ? Array.from(overlay.querySelectorAll<HTMLElement>(selectors))
      : [];
    focusables[0]?.focus();
    const handleTab = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey) {
        if (document.activeElement === first) {
          event.preventDefault();
          last.focus();
        }
      } else if (document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    overlay?.addEventListener('keydown', handleTab);
    return () => overlay?.removeEventListener('keydown', handleTab);
  }, [hintsVisible]);

  const handleCloseHints = useCallback(() => {
    setSessionAcknowledged(true);
    setHintsVisible(false);
    try {
      safeLocalStorage?.setItem(HINTS_SEEN_KEY, 'true');
      setHintsSeen(true);
    } catch {
      setHintsSeen(true);
    }
  }, []);

  useEffect(() => {
    if (!hintsVisible) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        handleCloseHints();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [hintsVisible, handleCloseHints]);

  useEffect(() => {
    if (!hintsVisible && open) {
      searchInputRef.current?.focus();
    }
  }, [hintsVisible, open]);

  const handleNeverShowAgain = useCallback(() => {
    handleCloseHints();
    try {
      safeLocalStorage?.setItem(HINTS_OPT_OUT_KEY, 'true');
      setOptedOut(true);
    } catch {
      setOptedOut(true);
    }
    if (process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true') {
      trackEvent('launcher_hint_dismiss', { method: 'never_show' });
    }
  }, [handleCloseHints]);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(o => !o)}
        className="pl-3 pr-3 outline-none transition duration-100 ease-in-out border-b-2 border-transparent py-1"
      >
        <Image
          src="/themes/Yaru/status/decompiler-symbolic.svg"
          alt="Menu"
          width={16}
          height={16}
          className="inline mr-1"
        />
        Applications
      </button>
      {open && (
        <div
          ref={menuRef}
          className="absolute left-0 mt-1 z-50 flex bg-ub-grey text-white shadow-lg relative"
          tabIndex={-1}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) {
              setOpen(false);
            }
          }}
        >
          <div className="flex flex-col bg-gray-800 p-2" aria-hidden={hintsVisible}>
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                className={`text-left px-2 py-1 rounded mb-1 ${category === cat.id ? 'bg-gray-700' : ''}`}
                onClick={() => setCategory(cat.id)}
              >
                {cat.label}
              </button>
            ))}
          </div>
          <div className="p-3" aria-hidden={hintsVisible}>
            <input
              ref={searchInputRef}
              className="mb-3 w-64 px-2 py-1 rounded bg-black bg-opacity-20 focus:outline-none"
              placeholder="Search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              autoFocus
            />
            <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
              {currentApps.map((app, idx) => (
                <div key={app.id} className={idx === highlight ? 'ring-2 ring-ubb-orange' : ''}>
                  <UbuntuApp
                    id={app.id}
                    icon={app.icon}
                    name={app.title}
                    openApp={() => openSelectedApp(app.id)}
                    disabled={app.disabled}
                  />
                </div>
              ))}
            </div>
          </div>
          {hintsVisible && (
            <div
              ref={overlayRef}
              className="absolute inset-0 z-10 flex items-center justify-center bg-black/80 p-4"
              role="dialog"
              aria-modal="true"
              aria-labelledby="launcher-hints-title"
              aria-describedby="launcher-hints-description"
            >
              <div className="max-w-sm w-full space-y-3 rounded-lg bg-gray-900/95 p-4 text-sm shadow-lg">
                <h2 id="launcher-hints-title" className="text-lg font-semibold">
                  Launcher tips
                </h2>
                <p id="launcher-hints-description" className="text-sm">
                  Start typing to filter applications instantly and keep your hands on the keyboard with quick commands.
                </p>
                <ul className="list-disc space-y-2 pl-5">
                  <li>
                    <span className="font-semibold">Search:</span> Use the search box or begin typing to narrow the app grid without leaving the launcher.
                  </li>
                  <li>
                    <span className="font-semibold">Commands:</span> Press <span className="rounded border border-gray-600 px-1 py-0.5 font-mono">Meta</span>, then use ↑/↓ and Enter to launch the highlighted app.
                  </li>
                </ul>
                <div className="flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    onClick={handleCloseHints}
                    className="rounded bg-gray-700 px-3 py-1 text-sm hover:bg-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-ubb-orange"
                  >
                    Got it
                  </button>
                  <button
                    type="button"
                    onClick={handleNeverShowAgain}
                    className="rounded border border-gray-500 px-3 py-1 text-sm hover:bg-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-ubb-orange"
                  >
                    Never show again
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WhiskerMenu;
