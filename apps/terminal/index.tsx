'use client';

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
  const inputRef = useRef<HTMLInputElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef('');
  const registryRef = useRef<Record<string, CommandDefinition>>(commandRegistry);
  const filesRef = useRef<Record<string, string>>(files);
  const aliasesRef = useRef<Record<string, string>>({});
  const historyRef = useRef<string[]>([]);
  const [lines, setLines] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [historyIndex, setHistoryIndex] = useState<number | null>(null);
  const [safeMode, setSafeMode] = useState(true);
  const [persistHistory, setPersistHistory] = useState(false);
  const [copyStatus, setCopyStatus] = useState('');
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteInput, setPaletteInput] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const commandList = useMemo(() => getCommandList(), []);
  const { supported: opfsSupported, getDir, readFile, writeFile, deleteFile } = useOPFS();
  const tab = useTab();
  const dirRef = useRef<FileSystemDirectoryHandle | null>(null);
  const initializedRef = useRef(false);
  const workerRef = useRef<Worker | null>(null);
  const pendingWorkerResolveRef = useRef<(() => void) | null>(null);

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

  const appendLine = useCallback((text: string) => {
    setLines((prev) => [...prev, text]);
    contentRef.current = `${contentRef.current}${text}\n`;
  }, []);

  const appendText = useCallback((text: string) => {
    setLines((prev) => {
      if (!prev.length) return [text];
      const next = [...prev];
      next[next.length - 1] = `${next[next.length - 1]}${text}`;
      return next;
    });
    contentRef.current = `${contentRef.current}${text}`;
  }, []);

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
    [opfsSupported, persistHistory, writeFile],
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
    [opfsSupported, persistHistory, writeFile],
  );

  const restoreHistory = useCallback(async () => {
    if (!persistHistory) return;
    if (opfsSupported && !dirRef.current) {
      dirRef.current = await getDir('terminal');
    }
    try {
      let transcript = '';
      let commandHistory: string[] = [];
      if (opfsSupported && dirRef.current) {
        transcript = (await readFile(HISTORY_FILE, dirRef.current)) || '';
        const savedHistory = await readFile(COMMAND_HISTORY_KEY, dirRef.current);
        if (savedHistory) commandHistory = JSON.parse(savedHistory);
      } else if (typeof window !== 'undefined') {
        transcript = window.localStorage.getItem(HISTORY_FILE) || '';
        const saved = window.localStorage.getItem(COMMAND_HISTORY_KEY);
        if (saved) commandHistory = JSON.parse(saved);
      }
      if (transcript) {
        setLines(transcript.split('\n').filter(Boolean));
        contentRef.current = transcript.endsWith('\n') ? transcript : `${transcript}\n`;
      }
      if (commandHistory.length) {
        historyRef.current = commandHistory;
      }
    } catch {}
  }, [getDir, opfsSupported, persistHistory, readFile]);

  const clearTerminal = useCallback(() => {
    setLines([]);
    contentRef.current = '';
    historyRef.current = [];
    setHistoryIndex(null);
    if (persistHistory) {
      if (opfsSupported && dirRef.current) {
        deleteFile(HISTORY_FILE, dirRef.current);
        deleteFile(COMMAND_HISTORY_KEY, dirRef.current);
      } else if (typeof window !== 'undefined') {
        window.localStorage.removeItem(HISTORY_FILE);
        window.localStorage.removeItem(COMMAND_HISTORY_KEY);
      }
    }
  }, [deleteFile, opfsSupported, persistHistory]);

  const writeLine = useCallback(
    (text: string) => {
      appendLine(text);
      void persistTranscript(contentRef.current);
    },
    [appendLine, persistTranscript],
  );

  const write = useCallback(
    (text: string) => {
      appendText(text);
      void persistTranscript(contentRef.current);
    },
    [appendText, persistTranscript],
  );

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

  const contextRef = useRef<CommandContext>({
    writeLine,
    write,
    files: filesRef.current,
    history: historyRef.current,
    aliases: aliasesRef.current,
    safeMode,
    setAlias: (n, v) => {
      aliasesRef.current[n] = v;
    },
    runWorker,
    clear: clearTerminal,
    openApp,
    listCommands: () => Object.values(registryRef.current),
  });

  const runCommand = useCallback(
    async (inputValue: string) => {
      const trimmed = inputValue.trim();
      if (!trimmed) return;
      const [name, ...rest] = trimmed.split(/\s+/);
      const alias = contextRef.current.aliases[name];
      const expanded = alias ? `${alias} ${rest.join(' ')}`.trim() : trimmed;
      const [cmdName, ...cmdArgs] = expanded.split(/\s+/);
      historyRef.current.push(trimmed);
      await persistCommandHistory(historyRef.current);
      setHistoryIndex(null);
      const riskyCommands = ['nmap', 'curl', 'wget', 'ssh', 'nc', 'netcat', 'telnet', 'ping'];
      const looksNetworkBound = /https?:\/\//i.test(expanded) || riskyCommands.includes(cmdName);
      if (safeMode && looksNetworkBound) {
        writeLine('Safe mode: this command is simulated and cannot reach the network.');
        writeLine(`[simulated] ${expanded}`);
        return;
      }
      const registry = registryRef.current;
      const handler = registry[cmdName]?.handler;
      if (handler) {
        await handler(cmdArgs.join(' '), contextRef.current);
      } else if (cmdName) {
        await runWorker(expanded);
      }
    },
    [persistCommandHistory, runWorker, safeMode, writeLine],
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSafeMode(parsed.safeMode ?? true);
        setPersistHistory(parsed.persistHistory ?? false);
      } catch {}
    }
  }, []);

  useEffect(() => {
    contextRef.current.safeMode = safeMode;
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify({ safeMode, persistHistory }),
      );
    }
  }, [persistHistory, safeMode]);

  useEffect(() => {
    workerRef.current = createWorker();
    return () => workerRef.current?.terminate();
  }, [createWorker]);

  useEffect(() => {
    if (persistHistory) {
      void restoreHistory();
    }
  }, [persistHistory, restoreHistory]);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    if (!contentRef.current) {
      appendLine('Welcome to the web terminal!');
      appendLine('Type \"help\" to see available commands.');
      if (safeMode) {
        appendLine('Safe mode is ON: network-like commands are simulated only.');
      }
    }
  }, [appendLine, safeMode]);

  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;
    scroller.scrollTop = scroller.scrollHeight;
  }, [lines]);

  useEffect(() => {
    if (copyStatus === '') return;
    const timer = window.setTimeout(() => setCopyStatus(''), 2000);
    return () => window.clearTimeout(timer);
  }, [copyStatus]);

  const handleCopy = () => {
    const textToCopy = contentRef.current;
    if (!textToCopy) return;
    navigator.clipboard
      .writeText(textToCopy)
      .then(() => setCopyStatus('Copied terminal buffer to clipboard.'))
      .catch(() => setCopyStatus('Copy failed. Please try again.'));
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setInput((prev) => `${prev}${text}`);
    } catch {}
  };

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      const value = input.trim();
      if (!value) return;
      appendLine(`kali@kali:~$ ${value}`);
      setInput('');
      void runCommand(value);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      const history = historyRef.current;
      if (!history.length) return;
      const nextIndex = historyIndex === null ? history.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(nextIndex);
      setInput(history[nextIndex]);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      const history = historyRef.current;
      if (historyIndex === null) return;
      const nextIndex = historyIndex + 1;
      if (nextIndex >= history.length) {
        setHistoryIndex(null);
        setInput('');
        return;
      }
      setHistoryIndex(nextIndex);
      setInput(history[nextIndex]);
    } else if (event.key === 'Tab') {
      event.preventDefault();
      const matches = commandList.filter((c) => c.name.startsWith(input));
      if (matches.length === 1) {
        setInput(matches[0].name);
      } else if (matches.length > 1) {
        appendLine(matches.map((c) => c.name).join('  '));
      }
    }
  };

  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, []);

  const focusTerminal = useCallback(() => {
    if (paletteOpen || settingsOpen) return;
    inputRef.current?.focus();
  }, [paletteOpen, settingsOpen]);

  useEffect(() => {
    if (tab?.active) {
      focusTerminal();
    }
  }, [focusTerminal, tab?.active]);

  useImperativeHandle(ref, () => ({
    runCommand: (cmd: string) => void runCommand(cmd),
    getContent: () => contentRef.current,
  }));

  return (
    <div className="relative flex h-full w-full flex-col">
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
                  appendLine(`kali@kali:~$ ${paletteInput}`);
                  void runCommand(paletteInput);
                  setPaletteInput('');
                  setPaletteOpen(false);
                  focusTerminal();
                } else if (e.key === 'Escape') {
                  setPaletteOpen(false);
                  focusTerminal();
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
                      appendLine(`kali@kali:~$ ${c.name}`);
                      void runCommand(c.name);
                      setPaletteInput('');
                      setPaletteOpen(false);
                      focusTerminal();
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        appendLine(`kali@kali:~$ ${c.name}`);
                        void runCommand(c.name);
                        setPaletteInput('');
                        setPaletteOpen(false);
                        focusTerminal();
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
                  Enable safe mode
                  <span className="block text-[color:color-mix(in_srgb,var(--kali-text)_70%,transparent)]">
                    Network-like commands remain simulated for safety.
                  </span>
                </span>
              </label>
            </div>
            <button
              type="button"
              className="rounded-md border border-[color:var(--kali-border)] bg-[color:var(--kali-overlay)] px-3 py-2 text-xs text-[color:var(--kali-text)]"
              onClick={() => setSettingsOpen(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between gap-2 border-b border-[color:var(--kali-border)] bg-[color:var(--kali-panel)] px-3 py-2 text-[color:var(--kali-text)]">
        <div className="text-xs uppercase tracking-widest">Terminal</div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="rounded-md border border-[color:var(--kali-border)] bg-[color:var(--kali-overlay)] px-2 py-1 text-xs"
            aria-label="Copy terminal output"
          >
            <CopyIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handlePaste}
            className="rounded-md border border-[color:var(--kali-border)] bg-[color:var(--kali-overlay)] px-2 py-1 text-xs"
            aria-label="Paste into terminal input"
          >
            <PasteIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="rounded-md border border-[color:var(--kali-border)] bg-[color:var(--kali-overlay)] px-2 py-1 text-xs"
            aria-label="Open terminal settings"
          >
            <SettingsIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
      <TerminalContainer
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-3 text-sm"
        onMouseDown={focusTerminal}
        onFocus={focusTerminal}
        tabIndex={-1}
      >
        <div className="space-y-1 font-mono">
          {lines.map((line, index) => (
            <div key={index} className="whitespace-pre-wrap text-slate-100">
              {line}
            </div>
          ))}
        </div>
      </TerminalContainer>
      <div className="flex items-center gap-2 border-t border-[color:var(--kali-border)] bg-[color:var(--kali-panel)] px-4 py-2">
        <span className="font-mono text-xs text-[color:var(--kali-text)]">kali@kali:~$</span>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleInputKeyDown}
          aria-label="Terminal input"
          className="w-full bg-transparent font-mono text-sm text-[color:var(--kali-text)] outline-none"
        />
      </div>
      {copyStatus && (
        <div className="absolute bottom-2 right-2 rounded bg-[color:var(--kali-overlay)] px-3 py-2 text-xs text-[color:var(--kali-text)]">
          {copyStatus}
        </div>
      )}
    </div>
  );
});

TerminalApp.displayName = 'TerminalApp';

export default TerminalApp;
