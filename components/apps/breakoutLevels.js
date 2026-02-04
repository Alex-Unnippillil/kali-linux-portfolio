"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BREAKOUT_PRESETS,
  BREAKOUT_STORAGE_PREFIX,
  DEFAULT_LAYOUT,
  normalizeLayout,
} from './breakoutPresets';

const getSavedLevels = () => {
  const saved = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (key && key.startsWith(BREAKOUT_STORAGE_PREFIX)) {
      saved.push(key.slice(BREAKOUT_STORAGE_PREFIX.length));
    }
  }
  return saved.sort();
};

export default function BreakoutLevels({ onSelect, onClose }) {
  const [savedLevels, setSavedLevels] = useState([]);
  const dialogRef = useRef(null);

  const refreshSaved = useCallback(() => {
    try {
      setSavedLevels(getSavedLevels());
    } catch {
      setSavedLevels([]);
    }
  }, []);

  useEffect(() => {
    refreshSaved();
  }, [refreshSaved]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose?.();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  useEffect(() => {
    const node = dialogRef.current;
    if (!node) return undefined;
    const focusable = node.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (first) first.focus();
    const handleTab = (e) => {
      if (e.key !== 'Tab') return;
      if (focusable.length === 0) return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    node.addEventListener('keydown', handleTab);
    return () => node.removeEventListener('keydown', handleTab);
  }, [savedLevels]);

  const handleSelect = useCallback(
    (selection) => {
      onSelect?.(selection);
    },
    [onSelect],
  );

  const handleDelete = useCallback(
    (name) => {
      if (!window.confirm(`Delete "${name}"?`)) return;
      try {
        localStorage.removeItem(`${BREAKOUT_STORAGE_PREFIX}${name}`);
      } catch {
        /* ignore */
      }
      refreshSaved();
    },
    [refreshSaved],
  );

  const presetButtons = useMemo(
    () =>
      BREAKOUT_PRESETS.map((preset, index) => (
        <button
          key={preset.id}
          type="button"
          onClick={() =>
            handleSelect({
              layout: preset.layout,
              label: preset.name,
              source: 'preset',
              presetIndex: index,
            })
          }
          className="px-3 py-2 rounded border border-slate-700/70 bg-slate-800/80 hover:bg-slate-700/80 focus:outline-none focus:ring"
        >
          {preset.name}
        </button>
      )),
    [handleSelect],
  );

  return (
    <div
      className="absolute inset-0 z-40 flex items-center justify-center bg-black/80 text-white"
      role="dialog"
      aria-modal="true"
      aria-label="Choose Breakout level"
    >
      <div
        ref={dialogRef}
        className="w-[90%] max-w-xl rounded-lg border border-slate-700/70 bg-slate-900/95 p-4 shadow-xl"
      >
        <div className="flex items-center justify-between">
          <div className="text-lg font-semibold">Choose a level</div>
          <button
            type="button"
            onClick={() => onClose?.()}
            className="rounded px-2 py-1 text-sm text-slate-200 hover:bg-slate-800"
          >
            Esc
          </button>
        </div>
        <div className="mt-4 space-y-3">
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-400">Default</div>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  handleSelect({
                    layout: DEFAULT_LAYOUT,
                    label: 'Default',
                    source: 'default',
                  })
                }
                className="px-3 py-2 rounded border border-slate-700/70 bg-slate-800/80 hover:bg-slate-700/80 focus:outline-none focus:ring"
              >
                Default layout
              </button>
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-400">
              Built-in presets
            </div>
            <div className="mt-2 flex flex-wrap gap-2">{presetButtons}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-400">Saved</div>
            {savedLevels.length === 0 ? (
              <div className="mt-2 text-sm text-slate-400">
                No saved layouts yet.
              </div>
            ) : (
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {savedLevels.map((name) => (
                  <div
                    key={name}
                    className="flex items-center justify-between gap-2 rounded border border-slate-800/80 bg-slate-800/40 px-2 py-1"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        try {
                          const raw = localStorage.getItem(
                            `${BREAKOUT_STORAGE_PREFIX}${name}`,
                          );
                          if (!raw) return;
                          handleSelect({
                            layout: normalizeLayout(JSON.parse(raw)),
                            label: name,
                            source: 'saved',
                            savedName: name,
                          });
                        } catch {
                          /* ignore */
                        }
                      }}
                      className="text-left text-sm text-slate-100 hover:text-white"
                    >
                      {name}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(name)}
                      className="text-xs text-rose-300 hover:text-rose-200"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
