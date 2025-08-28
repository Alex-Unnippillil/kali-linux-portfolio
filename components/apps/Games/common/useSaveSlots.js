import { useCallback } from 'react';
const prefix = 'game-slot:';
/**
 * Helper for saving and loading named save slots using localStorage.
 */
export default function useSaveSlots(gameId) {
    const makeKey = useCallback((name) => `${prefix}${gameId}:${name}`, [gameId]);
    const save = useCallback((name, data) => {
        localStorage.setItem(makeKey(name), JSON.stringify(data));
    }, [makeKey]);
    const load = useCallback((name) => {
        const raw = localStorage.getItem(makeKey(name));
        return raw ? JSON.parse(raw) : null;
    }, [makeKey]);
    const remove = useCallback((name) => {
        localStorage.removeItem(makeKey(name));
    }, [makeKey]);
    const list = useCallback(() => {
        const keys = Object.keys(localStorage).filter((k) => k.startsWith(`${prefix}${gameId}:`));
        return keys.map((k) => k.split(':').pop());
    }, [gameId]);
    return { save, load, remove, list };
}
