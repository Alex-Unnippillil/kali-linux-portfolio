import { useState, useEffect } from 'react';

const cache = {};

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

  useEffect(() => {
    let active = true;
    if (navigator.storage?.getDirectory) {
      readMapping(gameId, defaults).then((m) => {
        if (active) setMapping(m);
      });
    }
    return () => {
      active = false;
    };
  }, [gameId, defaults]);

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
      writeMapping(gameId, next);
      return next;
    });
    return conflict;
  };

  return [mapping, setKey];
}
