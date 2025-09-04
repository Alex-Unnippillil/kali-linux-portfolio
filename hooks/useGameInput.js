"use client";

import { useEffect, useRef } from 'react';

// Default keyboard mapping. Users can override via settings stored in
// localStorage under a per-game key.
const DEFAULT_MAP = {
  up: 'ArrowUp',
  down: 'ArrowDown',
  left: 'ArrowLeft',
  right: 'ArrowRight',
  action: 'Space',
  pause: 'Escape',
};

// Keyboard input handler that respects user remapping. It emits high level
// actions like `up`/`down`/`pause` instead of raw keyboard events.
export default function useGameInput({ onInput } = {}) {
  const mapRef = useRef(DEFAULT_MAP);

  // Determine storage key based on current path so each game has its own map
  const key =
    typeof window !== 'undefined'
      ? `game-keymap:${window.location.pathname}`
      : 'game-keymap';

  // Load mapping once on mount
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(key);
      if (stored) {
        mapRef.current = { ...DEFAULT_MAP, ...JSON.parse(stored) };
      }
    } catch {
      /* ignore */
    }
  }, [key]);

  useEffect(() => {
    const handle = (e) => {
      const map = mapRef.current;
      const action = Object.keys(map).find((k) => map[k] === e.key);
      if (action && onInput) {
        onInput({ action, type: e.type });
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handle);
    window.addEventListener('keyup', handle);
    return () => {
      window.removeEventListener('keydown', handle);
      window.removeEventListener('keyup', handle);
    };
  }, [onInput]);
}
