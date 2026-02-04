import { useCallback, useEffect, useMemo, useState } from 'react';
import useOPFS from '../../../hooks/useOPFS';

export interface TerminalPrefs {
  safeMode: boolean;
  fontSize: number;
  scrollback: number;
  screenReaderMode: boolean;
}

export interface TerminalPersistence {
  prefs: TerminalPrefs;
  setPrefs: (next: TerminalPrefs) => void;
  history: string[];
  setHistory: (next: string[]) => void;
  aliases: Record<string, string>;
  setAliases: (next: Record<string, string>) => void;
  scripts: Record<string, string>;
  setScripts: (next: Record<string, string>) => void;
  ready: boolean;
}

const DEFAULT_PREFS: TerminalPrefs = {
  safeMode: true,
  fontSize: 15,
  scrollback: 1200,
  screenReaderMode: false,
};

const readLocal = <T,>(key: string, fallback: T): T => {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const writeLocal = (key: string, value: unknown) => {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
};

export const useTerminalPreferences = (): TerminalPersistence => {
  const { root } = useOPFS();
  const [ready, setReady] = useState(false);
  const [prefs, setPrefs] = useState<TerminalPrefs>(DEFAULT_PREFS);
  const [history, setHistory] = useState<string[]>([]);
  const [aliases, setAliases] = useState<Record<string, string>>({});
  const [scripts, setScripts] = useState<Record<string, string>>({});

  const loadFromOpfs = useCallback(
    async (name: string) => {
      if (!root) return null;
      try {
        const dir = await root.getDirectoryHandle('kali-terminal', { create: true });
        const handle = await dir.getFileHandle(name, { create: false });
        const file = await handle.getFile();
        return await file.text();
      } catch {
        return null;
      }
    },
    [root],
  );

  const writeToOpfs = useCallback(
    async (path: string, value: unknown) => {
      if (!root) return;
      try {
        const dir = await root.getDirectoryHandle('kali-terminal', { create: true });
        const handle = await dir.getFileHandle(path, { create: true });
        const writable = await handle.createWritable();
        await writable.write(JSON.stringify(value));
        await writable.close();
      } catch {
        // ignore
      }
    },
    [root],
  );

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (root) {
        const prefsRaw = await loadFromOpfs('prefs.json');
        const historyRaw = await loadFromOpfs('history.json');
        const aliasRaw = await loadFromOpfs('aliases.json');
        const scriptsRaw = await loadFromOpfs('scripts.json');
        if (!mounted) return;
        if (prefsRaw) setPrefs({ ...DEFAULT_PREFS, ...(JSON.parse(prefsRaw) as TerminalPrefs) });
        if (historyRaw) setHistory(JSON.parse(historyRaw));
        if (aliasRaw) setAliases(JSON.parse(aliasRaw));
        if (scriptsRaw) setScripts(JSON.parse(scriptsRaw));
        setReady(true);
        return;
      }
      if (!mounted) return;
      setPrefs({ ...DEFAULT_PREFS, ...readLocal('kali-terminal-prefs', DEFAULT_PREFS) });
      setHistory(readLocal('kali-terminal-history', [] as string[]));
      setAliases(readLocal('kali-terminal-aliases', {} as Record<string, string>));
      setScripts(readLocal('kali-terminal-scripts', {} as Record<string, string>));
      setReady(true);
    };
    load();
    return () => {
      mounted = false;
    };
  }, [loadFromOpfs, root]);

  useEffect(() => {
    if (!ready) return;
    if (root) {
      void writeToOpfs('prefs.json', prefs);
      void writeToOpfs('history.json', history);
      void writeToOpfs('aliases.json', aliases);
      void writeToOpfs('scripts.json', scripts);
      return;
    }
    writeLocal('kali-terminal-prefs', prefs);
    writeLocal('kali-terminal-history', history);
    writeLocal('kali-terminal-aliases', aliases);
    writeLocal('kali-terminal-scripts', scripts);
  }, [aliases, history, prefs, ready, root, scripts, writeToOpfs]);

  return useMemo(
    () => ({
      prefs,
      setPrefs,
      history,
      setHistory,
      aliases,
      setAliases,
      scripts,
      setScripts,
      ready,
    }),
    [aliases, history, prefs, ready, scripts],
  );
};
