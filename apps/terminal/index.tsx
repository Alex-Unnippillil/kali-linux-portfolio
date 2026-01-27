'use client';

import '@xterm/xterm/css/xterm.css';
import React, {
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
  useCallback,
  useMemo,
} from 'react';
import { useTab } from '../../components/ui/TabbedWindow';
import useOPFS from '../../hooks/useOPFS';
import commandRegistry, { CommandContext, CommandDefinition, getCommandList } from './commands';
import TerminalContainer from './components/Terminal';
import { createSessionManager } from './utils/sessionManager';
import { DEFAULT_HOME_PATH, fileSystemStore } from '../../stores/fileSystemStore';

const CopyIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    width={24}
    height={24}
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <rect x={9} y={9} width={13} height={13} rx={2} ry={2} />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const PasteIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    width={24}
    height={24}
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M8 5H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
    <rect x={9} y={2} width={6} height={4} rx={1} />
  </svg>
);

const SettingsIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    width={24}
    height={24}
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <circle cx={12} cy={12} r={3} />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.06a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.06a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.06a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const SETTINGS_KEY = 'terminal-settings';
const HISTORY_FILE = 'history.txt';
const COMMAND_HISTORY_KEY = 'terminal-command-history';

export interface TerminalProps {
  openApp?: (id: string) => void;
}

export interface TerminalHandle {
  runCommand: (cmd: string) => void;
  getContent: () => string;
}

const files: Record<string, string> = {
  'README.md': 'Welcome to the web terminal.\nThis is a fake file used for demos.',
};

const TerminalApp = forwardRef<TerminalHandle, TerminalProps>(({ openApp }, ref) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const termRef = useRef<any>(null);
  const fitRef = useRef<any>(null);
  const searchRef = useRef<any>(null);
  const contentRef = useRef('');
  const commandList = useMemo(() => getCommandList(), []);
  const registryRef = useRef<Record<string, CommandDefinition>>(commandRegistry);
  const workerRef = useRef<Worker | null>(null);
  const pendingWorkerResolveRef = useRef<(() => void) | null>(null);
  const filesRef = useRef<Record<string, string>>(files);
  const aliasesRef = useRef<Record<string, string>>({});
  const historyRef = useRef<string[]>([]);
  const safeModeRef = useRef(true);
  const [safeMode, setSafeMode] = useState(true);
  const [persistHistory, setPersistHistory] = useState(false);
  const [copyStatus, setCopyStatus] = useState('');
  const settingsLoadedRef = useRef(false);
  const historyLoadedRef = useRef(false);
  const cwdRef = useRef(DEFAULT_HOME_PATH);
  const contextRef = useRef<CommandContext>({
    writeLine: () => {},
    files: filesRef.current,
    history: historyRef.current,
    aliases: aliasesRef.current,
    safeMode: safeModeRef.current,
    cwd: cwdRef.current,
    setCwd: (path) => {
      cwdRef.current = path;
      contextRef.current.cwd = path;
    },
    setAlias: (n, v) => {
      aliasesRef.current[n] = v;
    },
    runWorker: async () => {},
    clear: () => {},
    openApp,
    listCommands: () => Object.values(registryRef.current),
    vfs: {
      resolvePath: (path: string, nextCwd?: string) =>
        fileSystemStore.getState().resolvePath(path, nextCwd),
      listDirectory: (path: string) =>
        fileSystemStore.getState().listDirectory(path),
      getEntry: (path: string) =>
        fileSystemStore.getState().getEntry(path),
      createDirectory: (path: string, options) =>
        fileSystemStore.getState().createDirectory(path, options),
      createFile: (path: string, content, options) =>
        fileSystemStore.getState().createFile(path, content, options),
      writeFile: (path: string, content: string, options) =>
        fileSystemStore.getState().writeFile(path, content, options),
      readFile: (path: string, options) =>
        fileSystemStore.getState().readFile(path, options),
      removePath: (path: string, options) =>
        fileSystemStore.getState().removePath(path, options),
    },
  });
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteInput, setPaletteInput] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { supported: opfsSupported, getDir, readFile, writeFile, deleteFile } =
    useOPFS();
  const tab = useTab();
  const dirRef = useRef<FileSystemDirectoryHandle | null>(null);
  const [overflow, setOverflow] = useState({ top: false, bottom: false });
  const ansiColors = [
    '#000000',
    '#AA0000',
    '#00AA00',
    '#AA5500',
    '#0000AA',
    '#AA00AA',
    '#00AAAA',
    '#AAAAAA',
    '#555555',
    '#FF5555',
    '#55FF55',
    '#FFFF55',
    '#5555FF',
    '#FF55FF',
    '#55FFFF',
    '#FFFFFF',
  ];

  const persistTranscript = useCallback(
    async (value: string) => {
      if (!persistHistory) return;
      try {
        if (opfsSupported && dirRef.current) {
          await writeFile(HISTORY_FILE, value, dirRef.current);
        } else if (typeof window !== 'undefined') {
          window.localStorage.setItem(HISTORY_FILE, value);
        }
      } catch {}
    },
    [persistHistory, opfsSupported, writeFile],
  );

  const persistCommandHistory = useCallback(
    async (history: string[]) => {
      if (!persistHistory) return;
      try {
        if (opfsSupported && dirRef.current) {
          await writeFile(COMMAND_HISTORY_KEY, JSON.stringify(history), dirRef.current);
        } else if (typeof window !== 'undefined') {
          window.localStorage.setItem(COMMAND_HISTORY_KEY, JSON.stringify(history));
        }
      } catch {}
    },
    [persistHistory, opfsSupported, writeFile],
  );

  const restoreHistory = useCallback(async () => {
    if (!persistHistory || historyLoadedRef.current) return;
    historyLoadedRef.current = true;
    if (opfsSupported && !dirRef.current) {
      dirRef.current = await getDir('terminal');
    }
    let transcript = '';
    let commandHistory: string[] = [];
    try {
      if (opfsSupported && dirRef.current) {
        transcript = (await readFile(HISTORY_FILE, dirRef.current)) || '';
        const savedHistory = await readFile(COMMAND_HISTORY_KEY, dirRef.current);
        if (savedHistory) commandHistory = JSON.parse(savedHistory);
      } else if (typeof window !== 'undefined') {
        transcript = window.localStorage.getItem(HISTORY_FILE) || '';
        const saved = window.localStorage.getItem(COMMAND_HISTORY_KEY);
        if (saved) commandHistory = JSON.parse(saved);
      }
    } catch {}

    if (transcript && termRef.current) {
      const historyColor = '\x1b[38;2;206;214;227m';
      const reset = '\x1b[0m';
      transcript
        .split('\n')
        .filter(Boolean)
        .forEach((l) => {
          if (termRef.current)
            termRef.current.writeln(/\x1b\[[0-9;]*m/.test(l) ? l : `${historyColor}${l}${reset}`);
        });
      contentRef.current = transcript.endsWith('\n') ? transcript : `${transcript}\n`;
    }
    if (commandHistory.length) {
      historyRef.current = commandHistory;
    }
  }, [getDir, opfsSupported, persistHistory, readFile]);

  const updateOverflow = useCallback(() => {
    const term = termRef.current;
    if (!term || !term.buffer) return;
    const { viewportY, baseY } = term.buffer.active;
    setOverflow({ top: viewportY > 0, bottom: viewportY < baseY });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || settingsLoadedRef.current) return;
    const stored = window.localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSafeMode(parsed.safeMode ?? true);
        safeModeRef.current = parsed.safeMode ?? true;
        setPersistHistory(parsed.persistHistory ?? false);
      } catch {}
    }
    settingsLoadedRef.current = true;
  }, []);

  useEffect(() => {
    safeModeRef.current = safeMode;
    contextRef.current.safeMode = safeModeRef.current;
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify({ safeMode: safeModeRef.current, persistHistory }),
      );
    }
  }, [persistHistory, safeMode]);

  const writeLine = useCallback(
    (text: string) => {
      const historyColor = '\x1b[38;2;206;214;227m';
      const reset = '\x1b[0m';
      const hasAnsi = /\x1b\[[0-9;]*m/.test(text);
      const content =
        text.length === 0 ? '' : hasAnsi ? text : `${historyColor}${text}${reset}`;
      if (termRef.current) termRef.current.writeln(content);
      contentRef.current += `${text}\n`;
      void persistTranscript(contentRef.current);
      updateOverflow();
    },
    [persistTranscript, updateOverflow],
  );

  useEffect(() => {
    if (!persistHistory) {
      historyLoadedRef.current = false;
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(HISTORY_FILE);
        window.localStorage.removeItem(COMMAND_HISTORY_KEY);
      }
      if (opfsSupported && dirRef.current) {
        deleteFile(HISTORY_FILE, dirRef.current);
        deleteFile(COMMAND_HISTORY_KEY, dirRef.current);
      }
      return;
    }
    if (termRef.current) {
      void restoreHistory();
    }
  }, [deleteFile, opfsSupported, persistHistory, restoreHistory]);

  contextRef.current.writeLine = writeLine;
  contextRef.current.cwd = cwdRef.current;

  const prompt = useCallback(() => {
    if (!termRef.current) return;
    const accent = '\x1b[38;2;125;196;255m';
    const userColor = '\x1b[38;2;166;227;161m';
    const hostColor = '\x1b[38;2;148;196;255m';
    const pathColor = '\x1b[38;2;248;196;108m';
    const symbolColor = '\x1b[38;2;234;241;252m';
    const reset = '\x1b[0m';
    const currentCwd = cwdRef.current;
    const displayPath = currentCwd.startsWith(DEFAULT_HOME_PATH)
      ? `~${currentCwd.slice(DEFAULT_HOME_PATH.length) || ''}`
      : currentCwd;
    termRef.current.writeln(
      `${accent}┌──(${reset}${userColor}kali${reset}${accent}㉿${reset}${hostColor}kali${reset}${accent})-[${reset}${pathColor}${displayPath}${reset}${accent}]${reset}`,
    );
    termRef.current.write(`${accent}└─${reset} ${symbolColor}$${reset} `);
  }, []);

  const createWorker = useCallback(() => {
    if (typeof Worker !== 'function') return null;
    return new Worker(new URL('../../workers/terminal-worker.ts', import.meta.url));
  }, []);

  const cancelWorker = useCallback(() => {
    if (typeof Worker !== 'function') return;
    workerRef.current?.terminate();
    workerRef.current = createWorker();
    if (pendingWorkerResolveRef.current) {
      pendingWorkerResolveRef.current();
      pendingWorkerResolveRef.current = null;
    }
  }, [createWorker]);

  const sessionManager = useMemo(
    () =>
      createSessionManager({
        getRegistry: () => registryRef.current,
        context: contextRef.current,
        prompt,
        write: (text: string) => {
          if (termRef.current) termRef.current.write(text);
        },
        writeLine,
        onHistoryUpdate: (history) => void persistCommandHistory(history),
        onCancelRunning: cancelWorker,
      }),
    [cancelWorker, persistCommandHistory, prompt, writeLine],
  );

  const clearTerminal = useCallback(() => {
    termRef.current?.clear();
    contentRef.current = '';
    historyRef.current = [];
    if (persistHistory) {
      if (opfsSupported && dirRef.current) {
        deleteFile(HISTORY_FILE, dirRef.current);
        deleteFile(COMMAND_HISTORY_KEY, dirRef.current);
      } else if (typeof window !== 'undefined') {
        window.localStorage.removeItem(HISTORY_FILE);
        window.localStorage.removeItem(COMMAND_HISTORY_KEY);
      }
    }
    setOverflow({ top: false, bottom: false });
    sessionManager.setBuffer('');
  }, [deleteFile, opfsSupported, persistHistory, sessionManager]);


  const handleCopy = () => {
    const term = termRef.current;
    const hasSelection = term?.hasSelection?.();
    const selection = hasSelection ? term?.getSelection?.() : '';
    const textToCopy = selection || contentRef.current;
    if (!textToCopy) return;
    navigator.clipboard
      .writeText(textToCopy)
      .then(() =>
        setCopyStatus(
          selection ? 'Copied selected text to clipboard.' : 'Copied terminal buffer to clipboard.',
        ),
      )
      .catch(() => setCopyStatus('Copy failed. Please try again.'));
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      sessionManager.handlePaste(text);
    } catch {}
  };

  useEffect(() => {
    if (!copyStatus) return;
    const timer = window.setTimeout(() => setCopyStatus(''), 2000);
    return () => window.clearTimeout(timer);
  }, [copyStatus]);

  const runWorker = useCallback(
    async (command: string) => {
      const worker = workerRef.current;
      if (!worker) {
        writeLine('Worker not available');
        return;
      }
      await new Promise<void>((resolve) => {
        pendingWorkerResolveRef.current = resolve;
        worker.onmessage = ({ data }: MessageEvent<any>) => {
          if (data.type === 'data') {
            for (const line of String(data.chunk).split('\n')) {
              if (line) writeLine(line);
            }
          } else if (data.type === 'end') {
            pendingWorkerResolveRef.current = null;
            resolve();
          }
        };
        worker.postMessage({
          action: 'run',
          command,
          files: filesRef.current,
        });
      });
    },
    [writeLine],
  );

  contextRef.current.writeLine = writeLine;
  contextRef.current.runWorker = runWorker;
  contextRef.current.clear = clearTerminal;
  contextRef.current.openApp = openApp;
  contextRef.current.listCommands = () => Object.values(registryRef.current);
  contextRef.current.files = filesRef.current;
  contextRef.current.history = historyRef.current;
  contextRef.current.aliases = aliasesRef.current;
  contextRef.current.safeMode = safeModeRef.current;

  useEffect(() => {
    workerRef.current = createWorker();
    return () => workerRef.current?.terminate();
  }, [createWorker]);

  useImperativeHandle(ref, () => ({
    runCommand: (c: string) => sessionManager.runCommand(c),
    getContent: () => contentRef.current,
  }));

  useEffect(() => {
    let disposed = false;
    (async () => {
      const [{ Terminal: XTerm }, { FitAddon }, { SearchAddon }] = await Promise.all([
        import('@xterm/xterm'),
        import('@xterm/addon-fit'),
        import('@xterm/addon-search'),
      ]);
      if (disposed) return;
      const term = new XTerm({
        cursorBlink: true,
        scrollback: sessionManager.getScrollbackLimit(),
        cols: 80,
        rows: 24,
        screenReaderMode: true,
        fontFamily: '"Fira Code", monospace',
        fontSize: 15,
        letterSpacing: 0.75,
        lineHeight: 1.38,
        theme: {
          background: '#080d12',
          foreground: '#e3eaf6',
          cursor: '#5cc8ff',
          cursorAccent: '#080d12',
          selectionBackground: '#1c2a3b',
          black: '#1a222c',
          red: '#f66a6a',
          green: '#6dd48c',
          yellow: '#f4d67a',
          blue: '#5ca6ff',
          magenta: '#c79bff',
          cyan: '#6cd6f7',
          white: '#f3f4f6',
          brightBlack: '#2f3b4a',
          brightRed: '#ff7a7a',
          brightGreen: '#7fe7a2',
          brightYellow: '#ffe28c',
          brightBlue: '#7bb8ff',
          brightMagenta: '#d7adff',
          brightCyan: '#7de6ff',
          brightWhite: '#ffffff',
        },
      });
      const fit = new FitAddon();
      const search = new SearchAddon();
      termRef.current = term;
      fitRef.current = fit;
      searchRef.current = search;
      term.loadAddon(fit);
      term.loadAddon(search);
      term.open(containerRef.current!);
      sessionManager.setTerminal(term);
      fit.fit();
      term.focus();
      if (persistHistory) {
        await restoreHistory();
      }
      writeLine('Welcome to the web terminal!');
      writeLine('Type "help" to see available commands.');
      if (safeMode) {
        writeLine('Safe mode is ON: network-like commands are simulated only.');
      }
      prompt();
      term.onData((d: string) => sessionManager.handleInput(d));
      term.onKey(({ domEvent }: any) => {
        if (domEvent.key === 'Tab') {
          domEvent.preventDefault();
          sessionManager.autocomplete();
        } else if (domEvent.ctrlKey && domEvent.key === 'f') {
          domEvent.preventDefault();
          const q = window.prompt('Search');
          if (q) searchRef.current?.findNext(q);
        } else if (domEvent.ctrlKey && domEvent.key === 'r') {
          domEvent.preventDefault();
          const q = window.prompt('Search history');
          if (q) {
            const match = [...historyRef.current]
              .reverse()
              .find((c) => c.includes(q));
            if (match && termRef.current) {
              termRef.current.write('\u001b[2K\r');
              prompt();
              termRef.current.write(match);
              sessionManager.setBuffer(match);
            } else {
              writeLine(`No match: ${q}`);
              prompt();
            }
          }
        }
      });
      const termWithPaste = term as typeof term & {
        onPaste?: (listener: (text: string) => void) => void;
      };
      termWithPaste.onPaste?.((text: string) => sessionManager.handlePaste(text));
      updateOverflow();
      term.onScroll?.(() => updateOverflow());
    })();
    return () => {
      disposed = true;
      termRef.current?.dispose();
    };
    }, [persistHistory, prompt, restoreHistory, safeMode, sessionManager, updateOverflow, writeLine]);

  useEffect(() => {
    const handleResize = () => fitRef.current?.fit();
    let observer: ResizeObserver | undefined;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(handleResize);
      if (containerRef.current) observer.observe(containerRef.current);
    }
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      observer?.disconnect();
    };
  }, []);

  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setPaletteOpen((v) => {
          const next = !v;
          if (next) termRef.current?.blur();
          else termRef.current?.focus();
          return next;
        });
      }
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [paletteOpen]);

  const focusTerminal = useCallback(() => {
    if (paletteOpen || settingsOpen) return;
    termRef.current?.focus();
  }, [paletteOpen, settingsOpen]);

  useEffect(() => {
    if (tab?.active) {
      focusTerminal();
    }
  }, [focusTerminal, tab?.active]);

  return (
    <div className="relative h-full w-full">
      {paletteOpen && (
        <div className="absolute inset-0 z-10 flex items-start justify-center bg-[color:var(--kali-overlay)] backdrop-blur-sm">
          <div className="mt-10 w-80 rounded-lg border border-[color:var(--kali-border)] bg-[color:var(--kali-panel)] p-4 shadow-lg shadow-[rgba(8,13,18,0.6)]">
            <input
              autoFocus
              className="mb-2 w-full rounded-md border border-[color:var(--kali-border)] bg-[color:var(--kali-overlay)] p-2 text-[color:var(--kali-text)] placeholder:text-[color:color-mix(in_srgb,var(--kali-text)_60%,_transparent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-accent)]"
              value={paletteInput}
              onChange={(e) => setPaletteInput(e.target.value)}
              aria-label="Command palette input"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  sessionManager.runCommand(paletteInput);
                  setPaletteInput('');
                  setPaletteOpen(false);
                  termRef.current?.focus();
                } else if (e.key === 'Escape') {
                  setPaletteOpen(false);
                  termRef.current?.focus();
                }
              }}
            />
            <ul className="max-h-40 overflow-y-auto rounded-md border border-[color:var(--kali-border)] bg-[color:var(--kali-overlay)]" role="menu">
              {commandList
                .filter((c) => {
                  const query = paletteInput.toLowerCase();
                  return (
                    !query ||
                    c.name.toLowerCase().includes(query) ||
                    c.description.toLowerCase().includes(query)
                  );
                })
                .map((c) => (
                  <li
                    key={c.name}
                    tabIndex={0}
                    role="menuitem"
                    className="cursor-pointer px-2 py-1 text-[color:var(--kali-text)] transition hover:bg-[color:var(--kali-control-overlay)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-accent)]"
                    onClick={() => {
                      sessionManager.runCommand(c.name);
                      setPaletteInput('');
                      setPaletteOpen(false);
                      termRef.current?.focus();
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        sessionManager.runCommand(c.name);
                        setPaletteInput('');
                        setPaletteOpen(false);
                        termRef.current?.focus();
                      }
                    }}
                  >
                    <div className="font-mono text-sm">{c.name}</div>
                    <p className="text-xs text-[color:color-mix(in_srgb,var(--kali-text)_65%,transparent)]">
                      {c.description}
                    </p>
                  </li>
                ))}
            </ul>
          </div>
        </div>
      )}
      {settingsOpen && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[color:var(--kali-overlay)] backdrop-blur-sm">
          <div className="space-y-4 rounded-lg border border-[color:var(--kali-border)] bg-[color:var(--kali-panel)] p-4 shadow-lg shadow-[rgba(8,13,18,0.6)]">
            <div className="grid grid-cols-8 gap-2">
              {ansiColors.map((c, i) => (
                <div key={i} className="h-4 w-4 rounded" style={{ backgroundColor: c }} />
              ))}
            </div>
            <pre className="text-sm leading-snug">
              <span className="text-blue-400">bin</span>{' '}
              <span className="text-green-400">script.sh</span>{' '}
              <span className="text-[color:color-mix(in_srgb,var(--kali-text)_70%,_transparent)]">README.md</span>
            </pre>
            <div className="space-y-2 text-sm text-[color:var(--kali-text)]">
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={persistHistory}
                  onChange={(e) => setPersistHistory(e.target.checked)}
                  aria-label="Toggle command history persistence"
                  className="mt-0.5 h-4 w-4 rounded border-[color:var(--kali-border)] bg-[color:var(--kali-overlay)] text-[color:var(--color-accent)] focus:ring-[color:var(--color-accent)]"
                />
                <span>
                  Persist command history across sessions
                  <span className="block text-[color:color-mix(in_srgb,var(--kali-text)_70%,transparent)]">
                    Stores history locally so you can pick up where you left off.
                  </span>
                </span>
              </label>
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={safeMode}
                  onChange={(e) => setSafeMode(e.target.checked)}
                  aria-label="Toggle safe mode"
                  className="mt-0.5 h-4 w-4 rounded border-[color:var(--kali-border)] bg-[color:var(--kali-overlay)] text-[color:var(--color-accent)] focus:ring-[color:var(--color-accent)]"
                />
                <span>
                  Safe mode
                  <span className="block text-[color:color-mix(in_srgb,var(--kali-text)_70%,transparent)]">
                    Simulates network-heavy commands and blocks real outbound calls.
                  </span>
                </span>
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <button
                className="rounded-md border border-[color:var(--kali-border)] bg-[color:var(--kali-overlay)] px-2 py-1 text-[color:var(--kali-text)] transition hover:bg-[color:var(--kali-control-overlay)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-accent)]"
                onClick={() => {
                  setSettingsOpen(false);
                  termRef.current?.focus();
                }}
              >
                Cancel
              </button>
              <button
                className="rounded-md border border-[color:var(--kali-border)] bg-[color:var(--color-accent)] px-2 py-1 font-medium text-[color:var(--color-inverse)] transition hover:bg-[color:color-mix(in_srgb,var(--color-accent)_85%,_#000000)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-accent)]"
                onClick={() => {
                  setSettingsOpen(false);
                  termRef.current?.focus();
                }}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="flex h-full flex-col">
        <div
          className="flex flex-wrap items-center gap-2 border-b border-[color:var(--kali-border)] bg-[color:var(--kali-overlay)] p-2 text-[color:var(--kali-text)] shadow-inner backdrop-blur"
          role="toolbar"
          aria-label="Terminal controls"
        >
          <button
            onClick={handleCopy}
            aria-label="Copy"
            className="inline-flex items-center rounded-md border border-[color:var(--kali-border)] bg-[color:var(--kali-panel)] p-1 text-[color:var(--kali-text)] transition hover:bg-[color:var(--kali-control-overlay)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-accent)]"
          >
            <CopyIcon />
          </button>
          <button
            onClick={handlePaste}
            aria-label="Paste"
            className="inline-flex items-center rounded-md border border-[color:var(--kali-border)] bg-[color:var(--kali-panel)] p-1 text-[color:var(--kali-text)] transition hover:bg-[color:var(--kali-control-overlay)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-accent)]"
          >
            <PasteIcon />
          </button>
          <button
            onClick={() => setSettingsOpen(true)}
            aria-label="Settings"
            className="inline-flex items-center rounded-md border border-[color:var(--kali-border)] bg-[color:var(--kali-panel)] p-1 text-[color:var(--kali-text)] transition hover:bg-[color:var(--kali-control-overlay)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-accent)]"
          >
            <SettingsIcon />
          </button>
          <div className="ml-auto flex flex-wrap items-center gap-3 text-xs text-[color:color-mix(in_srgb,var(--kali-text)_80%,transparent)]">
            <span className="rounded-sm bg-[color:var(--kali-overlay)] px-2 py-1 font-semibold text-[color:var(--kali-text)]">
              {safeMode ? 'Safe mode on' : 'Safe mode off'}
            </span>
            <span aria-label="History persistence">
              History: {persistHistory ? 'saved to device' : 'session only'}
            </span>
            {copyStatus && (
              <span className="rounded-sm bg-[color:var(--kali-overlay)] px-2 py-1" aria-live="polite">
                {copyStatus}
              </span>
            )}
          </div>
        </div>
        {!copyStatus && (
          <div className="sr-only" aria-live="polite">
            {safeMode ? 'Safe mode enabled. Network commands are simulated.' : 'Safe mode disabled.'}
          </div>
        )}
        <div className="relative flex-1 min-h-0">
          <TerminalContainer
            ref={containerRef}
            className="h-full w-full overflow-hidden font-mono"
            tabIndex={-1}
            onMouseDown={focusTerminal}
            onFocus={focusTerminal}
            style={{
              fontSize: 'clamp(1rem, 0.6vw + 1rem, 1.1rem)',
              lineHeight: 1.4,
            }}
          />
          {overflow.top && (
            <div className="pointer-events-none absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-slate-950/80" />
          )}
          {overflow.bottom && (
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-slate-950/80" />
          )}
        </div>
      </div>
    </div>
  );
});

TerminalApp.displayName = 'TerminalApp';

export default TerminalApp;
