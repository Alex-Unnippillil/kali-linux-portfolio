'use client';

import React, {
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
  useCallback,
} from 'react';
import useOPFS from '../../hooks/useOPFS';
import commandRegistry, { CommandContext } from './commands';
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

type TerminalThemeKey = 'kali' | 'matrix' | 'light';

type TerminalThemeConfig = {
  label: string;
  theme: {
    background: string;
    foreground: string;
    cursor: string;
    selection?: string;
    [key: string]: string;
  };
  ui: {
    chrome: string;
    chromeText: string;
    border: string;
  };
  preview: string;
};

const terminalThemes: Record<TerminalThemeKey, TerminalThemeConfig> = {
  kali: {
    label: 'Kali Dark',
    theme: {
      background: '#0f1317',
      foreground: '#f5f5f5',
      cursor: '#1793d1',
      selection: 'rgba(23, 147, 209, 0.35)',
      black: '#000000',
      red: '#ff5555',
      green: '#55ff55',
      yellow: '#f1fa8c',
      blue: '#1793d1',
      magenta: '#ff79c6',
      cyan: '#8be9fd',
      white: '#f8f8f2',
      brightBlack: '#6272a4',
      brightRed: '#ff6e6e',
      brightGreen: '#69ff94',
      brightYellow: '#ffffa5',
      brightBlue: '#50b1f9',
      brightMagenta: '#ff92df',
      brightCyan: '#a4ffff',
      brightWhite: '#ffffff',
    },
    ui: {
      chrome: 'rgba(23, 27, 34, 0.9)',
      chromeText: '#f5f5f5',
      border: 'rgba(51, 65, 85, 0.85)',
    },
    preview: 'linear-gradient(135deg, #0f1317, #1f2833)',
  },
  matrix: {
    label: 'Matrix',
    theme: {
      background: '#020805',
      foreground: '#a7f3d0',
      cursor: '#34d399',
      selection: 'rgba(52, 211, 153, 0.35)',
      black: '#000000',
      red: '#f97316',
      green: '#34d399',
      yellow: '#a3e635',
      blue: '#22d3ee',
      magenta: '#f472b6',
      cyan: '#2dd4bf',
      white: '#d1fae5',
      brightBlack: '#064e3b',
      brightRed: '#fb923c',
      brightGreen: '#6ee7b7',
      brightYellow: '#bef264',
      brightBlue: '#67e8f9',
      brightMagenta: '#f9a8d4',
      brightCyan: '#5eead4',
      brightWhite: '#ecfdf5',
    },
    ui: {
      chrome: 'rgba(3, 15, 10, 0.92)',
      chromeText: '#a7f3d0',
      border: 'rgba(16, 185, 129, 0.6)',
    },
    preview: 'linear-gradient(135deg, #022c22, #065f46)',
  },
  light: {
    label: 'Solar Light',
    theme: {
      background: '#f8fafc',
      foreground: '#1f2937',
      cursor: '#0f766e',
      selection: 'rgba(14, 116, 144, 0.25)',
      black: '#1f2937',
      red: '#dc2626',
      green: '#16a34a',
      yellow: '#ca8a04',
      blue: '#2563eb',
      magenta: '#7c3aed',
      cyan: '#0ea5e9',
      white: '#f9fafb',
      brightBlack: '#475569',
      brightRed: '#ef4444',
      brightGreen: '#22c55e',
      brightYellow: '#facc15',
      brightBlue: '#3b82f6',
      brightMagenta: '#8b5cf6',
      brightCyan: '#38bdf8',
      brightWhite: '#ffffff',
    },
    ui: {
      chrome: 'rgba(226, 232, 240, 0.85)',
      chromeText: '#0f172a',
      border: 'rgba(148, 163, 184, 0.8)',
    },
    preview: 'linear-gradient(135deg, #e2e8f0, #f8fafc)',
  },
};

type TerminalSettings = {
  copyOnSelect: boolean;
  fontSize: number;
  theme: TerminalThemeKey;
};

const TERMINAL_SETTINGS_KEY = 'terminal-settings';

const getDefaultSettings = (): TerminalSettings => {
  if (typeof window === 'undefined') {
    return { copyOnSelect: false, fontSize: 16, theme: 'kali' };
  }
  try {
    const raw = window.localStorage.getItem(TERMINAL_SETTINGS_KEY);
    if (!raw) {
      return { copyOnSelect: false, fontSize: 16, theme: 'kali' };
    }
    const parsed = JSON.parse(raw) as Partial<TerminalSettings>;
    const theme =
      parsed.theme && Object.prototype.hasOwnProperty.call(terminalThemes, parsed.theme)
        ? (parsed.theme as TerminalThemeKey)
        : 'kali';
    const fontSize =
      typeof parsed.fontSize === 'number' && parsed.fontSize >= 10 && parsed.fontSize <= 28
        ? parsed.fontSize
        : 16;
    const copyOnSelect = Boolean(parsed.copyOnSelect);
    return { copyOnSelect, fontSize, theme };
  } catch {
    return { copyOnSelect: false, fontSize: 16, theme: 'kali' };
  }
};

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
  const commandRef = useRef('');
  const contentRef = useRef('');
  const registryRef = useRef(commandRegistry);
  const workerRef = useRef<Worker | null>(null);
  const filesRef = useRef<Record<string, string>>(files);
  const aliasesRef = useRef<Record<string, string>>({});
  const historyRef = useRef<string[]>([]);
  const contextRef = useRef<CommandContext>({
    writeLine: () => {},
    files: filesRef.current,
    history: historyRef.current,
    aliases: aliasesRef.current,
    setAlias: (n, v) => {
      aliasesRef.current[n] = v;
    },
    runWorker: async () => {},
  });
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteInput, setPaletteInput] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<TerminalSettings>(getDefaultSettings);
  const settingsRef = useRef(settings);
  const { supported: opfsSupported, getDir, readFile, writeFile, deleteFile } =
    useOPFS();
  const dirRef = useRef<FileSystemDirectoryHandle | null>(null);
  const [overflow, setOverflow] = useState({ top: false, bottom: false });
  const currentTheme = terminalThemes[settings.theme] ?? terminalThemes.kali;

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(TERMINAL_SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  const updateOverflow = useCallback(() => {
    const term = termRef.current;
    if (!term || !term.buffer) return;
    const { viewportY, baseY } = term.buffer.active;
    setOverflow({ top: viewportY > 0, bottom: viewportY < baseY });
  }, []);

  const writeLine = useCallback(
    (text: string) => {
      if (termRef.current) termRef.current.writeln(text);
      contentRef.current += `${text}\n`;
      if (opfsSupported && dirRef.current) {
        writeFile('history.txt', contentRef.current, dirRef.current);
      }
      updateOverflow();
    },
    [opfsSupported, updateOverflow, writeFile],
  );

  contextRef.current.writeLine = writeLine;

  const prompt = useCallback(() => {
    if (!termRef.current) return;
    termRef.current.writeln(
      '\x1b[1;34m┌──(\x1b[0m\x1b[1;36mkali\x1b[0m\x1b[1;34m㉿\x1b[0m\x1b[1;36mkali\x1b[0m\x1b[1;34m)-[\x1b[0m\x1b[1;32m~\x1b[0m\x1b[1;34m]\x1b[0m',
    );
    termRef.current.write('\x1b[1;34m└─\x1b[0m$ ');
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(contentRef.current).catch(() => {});
  };

  const runWorker = useCallback(
    async (command: string) => {
      const worker = workerRef.current;
      if (!worker) {
        writeLine('Worker not available');
        return;
      }
      await new Promise<void>((resolve) => {
        worker.onmessage = ({ data }: MessageEvent<any>) => {
          if (data.type === 'data') {
            for (const line of String(data.chunk).split('\n')) {
              if (line) writeLine(line);
            }
          } else if (data.type === 'end') {
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

  contextRef.current.runWorker = runWorker;

  useEffect(() => {
    registryRef.current = {
      ...commandRegistry,
      help: () => {
        writeLine(
          `Available commands: ${Object.keys(registryRef.current).join(', ')}`,
        );
        writeLine(
          'Example scripts: https://github.com/unnippillil/kali-linux-portfolio/tree/main/scripts/examples',
        );
      },
      ls: () => writeLine(Object.keys(filesRef.current).join('  ')),
      clear: () => {
        termRef.current?.clear();
        contentRef.current = '';
        if (opfsSupported && dirRef.current) {
          deleteFile('history.txt', dirRef.current);
        }
        setOverflow({ top: false, bottom: false });
      },
      open: (arg) => {
        if (!arg) {
          writeLine('Usage: open <app>');
        } else {
          openApp?.(arg.trim());
          writeLine(`Opening ${arg}`);
        }
      },
      date: () => writeLine(new Date().toString()),
      about: () => writeLine('This terminal is powered by xterm.js'),
    };
    }, [openApp, opfsSupported, deleteFile, writeLine]);

  useEffect(() => {
    if (typeof Worker === 'function') {
      workerRef.current = new Worker(
        new URL('../../workers/terminal-worker.ts', import.meta.url),
      );
    }
    return () => workerRef.current?.terminate();
  }, []);

    const runCommand = useCallback(
      async (cmd: string) => {
        const [name, ...rest] = cmd.trim().split(/\s+/);
        const expanded =
          aliasesRef.current[name]
            ? `${aliasesRef.current[name]} ${rest.join(' ')}`.trim()
            : cmd;
        const [cmdName, ...cmdRest] = expanded.split(/\s+/);
        const handler = registryRef.current[cmdName];
        historyRef.current.push(cmd);
        if (handler) await handler(cmdRest.join(' '), contextRef.current);
        else if (cmdName) await runWorker(expanded);
      },
      [runWorker],
    );

    const autocomplete = useCallback(() => {
      const current = commandRef.current;
      const registry = registryRef.current;
      const matches = Object.keys(registry).filter((c) => c.startsWith(current));
      if (matches.length === 1) {
        const completion = matches[0].slice(current.length);
        termRef.current?.write(completion);
        commandRef.current = matches[0];
      } else if (matches.length > 1) {
        writeLine(matches.join('  '));
        prompt();
        termRef.current?.write(commandRef.current);
      }
    }, [prompt, writeLine]);

    const handleInput = useCallback(
      (data: string) => {
        for (const ch of data) {
          if (ch === '\r') {
            termRef.current?.writeln('');
            runCommand(commandRef.current.trim());
            commandRef.current = '';
            prompt();
          } else if (ch === '\u007F') {
            if (commandRef.current.length > 0) {
              termRef.current?.write('\b \b');
              commandRef.current = commandRef.current.slice(0, -1);
            }
          } else {
            commandRef.current += ch;
            termRef.current?.write(ch);
          }
        }
      },
      [runCommand, prompt],
    );

  const confirmTextPaste = useCallback(
    (text: string) => {
      if (!text) return;
      const lines = text.split('\n');
      const previewLines = lines.slice(0, 5).map((line) => line.trimEnd());
      const preview = previewLines.join('\n');
      const truncated = lines.length > 5 ? '\n…' : '';
      const message =
        'You are about to paste the following text into the terminal. Commands will execute if they contain line breaks.\n\n' +
        preview +
        truncated;
      const confirmed = window.confirm(message);
      if (confirmed) {
        handleInput(text);
      }
      termRef.current?.focus();
    },
    [handleInput],
  );

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) {
        termRef.current?.focus();
        return;
      }
      confirmTextPaste(text);
    } catch {
      window.alert('Unable to read from the clipboard. Please allow clipboard access and try again.');
      termRef.current?.focus();
    }
  }, [confirmTextPaste]);

  useImperativeHandle(ref, () => ({
    runCommand: (c: string) => runCommand(c),
    getContent: () => contentRef.current,
  }));

  useEffect(() => {
    let disposed = false;
    let selectionDisposable: { dispose: () => void } | undefined;
    let textarea: HTMLTextAreaElement | undefined;
    let pasteListener: ((event: ClipboardEvent) => void) | undefined;
    (async () => {
      const [{ Terminal: XTerm }, { FitAddon }, { SearchAddon }] = await Promise.all([
        import('@xterm/xterm'),
        import('@xterm/addon-fit'),
        import('@xterm/addon-search'),
      ]);
      await import('@xterm/xterm/css/xterm.css');
      if (disposed) return;
      const initialSettings = settingsRef.current;
      const themeConfig = terminalThemes[initialSettings.theme] ?? terminalThemes.kali;
      const term = new XTerm({
        cursorBlink: true,
        scrollback: 1000,
        cols: 80,
        rows: 24,
        fontFamily: '"Fira Code", monospace',
        fontSize: initialSettings.fontSize,
        lineHeight: 1.4,
        theme: { ...themeConfig.theme },
      });
      const fit = new FitAddon();
      const search = new SearchAddon();
      termRef.current = term;
      fitRef.current = fit;
      searchRef.current = search;
      term.loadAddon(fit);
      term.loadAddon(search);
      term.open(containerRef.current!);
      fit.fit();
      term.focus();
      if (typeof term.onSelectionChange === 'function') {
        selectionDisposable = term.onSelectionChange(() => {
          if (!settingsRef.current.copyOnSelect) return;
          const selection = term.getSelection?.();
          if (selection) {
            navigator.clipboard.writeText(selection).catch(() => {});
          }
        });
      }
      pasteListener = (event: ClipboardEvent) => {
        event.preventDefault();
        const text = event.clipboardData?.getData('text') ?? '';
        if (!text) {
          term.focus();
          return;
        }
        confirmTextPaste(text);
      };
      textarea = term.textarea ?? undefined;
      textarea?.addEventListener('paste', pasteListener);
      if (opfsSupported) {
        dirRef.current = await getDir('terminal');
        const existing = await readFile('history.txt', dirRef.current || undefined);
        if (existing) {
          existing
            .split('\n')
            .filter(Boolean)
            .forEach((l) => {
              if (termRef.current) termRef.current.writeln(l);
            });
          contentRef.current = existing.endsWith('\n')
            ? existing
            : `${existing}\n`;
        }
      }
      writeLine('Welcome to the web terminal!');
      writeLine('Type "help" to see available commands.');
      prompt();
      term.onData((d: string) => handleInput(d));
      term.onKey(({ domEvent }: any) => {
        if (domEvent.key === 'Tab') {
          domEvent.preventDefault();
          autocomplete();
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
              commandRef.current = match;
            } else {
              writeLine(`No match: ${q}`);
              prompt();
            }
          }
        }
      });
      updateOverflow();
      term.onScroll?.(updateOverflow);
    })();
    return () => {
      disposed = true;
      if (textarea && pasteListener) {
        textarea.removeEventListener('paste', pasteListener);
      }
      selectionDisposable?.dispose?.();
      termRef.current?.dispose();
      termRef.current = null;
    };
    }, [opfsSupported, getDir, readFile, writeLine, prompt, handleInput, autocomplete, updateOverflow, confirmTextPaste]);

  useEffect(() => {
    const themeConfig = terminalThemes[settings.theme] ?? terminalThemes.kali;
    if (termRef.current) {
      termRef.current.options.theme = { ...themeConfig.theme };
    }
  }, [settings.theme]);

  useEffect(() => {
    if (termRef.current) {
      termRef.current.options.fontSize = settings.fontSize;
    }
    fitRef.current?.fit();
  }, [settings.fontSize]);

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

  return (
    <div className="relative h-full w-full">
      {paletteOpen && (
        <div className="absolute inset-0 bg-black bg-opacity-75 flex items-start justify-center z-10">
          <div className="mt-10 w-80 bg-gray-800 p-4 rounded">
            <input
              autoFocus
              className="w-full mb-2 bg-black text-white p-2"
              value={paletteInput}
              onChange={(e) => setPaletteInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  runCommand(paletteInput);
                  setPaletteInput('');
                  setPaletteOpen(false);
                  termRef.current?.focus();
                } else if (e.key === 'Escape') {
                  setPaletteOpen(false);
                  termRef.current?.focus();
                }
              }}
            />
            <ul className="max-h-40 overflow-y-auto">
              {Object.keys(registryRef.current)
                .filter((c) => c.startsWith(paletteInput))
                .map((c) => (
                  <li key={c} className="text-white">
                    {c}
                  </li>
                ))}
            </ul>
          </div>
        </div>
      )}
      {settingsOpen && (
        <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center z-10">
          <div className="w-full max-w-md rounded border border-slate-700 bg-gray-900 p-4 shadow-lg">
            <h2 className="mb-4 text-lg font-semibold text-white">Terminal settings</h2>
            <div className="space-y-6">
              <label className="flex items-center justify-between text-sm text-gray-200">
                <span>Copy on select</span>
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={settings.copyOnSelect}
                  onChange={(event) =>
                    setSettings((prev) => ({
                      ...prev,
                      copyOnSelect: event.target.checked,
                    }))
                  }
                />
              </label>
              <div className="space-y-2 text-sm text-gray-200">
                <div className="flex items-center justify-between">
                  <span>Font size</span>
                  <span>{settings.fontSize}px</span>
                </div>
                <input
                  type="range"
                  min={12}
                  max={24}
                  step={1}
                  value={settings.fontSize}
                  onChange={(event) =>
                    setSettings((prev) => ({
                      ...prev,
                      fontSize: Number(event.target.value),
                    }))
                  }
                  className="w-full"
                />
              </div>
              <div className="space-y-2 text-sm text-gray-200">
                <span>Theme</span>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {Object.entries(terminalThemes).map(([key, config]) => (
                    <button
                      key={key}
                      type="button"
                      className={`flex flex-col rounded border p-2 text-left text-xs transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        settings.theme === key ? 'border-blue-500 shadow-md' : 'border-gray-700'
                      }`}
                      style={{
                        background: config.theme.background,
                        color: config.theme.foreground,
                        borderColor: config.ui.border,
                      }}
                      onClick={() =>
                        setSettings((prev) => ({
                          ...prev,
                          theme: key as TerminalThemeKey,
                        }))
                      }
                    >
                      <span
                        className="mb-2 h-12 w-full rounded"
                        style={{ background: config.preview }}
                      />
                      <span className="font-medium">{config.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  className="rounded bg-blue-600 px-3 py-1 text-sm font-medium text-white"
                  onClick={() => {
                    setSettingsOpen(false);
                    termRef.current?.focus();
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="flex h-full flex-col">
        <div
          className="flex items-center gap-2 border-b px-2 py-1"
          style={{
            background: currentTheme.ui.chrome,
            color: currentTheme.ui.chromeText,
            borderColor: currentTheme.ui.border,
          }}
        >
          <button onClick={handleCopy} aria-label="Copy" className="p-1">
            <CopyIcon />
          </button>
          <button onClick={handlePaste} aria-label="Paste" className="p-1">
            <PasteIcon />
          </button>
          <button onClick={() => setSettingsOpen(true)} aria-label="Settings" className="p-1">
            <SettingsIcon />
          </button>
        </div>
        <div className="relative flex-1">
          <TerminalContainer
            ref={containerRef}
            className="h-full w-full resize overflow-hidden font-mono"
            style={{
              width: '80ch',
              height: '24em',
              fontSize: `${settings.fontSize}px`,
              lineHeight: 1.4,
              background: currentTheme.theme.background,
              color: currentTheme.theme.foreground,
              borderColor: currentTheme.ui.border,
            }}
          />
          {overflow.top && (
            <div
              className="pointer-events-none absolute top-0 left-0 right-0 h-4"
              style={{
                background: `linear-gradient(to bottom, ${currentTheme.theme.background}, transparent)`,
              }}
            />
          )}
          {overflow.bottom && (
            <div
              className="pointer-events-none absolute bottom-0 left-0 right-0 h-4"
              style={{
                background: `linear-gradient(to top, ${currentTheme.theme.background}, transparent)`,
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
});

TerminalApp.displayName = 'TerminalApp';

export default TerminalApp;
