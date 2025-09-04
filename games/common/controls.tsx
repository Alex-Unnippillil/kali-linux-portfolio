"use client";

import React, { useEffect, useRef, useState } from 'react';
import usePersistentState from '../../hooks/usePersistentState';
import useGameInput from '../../hooks/useGameInput';

const DEFAULT_MAP = {
  up: 'ArrowUp',
  down: 'ArrowDown',
  left: 'ArrowLeft',
  right: 'ArrowRight',
  action: 'Space',
  pause: 'Escape',
};

type Action = keyof typeof DEFAULT_MAP;

type InputEvent = {
  action: Action;
  type: string;
};

type ControlsProps = {
  onInput?: (e: InputEvent) => void;
  onContrastChange?: (enabled: boolean) => void;
};

export default function Controls({ onInput, onContrastChange }: ControlsProps) {
  const storageKey =
    typeof window !== 'undefined'
      ? `game-keymap:${window.location.pathname}`
      : 'game-keymap';
  const [keymap, setKeymap] = usePersistentState<Record<Action, string>>(
    storageKey,
    DEFAULT_MAP,
  );
  const [highContrast, setHighContrast] = usePersistentState<boolean>(
    'game-high-contrast',
    false,
  );
  const [remapping, setRemapping] = useState<Action | null>(null);
  const [message, setMessage] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useGameInput({ onInput });

  useEffect(() => {
    onContrastChange && onContrastChange(highContrast);
  }, [highContrast, onContrastChange]);

  useEffect(() => {
    if (!remapping) return;
    const handler = (e: KeyboardEvent) => {
      e.preventDefault();
      const next = { ...keymap, [remapping]: e.key } as Record<Action, string>;
      setKeymap(next);
      setRemapping(null);
      setMessage(`${remapping} mapped to ${e.key}`);
    };
    window.addEventListener('keydown', handler, { once: true });
    return () => window.removeEventListener('keydown', handler);
  }, [remapping, keymap, setKeymap]);

  const startRemap = (action: Action) => setRemapping(action);

  const handleTouch = (action: Action) => () => {
    onInput && onInput({ action, type: 'touch' });
    setMessage(`${action} activated`);
  };

  const handleImportClick = () => fileRef.current?.click();

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        const next = { ...DEFAULT_MAP, ...parsed } as Record<Action, string>;
        setKeymap(next);
        setMessage('Keymap imported');
      } catch {
        setMessage('Invalid keymap file');
      }
    };
    reader.readAsText(file);
  };

  const resetMapping = () => {
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      /* ignore */
    }
    setKeymap(DEFAULT_MAP);
    setMessage('Keymap reset to defaults');
  };

  const toggleContrast = (e: React.ChangeEvent<HTMLInputElement>) => {
    setHighContrast(e.target.checked);
    setMessage(
      `High contrast ${e.target.checked ? 'enabled' : 'disabled'}`,
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(Object.keys(DEFAULT_MAP) as Action[]).map((action) => (
          <button
            key={action}
            onClick={() => startRemap(action)}
            className="px-2 py-1 border rounded"
            aria-pressed={remapping === action}
          >
            {remapping === action
              ? `Press key for ${action}`
              : `${action}: ${keymap[action]}`}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {(Object.keys(DEFAULT_MAP) as Action[]).map((action) => (
          <button
            key={action}
            onClick={handleTouch(action)}
            className="px-4 py-2 border rounded"
            aria-label={action}
          >
            {action}
          </button>
        ))}
      </div>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={highContrast}
          onChange={toggleContrast}
        />
        <span>High contrast tiles</span>
      </label>
      <div className="flex gap-2">
        <button
          onClick={handleImportClick}
          className="px-2 py-1 border rounded"
        >
          Import Mapping
        </button>
        <button
          onClick={resetMapping}
          className="px-2 py-1 border rounded"
        >
          Reset Mapping
        </button>
        <input
          type="file"
          accept="application/json"
          ref={fileRef}
          onChange={handleImport}
          className="hidden"
          data-testid="import-file"
        />
      </div>
      <div className="sr-only" aria-live="polite">
        {message}
      </div>
    </div>
  );
}

