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

const normalizeKey = (event) => {
  if (event.key === ' ' || event.code === 'Space') return 'Space';
  return event.key;
};

// Keyboard input handler that respects user remapping. It emits high level
// actions like `up`/`down`/`pause` instead of raw keyboard events. A `game`
// identifier can be provided to scope bindings per game.
/**
 * @typedef {'up' | 'down' | 'left' | 'right' | 'action' | 'pause' | 'restart'} GameInputAction
 */
/**
 * @typedef {{ action: GameInputAction; type: string }} GameInputPayload
 */
/**
 * @param {{ onInput?: (event: GameInputPayload) => void; game?: string; isFocused?: boolean }} options
 */
export default function useGameInput({ onInput, game, isFocused = true } = {}) {
  const mapRef = useRef(DEFAULT_MAP);

  useEffect(() => {
    const key = game ? `${game}:keymap` : 'game-keymap';
    const loadMap = () => {
      try {
        const stored = window.localStorage.getItem(key);
        mapRef.current = stored
          ? { ...DEFAULT_MAP, ...JSON.parse(stored) }
          : DEFAULT_MAP;
      } catch {
        mapRef.current = DEFAULT_MAP;
      }
    };

    const handleKeymapUpdated = (event) => {
      if (event?.detail?.game === game) {
        loadMap();
      }
    };

    const handleStorage = (event) => {
      if (event.key === key) {
        loadMap();
      }
    };

    loadMap();
    window.addEventListener('game-keymap-updated', handleKeymapUpdated);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('game-keymap-updated', handleKeymapUpdated);
      window.removeEventListener('storage', handleStorage);
    };
  }, [game]);

  useEffect(() => {
    const handle = (e) => {
      if (!shouldHandleGameKey(e, { isFocused })) return;
      const map = mapRef.current;
      const incomingKey = normalizeKey(e);
      const action = Object.keys(map).find((k) => map[k] === incomingKey);
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
  }, [onInput, isFocused]);
}
