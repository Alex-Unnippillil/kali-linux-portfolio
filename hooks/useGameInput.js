"use client";

import { useEffect, useRef } from 'react';
import { consumeGameKey, shouldHandleGameKey } from '../utils/gameInput';

// Default keyboard mapping. Users can override via settings stored in
// localStorage under a `:keymap` key namespaced per game.
const DEFAULT_MAP = {
  up: 'ArrowUp',
  down: 'ArrowDown',
  left: 'ArrowLeft',
  right: 'ArrowRight',
  action: 'Space',
  pause: 'Escape',
};

// Keyboard input handler that respects user remapping. It emits high level
// actions like `up`/`down`/`pause` instead of raw keyboard events. A `game`
// identifier can be provided to scope bindings per game.
export default function useGameInput({ onInput, game, isFocused = true } = {}) {
  const mapRef = useRef(DEFAULT_MAP);

  // Load mapping once on mount or when game changes
  useEffect(() => {
    const key = game ? `${game}:keymap` : 'game-keymap';
    try {
      const stored = window.localStorage.getItem(key);
      if (stored) {
        mapRef.current = { ...DEFAULT_MAP, ...JSON.parse(stored) };
      }
    } catch {
      /* ignore */
    }
  }, [game]);

  useEffect(() => {
    const handle = (e) => {
      if (!shouldHandleGameKey(e, { isFocused })) return;
      const map = mapRef.current;
      const action = Object.keys(map).find((k) => map[k] === e.key);
      if (action && onInput) {
        onInput({ action, type: e.type });
        consumeGameKey(e);
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
