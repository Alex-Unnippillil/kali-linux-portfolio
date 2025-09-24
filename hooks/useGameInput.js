"use client";

import { useEffect, useRef } from 'react';
import useInputMapping from '../components/apps/Games/common/input-remap/useInputMapping';

// Default keyboard mapping. Users can override via persistent storage scoped per game.
const DEFAULT_MAP = {
  up: 'ArrowUp',
  down: 'ArrowDown',
  left: 'ArrowLeft',
  right: 'ArrowRight',
  action: 'Space',
  pause: 'Escape',
};

export const matchesKey = (binding, event) => {
  if (!binding) return false;
  const normalized = binding.toLowerCase();
  const key = event.key.toLowerCase();
  const code = event.code?.toLowerCase?.() ?? '';
  if (normalized === key || normalized === code) return true;
  if (binding === ' ' && code === 'space') return true;
  if (binding === 'Space' && event.key === ' ') return true;
  return false;
};

// Keyboard input handler that respects user remapping. It emits high level
// actions like `up`/`down`/`pause` instead of raw keyboard events. A `game`
// identifier can be provided to scope bindings per game.
export default function useGameInput({ onInput, game } = {}) {
  const mapId = game || 'global';
  const [mapping] = useInputMapping(mapId, DEFAULT_MAP);
  const mapRef = useRef({ ...DEFAULT_MAP });

  useEffect(() => {
    mapRef.current = { ...DEFAULT_MAP, ...mapping };
  }, [mapping]);

  useEffect(() => {
    const handle = (e) => {
      const map = mapRef.current;
      const action = Object.keys(map).find((k) => matchesKey(map[k], e));
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
