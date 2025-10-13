"use client";

import { useState, useEffect, useCallback } from 'react';

// Persist JSON data in the Origin Private File System.
export default function useOPFS(name, initialValue) {
  const [value, setValue] = useState(initialValue);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!navigator.storage?.getDirectory) {
        setReady(true);
        return;
      }
      try {
        const root = await navigator.storage.getDirectory();
        try {
          const handle = await root.getFileHandle(name);
          const file = await handle.getFile();
          const text = await file.text();
          if (active) setValue(JSON.parse(text));
        } catch {
          const handle = await root.getFileHandle(name, { create: true });
          const writable = await handle.createWritable();
          await writable.write(JSON.stringify(initialValue));
          await writable.close();
        }
      } catch {}
      if (active) setReady(true);
    };
    load();
    return () => {
      active = false;
    };
  }, [name, initialValue]);

  const save = useCallback(
    async (v) => {
      setValue(v);
      if (!navigator.storage?.getDirectory) return;
      try {
        const root = await navigator.storage.getDirectory();
        const handle = await root.getFileHandle(name, { create: true });
        const writable = await handle.createWritable();
        await writable.write(JSON.stringify(v));
        await writable.close();
      } catch {}
    },
    [name],
  );

  return [value, save, ready];
}

