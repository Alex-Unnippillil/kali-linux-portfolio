'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useKeymap from '../../apps/settings/keymapRegistry';
import Modal from '../base/Modal';

type StaticShortcut = {
  id: string;
  description: string;
  category: string;
  keys: string;
  keywords?: string[];
  dynamic?: boolean;
};

type ResolvedShortcut = StaticShortcut;

const STATIC_SHORTCUTS: StaticShortcut[] = [
  {
    id: 'show-shortcuts',
    description: 'Show keyboard shortcuts',
    category: 'System',
    keys: '?',
    keywords: ['help', 'overlay', 'reference'],
    dynamic: true,
  },
  {
    id: 'open-settings',
    description: 'Open settings',
    category: 'System',
    keys: 'Ctrl+,',
    keywords: ['preferences', 'configure'],
    dynamic: true,
  },
  {
    id: 'toggle-launcher',
    description: 'Toggle applications menu',
    category: 'Desktop navigation',
    keys: 'Super',
    keywords: ['launcher', 'start', 'meta', 'whisker'],
  },
  {
    id: 'switch-apps',
    description: 'Switch between apps',
    category: 'Desktop navigation',
    keys: 'Alt+Tab',
    keywords: ['window switcher', 'cycle'],
  },
  {
    id: 'cycle-app-windows',
    description: 'Cycle windows within an app',
    category: 'Desktop navigation',
    keys: 'Alt+`',
    keywords: ['window switcher', 'backtick'],
  },
  {
    id: 'snap-left',
    description: 'Snap window to the left half',
    category: 'Window management',
    keys: 'Super+ArrowLeft',
    keywords: ['tile', 'snap', 'arrange'],
  },
  {
    id: 'snap-right',
    description: 'Snap window to the right half',
    category: 'Window management',
    keys: 'Super+ArrowRight',
    keywords: ['tile', 'snap', 'arrange'],
  },
  {
    id: 'maximize',
    description: 'Maximize the current window',
    category: 'Window management',
    keys: 'Super+ArrowUp',
    keywords: ['tile', 'maximize'],
  },
  {
    id: 'restore',
    description: 'Restore or minimize the current window',
    category: 'Window management',
    keys: 'Super+ArrowDown',
    keywords: ['tile', 'minimize'],
  },
  {
    id: 'clipboard-manager',
    description: 'Open clipboard manager',
    category: 'Utilities',
    keys: 'Ctrl+Shift+V',
    keywords: ['clipboard', 'history'],
  },
  {
    id: 'context-menu',
    description: 'Open context menu for focused item',
    category: 'Utilities',
    keys: 'Shift+F10',
    keywords: ['menu', 'keyboard menu'],
  },
  {
    id: 'new-tab',
    description: 'Open a new tab (tabbed apps)',
    category: 'Tabs',
    keys: 'Ctrl+T',
    keywords: ['tab'],
  },
  {
    id: 'close-tab',
    description: 'Close current tab (tabbed apps)',
    category: 'Tabs',
    keys: 'Ctrl+W',
    keywords: ['tab'],
  },
  {
    id: 'next-tab',
    description: 'Cycle through tabs forward',
    category: 'Tabs',
    keys: 'Ctrl+Tab',
    keywords: ['tab', 'navigation'],
  },
  {
    id: 'previous-tab',
    description: 'Cycle through tabs backward',
    category: 'Tabs',
    keys: 'Ctrl+Shift+Tab',
    keywords: ['tab', 'navigation'],
  },
  {
    id: 'arrow-tabs',
    description: 'Select adjacent tab with arrow keys',
    category: 'Tabs',
    keys: 'ArrowLeft / ArrowRight',
    keywords: ['tab', 'navigation'],
  },
];

const formatEvent = (event: KeyboardEvent) => {
  const key = event.key.length === 1 ? event.key.toUpperCase() : event.key;
  const shouldIncludeShift = !(
    key === '?' &&
    !event.ctrlKey &&
    !event.altKey &&
    !event.metaKey
  );
  const parts = [
    event.ctrlKey ? 'Ctrl' : '',
    event.altKey ? 'Alt' : '',
    shouldIncludeShift && event.shiftKey ? 'Shift' : '',
    event.metaKey ? 'Meta' : '',
    key,
  ].filter(Boolean);
  return parts.join('+');
};

const isEditableTarget = (element: EventTarget | null) => {
  if (!element || !(element instanceof HTMLElement)) return false;
  const tagName = element.tagName;
  return (
    tagName === 'INPUT' ||
    tagName === 'TEXTAREA' ||
    element.isContentEditable ||
    element.getAttribute('role') === 'textbox'
  );
};

const HelpOverlay: React.FC = () => {
  const { shortcuts } = useKeymap();
  const [open, setOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [query, setQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const copyResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const resolvedShortcuts = useMemo<ResolvedShortcut[]>(() => {
    const override = new Map<string, string>();
    shortcuts.forEach((shortcut) => {
      override.set(shortcut.description, shortcut.keys);
    });
    return STATIC_SHORTCUTS.map((shortcut) => {
      if (shortcut.dynamic) {
        const keys = override.get(shortcut.description) || shortcut.keys;
        return { ...shortcut, keys };
      }
      return shortcut;
    });
  }, [shortcuts]);

  const categories = useMemo(() => {
    const seen = new Set<string>();
    const ordered: string[] = [];
    resolvedShortcuts.forEach((shortcut) => {
      if (!seen.has(shortcut.category)) {
        seen.add(shortcut.category);
        ordered.push(shortcut.category);
      }
    });
    return ordered;
  }, [resolvedShortcuts]);

  const conflicts = useMemo(() => {
    const counts = resolvedShortcuts.reduce<Map<string, number>>((map, shortcut) => {
      const key = shortcut.keys.trim();
      if (!key) return map;
      map.set(key, (map.get(key) || 0) + 1);
      return map;
    }, new Map());
    return new Set(
      Array.from(counts.entries())
        .filter(([, count]) => count > 1)
        .map(([key]) => key),
    );
  }, [resolvedShortcuts]);

  const filteredShortcuts = useMemo(() => {
    const search = query.trim().toLowerCase();
    return resolvedShortcuts.filter((shortcut) => {
      if (selectedCategory !== 'all' && shortcut.category !== selectedCategory) {
        return false;
      }
      if (!search) return true;
      const haystack = [
        shortcut.description,
        shortcut.keys,
        shortcut.category,
        ...(shortcut.keywords || []),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(search);
    });
  }, [resolvedShortcuts, selectedCategory, query]);

  const groupedShortcuts = useMemo(() => {
    const groups = new Map<string, ResolvedShortcut[]>();
    filteredShortcuts.forEach((shortcut) => {
      if (!groups.has(shortcut.category)) {
        groups.set(shortcut.category, []);
      }
      groups.get(shortcut.category)!.push(shortcut);
    });
    return groups;
  }, [filteredShortcuts]);

  const toggle = useCallback(() => {
    setOpen((prev) => !prev);
  }, []);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;
      const show = shortcuts.find(
        (shortcut) => shortcut.description === 'Show keyboard shortcuts',
      )?.keys;
      const formatted = formatEvent(event);
      if (show && formatted === show) {
        event.preventDefault();
        toggle();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [shortcuts, toggle]);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setSelectedCategory('all');
      setCopiedId(null);
      setStatusMessage('');
      if (copyResetRef.current) {
        clearTimeout(copyResetRef.current);
        copyResetRef.current = null;
      }
      return;
    }
    const id = window.setTimeout(() => {
      searchRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(id);
  }, [open]);

  useEffect(() => {
    return () => {
      if (copyResetRef.current) {
        clearTimeout(copyResetRef.current);
      }
    };
  }, []);

  const handleCopy = useCallback(async (shortcut: ResolvedShortcut) => {
    const text = `${shortcut.keys} — ${shortcut.description}`;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'absolute';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedId(shortcut.id);
      setStatusMessage(`Copied ${shortcut.keys}`);
      if (copyResetRef.current) {
        clearTimeout(copyResetRef.current);
      }
      copyResetRef.current = window.setTimeout(() => {
        setCopiedId(null);
        setStatusMessage('');
        copyResetRef.current = null;
      }, 2000);
    } catch (error) {
      setStatusMessage('Unable to copy shortcut');
    }
  }, []);

  if (!open) return null;

  const dialogTitleId = 'help-overlay-title';
  const dialogDescriptionId = 'help-overlay-description';

  return (
    <Modal
      isOpen={open}
      onClose={() => setOpen(false)}
      labelledBy={dialogTitleId}
      describedBy={dialogDescriptionId}
    >
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
        <div className="relative w-full max-w-3xl rounded-lg bg-gray-900 text-white shadow-xl">
          <div className="flex flex-col gap-4 p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <h2 id={dialogTitleId} className="text-2xl font-semibold">
                  Keyboard shortcuts
                </h2>
                <p id={dialogDescriptionId} className="text-sm text-gray-300">
                  Search or filter by category to explore desktop and application shortcuts.
                  Press Escape to close this dialog.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded border border-white/30 px-3 py-1 text-sm font-medium hover:bg-white/10 focus:outline-none focus:ring"
              >
                Close
              </button>
            </div>
            <label className="block text-sm">
              <span className="sr-only">Search shortcuts</span>
              <input
                ref={searchRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search shortcuts"
                className="w-full rounded bg-gray-800 px-3 py-2 text-base focus:outline-none focus:ring"
                type="search"
              />
            </label>
            <div className="flex flex-wrap items-center gap-2" role="list">
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className={`rounded-full px-3 py-1 text-sm ${
                  selectedCategory === 'all'
                    ? 'bg-ub-orange text-black'
                    : 'bg-gray-800 text-gray-200'
                }`}
                aria-pressed={selectedCategory === 'all'}
              >
                All
              </button>
              {categories.map((category) => {
                const disabled = !groupedShortcuts.get(category);
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setSelectedCategory(category)}
                    className={`rounded-full px-3 py-1 text-sm ${
                      selectedCategory === category
                        ? 'bg-ub-orange text-black'
                        : 'bg-gray-800 text-gray-200'
                    } ${disabled ? 'opacity-50' : ''}`}
                    aria-pressed={selectedCategory === category}
                    disabled={disabled}
                  >
                    {category}
                  </button>
                );
              })}
            </div>
            <div className="max-h-[60vh] overflow-y-auto rounded border border-white/10">
              {categories
                .filter((category) => groupedShortcuts.has(category))
                .map((category) => (
                  <section key={category} className="border-b border-white/10 last:border-b-0">
                    <header className="bg-gray-800 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-gray-300">
                      {category}
                    </header>
                    <ul className="divide-y divide-white/10">
                      {groupedShortcuts.get(category)!.map((shortcut) => (
                        <li
                          key={shortcut.id}
                          data-conflict={conflicts.has(shortcut.keys) ? 'true' : 'false'}
                          className={`flex flex-wrap items-center gap-3 px-4 py-3 ${
                            conflicts.has(shortcut.keys)
                              ? 'bg-red-900/40'
                              : 'bg-transparent'
                          }`}
                        >
                          <div className="min-w-[8rem] flex-1">
                            <p className="font-mono text-sm" aria-label={`Shortcut keys ${shortcut.keys}`}>
                              {shortcut.keys}
                            </p>
                            {conflicts.has(shortcut.keys) && (
                              <p className="text-xs text-red-300" role="note">
                                Shortcut conflict
                              </p>
                            )}
                          </div>
                          <p className="flex-1 text-sm">{shortcut.description}</p>
                          <button
                            type="button"
                            onClick={() => handleCopy(shortcut)}
                            className="rounded border border-white/30 px-3 py-1 text-xs font-medium uppercase tracking-wide hover:bg-white/10 focus:outline-none focus:ring"
                            aria-label={`Copy ${shortcut.keys} for ${shortcut.description}`}
                          >
                            {copiedId === shortcut.id ? 'Copied' : 'Copy'}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              {filteredShortcuts.length === 0 && (
                <div className="p-6 text-center text-sm text-gray-300">
                  No shortcuts match your search.
                </div>
              )}
            </div>
            <div aria-live="polite" className="sr-only" role="status">
              {statusMessage}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default HelpOverlay;
