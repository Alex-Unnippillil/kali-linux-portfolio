import { useEffect } from 'react';
import usePersistedState from '../../../../../hooks/usePersistedState';

export const getMapping = (gameId, defaults = {}) => {
  if (typeof window === 'undefined') return defaults;
  try {
    const raw = window.localStorage.getItem(`controls:${gameId}`);
    return raw ? { ...defaults, ...JSON.parse(raw) } : defaults;
  } catch {
    return defaults;
  }
};

async function saveProfile(gameId, mapping) {
  try {
    const root = await navigator.storage.getDirectory();
    const dir = await root.getDirectoryHandle('controls', { create: true });
    const file = await dir.getFileHandle(`${gameId}.json`, { create: true });
    const writable = await file.createWritable();
    await writable.write(JSON.stringify(mapping));
    await writable.close();
  } catch {}
}

export async function loadProfile(gameId, defaults = {}) {
  if (typeof window === 'undefined') return defaults;
  try {
    const root = await navigator.storage.getDirectory();
    const dir = await root.getDirectoryHandle('controls');
    const file = await dir.getFileHandle(`${gameId}.json`);
    const data = await file.getFile();
    const mapping = JSON.parse(await data.text());
    const merged = { ...defaults, ...mapping };
    window.localStorage.setItem(`controls:${gameId}`, JSON.stringify(merged));
    return merged;
  } catch {
    return getMapping(gameId, defaults);
  }
}

export default function useInputMapping(gameId, defaults = {}) {
  const [mapping, setMapping] = usePersistedState(
    `controls:${gameId}`,
    getMapping(gameId, defaults),
  );

  const setKey = (action, key) => {
    let conflict = null;
    setMapping((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((a) => {
        if (a !== action && next[a] === key) {
          conflict = a;
          delete next[a];
        }
      });
      next[action] = key;
      return next;
    });
    return conflict;
  };

  useEffect(() => {
    loadProfile(gameId, defaults).then((m) => setMapping(m));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId]);

  useEffect(() => {
    saveProfile(gameId, mapping);
  }, [gameId, mapping]);
  return [mapping, setKey, setMapping];
}
