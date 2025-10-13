import { useCallback } from 'react';

const prefix = 'game-slot:';

/**
 * Helper for saving and loading named save slots using localStorage.
 */
export default function useSaveSlots(gameId: string) {
  const makeKey = useCallback((name: string) => `${prefix}${gameId}:${name}`, [gameId]);

  const save = useCallback(
    (name: string, data: unknown) => {
      localStorage.setItem(makeKey(name), JSON.stringify(data));
    },
    [makeKey],
  );

  const load = useCallback(
    (name: string) => {
      const raw = localStorage.getItem(makeKey(name));
      return raw ? JSON.parse(raw) : null;
    },
    [makeKey],
  );

  const remove = useCallback(
    (name: string) => {
      localStorage.removeItem(makeKey(name));
    },
    [makeKey],
  );

  const list = useCallback(() => {
    const keys = Object.keys(localStorage).filter((k) => k.startsWith(`${prefix}${gameId}:`));
    return keys.map((k) => k.split(':').pop() as string);
  }, [gameId]);

  return { save, load, remove, list };
}
