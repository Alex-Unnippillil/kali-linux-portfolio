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

type TerminalProfileKey = 'default' | 'low-contrast' | 'solarized';

interface TerminalProfileDefinition {
  label: string;
  description: string;
  theme: {
    background: string;
    foreground: string;
    cursor: string;
    selectionBackground: string;
  };
  tokens: { name: string; value: string }[];
  swatch: string[];
}

interface ProfileSettings {
  opacity: number;
}

const TERMINAL_STORAGE_KEY = 'terminal.profile.settings';

const TERMINAL_PROFILES: Record<TerminalProfileKey, TerminalProfileDefinition> = {
  default: {
    label: 'Default',
    description: 'Kali-inspired contrast with bright cursor highlights.',
    theme: {
      background: '#0f1317',
      foreground: '#f5f5f5',
      cursor: '#1793d1',
      selectionBackground: '#1793d166',
    },
    tokens: [
      { name: '--terminal-bg-color', value: '#0f1317' },
      { name: '--terminal-foreground', value: '#f5f5f5' },
      { name: '--terminal-cursor', value: '#1793d1' },
    ],
    swatch: ['#0f1317', '#f5f5f5', '#1793d1'],
  },
  'low-contrast': {
    label: 'Low Contrast',
    description: 'Softer palette for reduced visual fatigue.',
    theme: {
      background: '#1a1f26',
      foreground: '#c1cad6',
      cursor: '#7aa2c8',
      selectionBackground: '#7aa2c833',
    },
    tokens: [
      { name: '--terminal-bg-color', value: '#1a1f26' },
      { name: '--terminal-foreground', value: '#c1cad6' },
      { name: '--terminal-cursor', value: '#7aa2c8' },
    ],
    swatch: ['#1a1f26', '#c1cad6', '#7aa2c8'],
  },
  solarized: {
    label: 'Solarized',
    description: 'Classic Solarized Dark with muted tones.',
    theme: {
      background: '#002b36',
      foreground: '#839496',
      cursor: '#93a1a1',
      selectionBackground: '#586e7544',
    },
    tokens: [
      { name: '--terminal-bg-color', value: '#002b36' },
      { name: '--terminal-foreground', value: '#839496' },
      { name: '--terminal-cursor', value: '#93a1a1' },
    ],
    swatch: ['#002b36', '#839496', '#93a1a1'],
  },
};

const isTerminalProfileKey = (value: string): value is TerminalProfileKey =>
  Object.prototype.hasOwnProperty.call(TERMINAL_PROFILES, value);

const DEFAULT_PROFILE_SETTINGS: Record<TerminalProfileKey, ProfileSettings> = {
  default: { opacity: 0.85 },
  'low-contrast': { opacity: 0.85 },
  solarized: { opacity: 0.85 },
};

const clampOpacity = (value: number) => Math.min(1, Math.max(0.3, value));

const hexToRgba = (hex: string, alpha: number) => {
  const normalized = hex.replace('#', '');
  const bigint = parseInt(normalized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

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
  const [selectedProfile, setSelectedProfile] = useState<TerminalProfileKey>('default');
  const [profileSettings, setProfileSettings] = useState<Record<TerminalProfileKey, ProfileSettings>>(
    () => ({ ...DEFAULT_PROFILE_SETTINGS }),
  );
  const [settingsHydrated, setSettingsHydrated] = useState(false);
  const [termReady, setTermReady] = useState(false);
  const { supported: opfsSupported, getDir, readFile, writeFile, deleteFile } =
    useOPFS();
  const dirRef = useRef<FileSystemDirectoryHandle | null>(null);
  const [overflow, setOverflow] = useState({ top: false, bottom: false });

  const updateOverflow = useCallback(() => {
    const term = termRef.current;
    if (!term || !term.buffer) return;
    const { viewportY, baseY } = term.buffer.active;
    setOverflow({ top: viewportY > 0, bottom: viewportY < baseY });
  }, []);

  const applyProfile = useCallback(
    (
      profileKey: TerminalProfileKey,
      overrideSettings?: Record<TerminalProfileKey, ProfileSettings>,
    ) => {
      const profile = TERMINAL_PROFILES[profileKey];
      if (!profile) return;
      const settings = overrideSettings ?? profileSettings;
      const fallback = DEFAULT_PROFILE_SETTINGS[profileKey];
      const opacity = clampOpacity(settings[profileKey]?.opacity ?? fallback.opacity);

      if (containerRef.current) {
        const rgba = hexToRgba(profile.theme.background, opacity);
        containerRef.current.style.setProperty('--terminal-bg', rgba);
        containerRef.current.style.setProperty('--terminal-foreground', profile.theme.foreground);
        containerRef.current.style.setProperty('--terminal-cursor', profile.theme.cursor);
      }

      if (termReady && termRef.current) {
        termRef.current.setOption('theme', {
          ...termRef.current.options?.theme,
          background: profile.theme.background,
          foreground: profile.theme.foreground,
          cursor: profile.theme.cursor,
          selectionBackground: profile.theme.selectionBackground,
        });
        termRef.current.refresh?.(0, termRef.current.rows - 1);
      }
    },
    [profileSettings, termReady],
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(TERMINAL_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as {
          selectedProfile?: string;
          profileSettings?: Record<string, { opacity?: number }>;
        };
        if (parsed.profileSettings) {
          const sanitized: Partial<Record<TerminalProfileKey, ProfileSettings>> = {};
          for (const [key, value] of Object.entries(parsed.profileSettings)) {
            if (isTerminalProfileKey(key) && value) {
              const opacity = typeof value.opacity === 'number' ? clampOpacity(value.opacity) : undefined;
              if (typeof opacity === 'number') {
                sanitized[key] = { opacity };
              }
            }
          }
          if (Object.keys(sanitized).length > 0) {
            setProfileSettings((prev) => ({ ...prev, ...sanitized }));
          }
        }
        if (parsed.selectedProfile && isTerminalProfileKey(parsed.selectedProfile)) {
          setSelectedProfile(parsed.selectedProfile);
        }
      }
    } catch {}
    setSettingsHydrated(true);
  }, []);

  useEffect(() => {
    if (!settingsHydrated || typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(
        TERMINAL_STORAGE_KEY,
        JSON.stringify({
          selectedProfile,
          profileSettings,
        }),
      );
    } catch {}
  }, [profileSettings, selectedProfile, settingsHydrated]);

  useEffect(() => {
    applyProfile(selectedProfile);
  }, [applyProfile, selectedProfile]);

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

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      handleInput(text);
    } catch {}
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

  useImperativeHandle(ref, () => ({
    runCommand: (c: string) => runCommand(c),
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
      await import('@xterm/xterm/css/xterm.css');
      if (disposed) return;
      const term = new XTerm({
        cursorBlink: true,
        scrollback: 1000,
        cols: 80,
        rows: 24,
        fontFamily: '"Fira Code", monospace',
        theme: {
          background: '#0f1317',
          foreground: '#f5f5f5',
          cursor: '#1793d1',
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
      fit.fit();
      term.focus();
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
      setTermReady(true);
    })();
    return () => {
      disposed = true;
      termRef.current?.dispose();
    };
    }, [opfsSupported, getDir, readFile, writeLine, prompt, handleInput, autocomplete, updateOverflow]);

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

  const activeOpacity = clampOpacity(
    profileSettings[selectedProfile]?.opacity ??
      DEFAULT_PROFILE_SETTINGS[selectedProfile].opacity,
  );

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
          <div className="w-[min(90vw,32rem)] rounded-lg bg-gray-900 p-5 shadow-lg space-y-5">
            <header>
              <h2 className="text-lg font-semibold text-white">Terminal profiles</h2>
              <p className="mt-1 text-sm text-gray-400">
                Switch between saved themes and tune the glass background opacity.
              </p>
            </header>
            <div className="space-y-3">
              {(Object.entries(TERMINAL_PROFILES) as [TerminalProfileKey, TerminalProfileDefinition][]).map(
                ([key, profile]) => {
                  const isActive = key === selectedProfile;
                  const profileOpacity = clampOpacity(
                    profileSettings[key]?.opacity ?? DEFAULT_PROFILE_SETTINGS[key].opacity,
                  );
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelectedProfile(key)}
                      className={`w-full rounded-md border px-3 py-3 text-left transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 focus:ring-offset-gray-900 ${
                        isActive
                          ? 'border-blue-500/80 bg-blue-500/10'
                          : 'border-white/10 bg-black/30 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-white">{profile.label}</p>
                          <p className="mt-1 text-xs text-gray-400">{profile.description}</p>
                        </div>
                        <span
                          className={`text-xs font-medium uppercase tracking-wide ${
                            isActive ? 'text-blue-300' : 'text-gray-500'
                          }`}
                        >
                          {isActive ? 'Active' : `${Math.round(profileOpacity * 100)}%`}
                        </span>
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        {profile.swatch.map((color) => (
                          <span
                            key={color}
                            className="h-4 w-8 rounded-sm border border-white/10"
                            style={{ background: color }}
                          />
                        ))}
                      </div>
                      <dl className="mt-3 grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
                        {profile.tokens.map((token) => (
                          <React.Fragment key={token.name}>
                            <dt className="font-mono text-gray-500">{token.name}</dt>
                            <dd className="font-mono text-right text-gray-200">{token.value}</dd>
                          </React.Fragment>
                        ))}
                      </dl>
                    </button>
                  );
                },
              )}
            </div>
            <div>
              <label
                htmlFor="terminal-opacity"
                className="flex items-center justify-between text-sm font-medium text-gray-200"
              >
                <span>Background opacity</span>
                <span className="text-xs text-gray-400">{Math.round(activeOpacity * 100)}%</span>
              </label>
              <input
                id="terminal-opacity"
                type="range"
                min="0.3"
                max="1"
                step="0.05"
                value={activeOpacity}
                onChange={(event) => {
                  const value = clampOpacity(Number(event.target.value));
                  setProfileSettings((prev) => ({
                    ...prev,
                    [selectedProfile]: { opacity: value },
                  }));
                }}
                className="mt-2 w-full accent-blue-400"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white shadow"
                onClick={() => {
                  setSettingsOpen(false);
                  termRef.current?.focus();
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-2 bg-gray-800 p-1">
          <button onClick={handleCopy} aria-label="Copy">
            <CopyIcon />
          </button>
          <button onClick={handlePaste} aria-label="Paste">
            <PasteIcon />
          </button>
          <button onClick={() => setSettingsOpen(true)} aria-label="Settings">
            <SettingsIcon />
          </button>
        </div>
        <div className="relative">
          <TerminalContainer
            ref={containerRef}
            className="resize overflow-hidden font-mono"
            style={{
              width: '80ch',
              height: '24em',
              fontSize: 'clamp(1rem, 0.6vw + 1rem, 1.1rem)',
              lineHeight: 1.4,
            }}
          />
          {overflow.top && (
            <div className="pointer-events-none absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-black" />
          )}
          {overflow.bottom && (
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-black" />
          )}
        </div>
      </div>
    </div>
  );
});

TerminalApp.displayName = 'TerminalApp';

export default TerminalApp;
