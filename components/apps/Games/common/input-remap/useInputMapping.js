import { useState, useEffect, useCallback } from 'react';

const cache = {};

const detectConflicts = (mapping) => {
  const conflicts = {};
  Object.entries(mapping).forEach(([action, key]) => {
    if (!key) return;
    if (!conflicts[key]) {
      conflicts[key] = [action];
    } else {
      conflicts[key].push(action);
    }
  });
  return Object.fromEntries(
    Object.entries(conflicts).filter(([, actions]) => actions.length > 1),
  );
};

export const getMapping = (gameId, defaults = {}) =>
  cache[gameId] ? { ...defaults, ...cache[gameId] } : defaults;

async function readMapping(gameId, defaults) {
  try {
    const root = await navigator.storage.getDirectory();
    const dir = await root.getDirectoryHandle('controls', { create: true });
    const file = await dir.getFileHandle(`${gameId}.json`);
    const data = await file.getFile();
    const json = JSON.parse(await data.text());
    cache[gameId] = json;
    return { ...defaults, ...json };
  } catch {
    return defaults;
  }
}

async function writeMapping(gameId, mapping) {
  try {
    const root = await navigator.storage.getDirectory();
    const dir = await root.getDirectoryHandle('controls', { create: true });
    const file = await dir.getFileHandle(`${gameId}.json`, { create: true });
    const writable = await file.createWritable();
    await writable.write(JSON.stringify(mapping));
    await writable.close();
    cache[gameId] = mapping;
  } catch {
    // ignore write errors
  }
}

export default function useInputMapping(gameId, defaults = {}) {
  const [mapping, setMapping] = useState(defaults);
  const [conflicts, setConflicts] = useState({});

  const applyMapping = useCallback(
    (updater) => {
      let nextState = {};
      setMapping((prev) => {
        const result =
          typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
        nextState = { ...result };
        cache[gameId] = nextState;
        setConflicts(detectConflicts(nextState));
        writeMapping(gameId, nextState);
        return nextState;
      });
      return nextState;
    },
    [gameId],
  );

  useEffect(() => {
    let active = true;
    if (navigator.storage?.getDirectory) {
      readMapping(gameId, defaults).then((m) => {
        if (!active) return;
        cache[gameId] = m;
        setMapping(m);
        setConflicts(detectConflicts(m));
      });
    } else if (active) {
      cache[gameId] = defaults;
      setMapping(defaults);
      setConflicts(detectConflicts(defaults));
    }
    return () => {
      active = false;
    };
  }, [gameId, defaults]);

  const setKey = (action, key) => {
    let conflictActions = [];
    applyMapping((prev) => {
      const next = { ...prev, [action]: key };
      conflictActions = Object.keys(prev).filter(
        (a) => a !== action && prev[a] === key,
      );
      return next;
    });
    return conflictActions;
  };

  const exportMapping = () => JSON.stringify(mapping, null, 2);

  const importMapping = (payload) => {
    try {
      const data =
        typeof payload === 'string' ? JSON.parse(payload) : { ...payload };
      if (!data || typeof data !== 'object') {
        return { ok: false, error: 'Mapping file must be a JSON object.' };
      }
      const allowed = new Set([
        ...Object.keys(defaults),
        ...Object.keys(mapping),
      ]);
      const updates = {};
      Object.entries(data).forEach(([action, value]) => {
        if (typeof value !== 'string') return;
        if (allowed.size === 0 || allowed.has(action)) {
          updates[action] = value;
        }
      });
      if (Object.keys(updates).length === 0) {
        return { ok: false, error: 'No known actions found in mapping file.' };
      }
      const nextMapping = applyMapping((prev) => ({ ...prev, ...updates }));
      const conflictMap = detectConflicts(nextMapping);
      return { ok: true, conflicts: conflictMap };
    } catch (error) {
      return { ok: false, error: 'Unable to read mapping file.' };
    }
  };

  return [mapping, setKey, { conflicts, exportMapping, importMapping }];
}
