"use client";

import React, { useEffect, useMemo, useState } from 'react';
import {
  BUILT_IN_LEVELS,
  STORAGE_PREFIX,
  parseStoredLayout,
  serializeLayout,
} from '../../games/breakout/levels';

const loadCustomLevels = () => {
  if (typeof window === 'undefined') return [];
  const entries = [];
  for (let i = 0; i < window.localStorage.length; i += 1) {
    const key = window.localStorage.key(i);
    if (key && key.startsWith(STORAGE_PREFIX)) {
      const name = key.slice(STORAGE_PREFIX.length);
      try {
        const raw = window.localStorage.getItem(key);
        if (!raw) continue;
        const parsed = parseStoredLayout(JSON.parse(raw));
        if (parsed) {
          entries.push({ name, layout: parsed });
        }
      } catch {
        /* ignore invalid entries */
      }
    }
  }
  entries.sort((a, b) => a.name.localeCompare(b.name));
  return entries;
};

const useCustomLevels = () => {
  const [levels, setLevels] = useState([]);
  useEffect(() => {
    setLevels(loadCustomLevels());
  }, []);
  return levels;
};

const saveLevel = (name, layout) => {
  try {
    window.localStorage.setItem(
      `${STORAGE_PREFIX}${name}`,
      JSON.stringify(serializeLayout(layout)),
    );
  } catch {
    /* ignore storage errors */
  }
};

/**
 * Level selection overlay for Breakout.
 * Shows built-in campaigns, custom layouts, and continue/reset actions.
 */
export default function BreakoutLevels({
  onSelect,
  onContinue,
  canContinue,
  status,
  onReset,
  defaultName = 'custom-level',
}) {
  const levels = useCustomLevels();
  const builtIn = useMemo(() => BUILT_IN_LEVELS, []);
  const [importName, setImportName] = useState(defaultName);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState('');

  const handleImport = () => {
    try {
      const parsed = parseStoredLayout(JSON.parse(importText));
      if (!parsed) {
        setImportError('Invalid layout data');
        return;
      }
      saveLevel(importName, parsed);
      if (onSelect) {
        onSelect({ type: 'custom', name: importName, layout: parsed });
      }
    } catch {
      setImportError('Could not parse layout JSON');
    }
  };

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-80 text-white space-y-4 p-4">
      <div className="text-lg font-semibold">Breakout Session</div>
      {status && <div className="text-sm text-gray-300">{status}</div>}
      {canContinue && (
        <button
          type="button"
          onClick={onContinue}
          className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 rounded"
        >
          Continue
        </button>
      )}
      <div className="w-full max-w-xs space-y-2">
        <div className="uppercase text-xs tracking-wide text-gray-400">Built-in</div>
        {builtIn.map((level, index) => (
          <button
            key={level.id}
            type="button"
            onClick={() =>
              onSelect &&
              onSelect({
                type: 'built-in',
                index: index + 1,
                id: level.id,
                layout: level.layout,
                name: level.name,
              })
            }
            className="w-full px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-left"
          >
            <div className="font-semibold">{level.name}</div>
            {level.description && (
              <div className="text-xs text-gray-300">{level.description}</div>
            )}
          </button>
        ))}
      </div>
      <div className="w-full max-w-xs space-y-2">
        <div className="uppercase text-xs tracking-wide text-gray-400">Custom</div>
        {levels.length === 0 && (
          <div className="text-xs text-gray-400">Save a layout from the editor to list it here.</div>
        )}
        {levels.map((entry) => (
          <button
            key={entry.name}
            type="button"
            onClick={() =>
              onSelect &&
              onSelect({
                type: 'custom',
                name: entry.name,
                layout: entry.layout,
              })
            }
            className="w-full px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-left"
          >
            {entry.name}
          </button>
        ))}
      </div>
      <div className="w-full max-w-xs space-y-2 text-xs">
        <div className="uppercase tracking-wide text-gray-400">Import layout</div>
        <input
          className="w-full px-2 py-1 text-black rounded"
          value={importName}
          onChange={(e) => setImportName(e.target.value)}
          placeholder="Name"
        />
        <textarea
          className="w-full h-24 px-2 py-1 text-black rounded"
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          placeholder="Paste layout JSON"
        />
        {importError && <div className="text-red-300">{importError}</div>}
        <button
          type="button"
          className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded"
          onClick={handleImport}
        >
          Import & Play
        </button>
      </div>
      <div className="flex space-x-2 text-xs text-gray-300">
        <button
          type="button"
          onClick={onReset}
          className="px-3 py-1 bg-red-700 hover:bg-red-600 rounded"
        >
          Reset Progress
        </button>
      </div>
    </div>
  );
}
