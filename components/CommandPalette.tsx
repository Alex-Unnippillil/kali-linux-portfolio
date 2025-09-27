'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import apps from '../apps.config';
import { useCommandPaletteStore, type CommandPaletteItem } from '../hooks/useCommandPaletteStore';

const QUICK_ACTIONS: CommandPaletteItem[] = [
  {
    id: 'action:lock-screen',
    label: 'Lock Screen',
    description: 'Secure the desktop session',
    keywords: ['lock', 'secure', 'screen'],
    section: 'Quick Actions',
    priority: 200,
    onSelect: () => {
      window.dispatchEvent(new CustomEvent('command:lock-screen'));
    },
  },
  {
    id: 'action:show-shortcuts',
    label: 'Show Keyboard Shortcuts',
    description: 'Open the keyboard shortcut reference overlay',
    keywords: ['help', 'shortcuts', 'keyboard'],
    section: 'Quick Actions',
    priority: 200,
    onSelect: () => {
      window.dispatchEvent(new CustomEvent('command:show-shortcuts'));
    },
  },
];

const buildAppItems = (): CommandPaletteItem[] => {
  const registry: CommandPaletteItem[] = [];
  (apps as any[]).forEach((app) => {
    if (!app || typeof app !== 'object') return;
    if (app.disabled) return;
    registry.push({
      id: `app:${app.id}`,
      label: app.title || app.id,
      description: app.description || 'Application',
      keywords: [app.id, app.title, ...(app.keywords ?? [])].filter(Boolean),
      section: 'Applications',
      priority: app.favourite ? 50 : 0,
      onSelect: () => {
        window.dispatchEvent(new CustomEvent('open-app', { detail: app.id }));
      },
    });
  });
  return registry;
};

const CommandPalette: React.FC = () => {
  const {
    state: { isOpen, query, results, selectedIndex },
    close,
    setItems,
    setQuery,
    moveSelection,
    setSelection,
  } = useCommandPaletteStore();

  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = 'command-palette-results';

  const items = useMemo(() => {
    return [...QUICK_ACTIONS, ...buildAppItems()];
  }, []);

  useEffect(() => {
    setItems(items);
  }, [items, setItems]);

  useEffect(() => {
    if (!isOpen) return;
    const frame = requestAnimationFrame(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (!(target instanceof HTMLElement)) return;
      if (target.closest('[data-command-palette="panel"]')) {
        return;
      }
      event.preventDefault();
      close();
    };
    window.addEventListener('pointerdown', handlePointerDown);
    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, [close, isOpen]);

  if (!isOpen) return null;

  const grouped = results.reduce<Record<string, CommandPaletteItem[]>>((acc, item) => {
    if (!acc[item.section]) {
      acc[item.section] = [];
    }
    acc[item.section].push(item);
    return acc;
  }, {});

  const sections = Object.entries(grouped);

  const executeSelection = (item: CommandPaletteItem | undefined) => {
    if (!item) return;
    item.onSelect();
    close();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      moveSelection(1);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      moveSelection(-1);
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      executeSelection(results[selectedIndex]);
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    }
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(event.target.value);
  };

  return (
    <div
      className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm flex items-start justify-center p-4"
      role="presentation"
    >
      <div
        data-command-palette="panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="command-palette-title"
        className="w-full max-w-2xl rounded-xl bg-zinc-900 text-white shadow-2xl ring-1 ring-white/10"
      >
        <h2 id="command-palette-title" className="sr-only">
          Command palette
        </h2>
        <div className="border-b border-white/10 px-4 py-3">
          <label htmlFor="command-palette-input" className="sr-only">
            Search apps and actions
          </label>
          <input
            ref={inputRef}
            id="command-palette-input"
            role="combobox"
            aria-expanded="true"
            aria-controls={listboxId}
            aria-activedescendant={selectedIndex >= 0 ? `${results[selectedIndex]?.id}` : undefined}
            className="w-full bg-transparent text-lg outline-none placeholder:text-zinc-400"
            placeholder="Search apps and quick actions..."
            value={query}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <div className="max-h-[60vh] overflow-y-auto" role="presentation">
          <ul
            id={listboxId}
            role="listbox"
            aria-label="Command palette results"
            className="flex flex-col divide-y divide-white/5"
          >
            {sections.length === 0 && (
              <li className="px-4 py-6 text-center text-sm text-zinc-400">
                No results found. Try a different search term.
              </li>
            )}
            {sections.map(([section, entries]) => (
              <li key={section} role="presentation" className="p-2">
                <div className="px-2 pb-2 text-xs uppercase tracking-wide text-zinc-400">{section}</div>
                <ul role="group" className="space-y-1">
                  {entries.map((item, index) => {
                    const absoluteIndex = results.indexOf(item);
                    const isActive = absoluteIndex === selectedIndex;
                    return (
                      <li key={item.id} role="presentation">
                        <button
                          type="button"
                          role="option"
                          id={item.id}
                          aria-selected={isActive}
                          className={
                            'w-full rounded-md px-3 py-2 text-left transition ' +
                            (isActive
                              ? 'bg-blue-600/80 text-white shadow-lg'
                              : 'bg-transparent text-zinc-200 hover:bg-white/10')
                          }
                          onClick={() => executeSelection(item)}
                          onMouseEnter={() => setSelection(absoluteIndex)}
                        >
                          <div className="text-sm font-medium">{item.label}</div>
                          {item.description && (
                            <div className="text-xs text-zinc-300">{item.description}</div>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
