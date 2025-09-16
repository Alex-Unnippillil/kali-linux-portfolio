'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useKeymap from '../../apps/settings/keymapRegistry';

interface ShortcutDefinition {
  keys: string;
  description: string;
  keywords?: string[];
  dynamicKey?: string;
}

interface ShortcutSectionDefinition {
  title: string;
  shortcuts: ShortcutDefinition[];
}

interface ShortcutItem extends Omit<ShortcutDefinition, 'dynamicKey'> {
  id: string;
}

interface ShortcutSection {
  title: string;
  shortcuts: ShortcutItem[];
}

const STATIC_SECTIONS: ShortcutSectionDefinition[] = [
  {
    title: 'Getting around',
    shortcuts: [
      {
        keys: '?',
        description: 'Toggle this help overlay',
        keywords: ['help', 'shortcuts', 'reference'],
        dynamicKey: 'Show keyboard shortcuts',
      },
      {
        keys: 'Meta',
        description: 'Open the application menu (Super / Windows key)',
        keywords: ['launcher', 'applications', 'menu', 'super'],
      },
      {
        keys: 'Shift+F10',
        description: 'Open the context menu for the focused element',
        keywords: ['context menu', 'right click', 'accessibility'],
      },
    ],
  },
  {
    title: 'Window management',
    shortcuts: [
      {
        keys: 'Alt+Tab',
        description: 'Switch to the next open window',
        keywords: ['switcher', 'navigation', 'next window'],
      },
      {
        keys: 'Alt+Shift+Tab',
        description: 'Switch to the previous window',
        keywords: ['switcher', 'previous window', 'navigation'],
      },
      {
        keys: 'Alt+`',
        description: 'Cycle windows of the current application',
        keywords: ['cycle', 'same app', 'tilde'],
      },
      {
        keys: 'Meta+ArrowLeft',
        description: 'Snap the focused window to the left half',
        keywords: ['snap', 'tile', 'left'],
      },
      {
        keys: 'Meta+ArrowRight',
        description: 'Snap the focused window to the right half',
        keywords: ['snap', 'tile', 'right'],
      },
      {
        keys: 'Meta+ArrowUp',
        description: 'Maximize the focused window',
        keywords: ['maximize', 'tile', 'snap up'],
      },
      {
        keys: 'Meta+ArrowDown',
        description: 'Restore or minimize the focused window',
        keywords: ['restore', 'minimize', 'tile down'],
      },
    ],
  },
  {
    title: 'Utilities',
    shortcuts: [
      {
        keys: 'Ctrl+Shift+V',
        description: 'Open the clipboard manager',
        keywords: ['clipboard', 'history', 'paste'],
      },
    ],
  },
  {
    title: 'Tabbed interfaces',
    shortcuts: [
      {
        keys: 'Ctrl+Tab',
        description: 'Move to the next tab in tabbed apps',
        keywords: ['tabs', 'next tab', 'navigation'],
      },
      {
        keys: 'Ctrl+Shift+Tab',
        description: 'Move to the previous tab',
        keywords: ['tabs', 'previous tab', 'navigation'],
      },
      {
        keys: 'Ctrl+T',
        description: 'Open a new tab when available',
        keywords: ['tabs', 'new tab'],
      },
      {
        keys: 'Ctrl+W',
        description: 'Close the active tab',
        keywords: ['tabs', 'close tab'],
      },
    ],
  },
];

const formatEvent = (event: KeyboardEvent) => {
  const parts: string[] = [];
  if (event.ctrlKey && event.key !== 'Control') parts.push('Ctrl');
  if (event.altKey && event.key !== 'Alt') parts.push('Alt');
  const isPrintableSymbol =
    event.key.length === 1 &&
    event.key === event.key.toUpperCase() &&
    !/[A-Z]/.test(event.key);
  if (event.shiftKey && event.key !== 'Shift' && !isPrintableSymbol) {
    parts.push('Shift');
  }
  if (event.metaKey && event.key !== 'Meta') parts.push('Meta');

  const key = event.key.length === 1 ? event.key.toUpperCase() : event.key;
  if (!['Control', 'Alt', 'Shift', 'Meta'].includes(key)) {
    parts.push(key);
  } else if (parts.length === 0) {
    parts.push(key);
  }
  return parts.join('+');
};

const HelpOverlay: React.FC = () => {
  const { shortcuts: keymap } = useKeymap();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const clearCopyTimeout = useRef<number | null>(null);

  const keymapLookup = useMemo(() => {
    const map = new Map<string, string>();
    keymap.forEach(({ description, keys }) => {
      map.set(description, keys);
    });
    return map;
  }, [keymap]);

  const resolvedSections: ShortcutSection[] = useMemo(() => {
    const sections = STATIC_SECTIONS.map<ShortcutSection>((section) => ({
      title: section.title,
      shortcuts: section.shortcuts.map((shortcut) => {
        const id = `${section.title}:${shortcut.description}`;
        const keys = shortcut.dynamicKey
          ? keymapLookup.get(shortcut.dynamicKey) ?? shortcut.keys
          : shortcut.keys;
        return {
          id,
          keys,
          description: shortcut.description,
          keywords: shortcut.keywords,
        };
      }),
    }));
    return sections;
  }, [keymapLookup]);

  const toggleBinding = keymapLookup.get('Show keyboard shortcuts') ?? '?';

  const filteredSections = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return resolvedSections;
    const terms = trimmed.split(/\s+/).filter(Boolean);
    return resolvedSections
      .map((section) => {
        const shortcuts = section.shortcuts.filter((shortcut) => {
          const haystack = [
            shortcut.keys,
            shortcut.description,
            ...(shortcut.keywords || []),
          ]
            .join(' ')
            .toLowerCase();
          return terms.every((term) => haystack.includes(term));
        });
        return { ...section, shortcuts };
      })
      .filter((section) => section.shortcuts.length > 0);
  }, [resolvedSections, query]);

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  const handleCopy = useCallback(async (keys: string, id: string) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(keys);
      } else if (typeof document !== 'undefined') {
        const textarea = document.createElement('textarea');
        textarea.value = keys;
        textarea.setAttribute('readonly', 'true');
        textarea.style.position = 'absolute';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedId(id);
      if (clearCopyTimeout.current) window.clearTimeout(clearCopyTimeout.current);
      clearCopyTimeout.current = window.setTimeout(() => setCopiedId(null), 1500);
    } catch (error) {
      console.error('Failed to copy shortcut', error);
    }
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const node = dialogRef.current;
    if (!node) return undefined;

    previousFocus.current = document.activeElement as HTMLElement | null;
    searchRef.current?.focus();

    const getFocusable = () =>
      Array.from(
        node.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => !el.hasAttribute('aria-hidden'));

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        close();
        return;
      }
      if (event.key === 'Tab') {
        const focusables = getFocusable();
        if (focusables.length === 0) return;
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
      }
    };

    node.addEventListener('keydown', handleKeyDown);
    return () => {
      node.removeEventListener('keydown', handleKeyDown);
      previousFocus.current?.focus();
    };
  }, [open, close]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }
      const combo = formatEvent(event);
      const shouldToggle =
        combo === toggleBinding ||
        (toggleBinding === '?' && event.key === '/' && event.shiftKey);
      if (shouldToggle) {
        event.preventDefault();
        event.stopPropagation();
        if (event.stopImmediatePropagation) {
          event.stopImmediatePropagation();
        }
        setOpen((value) => !value);
        return;
      }
      if (open && event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        if (event.stopImmediatePropagation) {
          event.stopImmediatePropagation();
        }
        close();
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [toggleBinding, close, open]);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setCopiedId(null);
    }
  }, [open]);

  useEffect(() => () => {
    if (clearCopyTimeout.current) {
      window.clearTimeout(clearCopyTimeout.current);
    }
  }, []);

  if (!open) return null;

  const titleId = 'system-help-overlay-title';
  const descriptionId = 'system-help-overlay-description';

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 p-4 text-white"
      onClick={close}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="max-h-full w-full max-w-3xl overflow-hidden rounded-lg bg-gray-900 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex flex-col gap-2 border-b border-gray-700 bg-gray-800/60 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 id={titleId} className="text-xl font-semibold">
              Keyboard shortcuts
            </h2>
            <p id={descriptionId} className="text-sm text-gray-300">
              Search shortcuts, then press the copy button to save a key combination to the clipboard.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={searchRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search shortcuts"
              className="w-full rounded-md bg-gray-900 px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-ubt-blue sm:w-64"
              type="search"
            />
            <button
              type="button"
              onClick={close}
              className="rounded-md bg-gray-700 px-3 py-2 text-sm font-medium text-white hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-ubt-blue"
            >
              Close
            </button>
          </div>
        </header>
        <div className="max-h-[70vh] overflow-y-auto p-4">
          {filteredSections.length === 0 ? (
            <p className="text-sm text-gray-300">No shortcuts match “{query}”.</p>
          ) : (
            <div className="space-y-6">
              {filteredSections.map((section) => (
                <section key={section.title} className="space-y-3">
                  <h3 className="text-lg font-semibold text-ubt-blue">{section.title}</h3>
                  <ul className="space-y-2">
                    {section.shortcuts.map((shortcut) => {
                      const isCopied = copiedId === shortcut.id;
                      return (
                        <li
                          key={shortcut.id}
                          className="flex flex-col justify-between gap-2 rounded-lg border border-gray-700 bg-gray-800/60 p-3 sm:flex-row sm:items-center"
                        >
                          <div>
                            <p className="font-mono text-sm text-ubt-blue">{shortcut.keys}</p>
                            <p className="text-sm text-gray-200">{shortcut.description}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => handleCopy(shortcut.keys, shortcut.id)}
                              className="rounded-md bg-gray-700 px-3 py-2 text-xs font-medium uppercase tracking-wide text-white hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-ubt-blue"
                              aria-label={`Copy ${shortcut.keys} to the clipboard`}
                            >
                              Copy
                            </button>
                            <span
                              aria-live="polite"
                              className={`text-xs text-green-400 transition-opacity ${
                                isCopied ? 'opacity-100' : 'opacity-0'
                              }`}
                              role="status"
                            >
                              Copied!
                            </span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HelpOverlay;
