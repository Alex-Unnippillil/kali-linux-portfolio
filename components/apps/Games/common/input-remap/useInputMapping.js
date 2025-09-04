import { useState, useEffect } from 'react';

const cache = {};

const normalize = (mapping = {}) => {
  const res = {};
  Object.entries(mapping).forEach(([action, val]) => {
    if (typeof val === 'string') res[action] = { key: val };
    else res[action] = { ...val };
  });
  return res;
};

export const getMapping = (gameId, defaults = {}) => {
  const norm = normalize(defaults);
  return cache[gameId] ? { ...norm, ...cache[gameId] } : norm;
};

async function readMapping(gameId, defaults) {
  try {
    const root = await navigator.storage.getDirectory();
    const dir = await root.getDirectoryHandle('controls', { create: true });
    const file = await dir.getFileHandle(`${gameId}.json`);
    const data = await file.getFile();
    const json = normalize(JSON.parse(await data.text()));
    cache[gameId] = json;
    return { ...normalize(defaults), ...json };
  } catch {
    return normalize(defaults);
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
  const normDefaults = normalize(defaults);
  const [mapping, setMapping] = useState(normDefaults);

  useEffect(() => {
    let active = true;
    if (navigator.storage?.getDirectory) {
      readMapping(gameId, normDefaults).then((m) => {
        if (active) setMapping(m);
      });
    }
    return () => {
      active = false;
    };
  }, [gameId, normDefaults]);

  const setBinding = (action, bind) => {
    let conflict = null;
    setMapping((prev) => {
      const next = { ...prev };
      if (bind.key !== undefined) {
        Object.keys(next).forEach((a) => {
          if (a !== action && next[a].key === bind.key) {
            conflict = a;
            next[a] = { ...next[a], key: undefined };
          }
        });
        next[action] = { ...next[action], key: bind.key };
      }
      if (bind.pad !== undefined) {
        Object.keys(next).forEach((a) => {
          if (a !== action && next[a].pad === bind.pad) {
            conflict = a;
            next[a] = { ...next[a], pad: undefined };
          }
        });
        next[action] = { ...next[action], pad: bind.pad };
      }
      writeMapping(gameId, next);
      return next;
    });
    return conflict;
  };

  return [mapping, setBinding];
}
