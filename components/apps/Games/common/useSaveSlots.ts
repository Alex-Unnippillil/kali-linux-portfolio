import { useCallback } from 'react';

const prefix = 'game-slot:';

/**
 * Helper for saving and loading named save slots using localStorage.
 *
 * All operations are wrapped in try/catch so games keep working even when
 * storage is unavailable (privacy mode, blocked third-party storage, etc).
 */
export default function useSaveSlots(gameId: string) {
  const makeKey = useCallback(
    (name: string) => `${prefix}${gameId}:${name}`,
    [gameId],
  );

  const save = useCallback(
    (name: string, data: unknown) => {
      try {
        localStorage.setItem(makeKey(name), JSON.stringify(data));
      } catch {
        // ignore storage errors
      }
    },
    [makeKey],
  );

  const load = useCallback(
    (name: string) => {
      try {
        const raw = localStorage.getItem(makeKey(name));
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    },
    [makeKey],
  );

  const remove = useCallback(
    (name: string) => {
      try {
        localStorage.removeItem(makeKey(name));
      } catch {
        // ignore
      }
    },
    [makeKey],
  );

  const list = useCallback(() => {
    try {
      const keys = Object.keys(localStorage).filter((k) =>
        k.startsWith(`${prefix}${gameId}:`),
      );
      return keys.map((k) => k.split(':').pop() as string);
    } catch {
      return [] as string[];
    }
  }, [gameId]);

  return { save, load, remove, list };
}
