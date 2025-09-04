"use client";

import React, { useEffect, useState } from 'react';
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
  game: string;
  onInput?: (e: InputEvent) => void;
  onContrastChange?: (enabled: boolean) => void;
};

export default function Controls({ game, onInput, onContrastChange }: ControlsProps) {
  const [keymap, setKeymap] = usePersistentState<Record<Action, string>>(
    `${game}:keymap`,
    DEFAULT_MAP,
  );
  const [highContrast, setHighContrast] = usePersistentState<boolean>(
    `${game}:high-contrast`,
    false,
  );
  const [remapping, setRemapping] = useState<Action | null>(null);
  const [message, setMessage] = useState('');

  useGameInput({ onInput, game });

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
      <div className="sr-only" aria-live="polite">
        {message}
      </div>
    </div>
  );
}

