import { useState, useEffect } from 'react';

/**
 * Persist state in the Origin Private File System.
 * @param path File path within OPFS
 * @param initial Initial value
 */
export default function useOPFS<T>(path: string, initial: T) {
  const [state, setState] = useState<T>(initial);

  useEffect(() => {
    let cancelled = false;
    if (typeof window === 'undefined' || !(navigator as any).storage?.getDirectory) {
      return;
    }
    (async () => {
      try {
        const root = await (navigator as any).storage.getDirectory();
        const handle = await root.getFileHandle(path);
        const file = await handle.getFile();
        const text = await file.text();
        const parsed = JSON.parse(text);
        if (!cancelled) setState(parsed);
      } catch {
        // ignore missing file or parse errors
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [path]);

  useEffect(() => {
    if (typeof window === 'undefined' || !(navigator as any).storage?.getDirectory) {
      return;
    }
    (async () => {
      try {
        const root = await (navigator as any).storage.getDirectory();
        const handle = await root.getFileHandle(path, { create: true });
        const writable = await handle.createWritable();
        await writable.write(JSON.stringify(state));
        await writable.close();
      } catch {
        // ignore write errors
      }
    })();
  }, [path, state]);

  return [state, setState] as const;
}
