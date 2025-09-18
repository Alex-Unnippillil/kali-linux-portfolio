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
import useOPFS from '../../hooks/useOPFS';
import commandRegistry, { CommandContext } from './commands';
import TerminalContainer from './components/Terminal';
import type { TerminalCommand } from '../../data/terminal-commands';
import { TERMINAL_COMMANDS } from '../../data/terminal-commands';

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
  const [paletteQuery, setPaletteQuery] = useState('');
  const [paletteIndex, setPaletteIndex] = useState(0);
  const paletteInputRef = useRef<HTMLInputElement | null>(null);
  const filteredCommands = useMemo(() => {
    const query = paletteQuery.trim().toLowerCase();
    if (!query) return TERMINAL_COMMANDS;
    return TERMINAL_COMMANDS.filter(
      ({ title, snippet, description, keywords = [] }: TerminalCommand) => {
        const haystack = [title, snippet, description, ...keywords]
          .join(' ')
          .toLowerCase();
        return haystack.includes(query);
      },
    );
  }, [paletteQuery]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { supported: opfsSupported, getDir, readFile, writeFile, deleteFile } =
    useOPFS();
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

  const setCommandBuffer = useCallback(
    (value: string) => {
      if (!termRef.current) return;
      termRef.current.write('\u001b[2K\r');
      prompt();
      if (value) termRef.current.write(value);
      commandRef.current = value;
    },
    [prompt],
  );

  const openCommandPalette = useCallback(() => {
    setPaletteOpen(true);
    setPaletteQuery('');
    setPaletteIndex(0);
    termRef.current?.blur();
  }, []);

  const closeCommandPalette = useCallback(() => {
    setPaletteOpen(false);
    setPaletteQuery('');
    setPaletteIndex(0);
    termRef.current?.focus();
  }, []);

  const handlePaletteConfirm = useCallback(
    (entry?: TerminalCommand) => {
      const snippet = entry?.snippet ?? paletteQuery.trim();
      if (!snippet) {
        closeCommandPalette();
        return;
      }
      setCommandBuffer(snippet);
      closeCommandPalette();
    },
    [paletteQuery, closeCommandPalette, setCommandBuffer],
  );

  const handlePaletteKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        event.stopPropagation();
        setPaletteIndex((index) => {
          if (!filteredCommands.length) return 0;
          return Math.min(index + 1, filteredCommands.length - 1);
        });
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        event.stopPropagation();
        setPaletteIndex((index) => {
          if (!filteredCommands.length) return 0;
          return Math.max(index - 1, 0);
        });
        return;
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        event.stopPropagation();
        const selection =
          filteredCommands.length > 0
            ? filteredCommands[Math.min(paletteIndex, filteredCommands.length - 1)]
            : undefined;
        handlePaletteConfirm(selection);
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        closeCommandPalette();
      }
    },
    [
      filteredCommands,
      paletteIndex,
      handlePaletteConfirm,
      closeCommandPalette,
    ],
  );

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
            if (match) {
              setCommandBuffer(match);
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
      termRef.current?.dispose();
    };
    }, [
      opfsSupported,
      getDir,
      readFile,
      writeLine,
      prompt,
      handleInput,
      autocomplete,
      updateOverflow,
      setCommandBuffer,
    ]);

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
        if (paletteOpen) closeCommandPalette();
        else openCommandPalette();
      }
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [paletteOpen, openCommandPalette, closeCommandPalette]);

  useEffect(() => {
    if (!paletteOpen) return;
    setPaletteIndex(0);
  }, [paletteOpen, paletteQuery]);

  useEffect(() => {
    if (!paletteOpen) return;
    const focusInput = () => {
      if (paletteInputRef.current) {
        paletteInputRef.current.focus();
        paletteInputRef.current.select();
      }
    };
    if (typeof requestAnimationFrame === 'function') {
      const frame = requestAnimationFrame(focusInput);
      return () => cancelAnimationFrame(frame);
    }
    const timeout = setTimeout(focusInput, 0);
    return () => clearTimeout(timeout);
  }, [paletteOpen]);

  const activeOptionId = useMemo(() => {
    if (!filteredCommands.length) return undefined;
    const index = Math.min(paletteIndex, filteredCommands.length - 1);
    return `terminal-command-${filteredCommands[index].id}`;
  }, [filteredCommands, paletteIndex]);

  return (
    <div className="relative h-full w-full">
      {paletteOpen && (
        <div className="absolute inset-0 z-20 flex items-start justify-center bg-black/70 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            className="mt-16 w-full max-w-xl rounded-lg border border-slate-700 bg-slate-900/95 p-5 shadow-2xl"
          >
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.25em] text-slate-300">
                  Command palette
                  <input
                    ref={paletteInputRef}
                    value={paletteQuery}
                    onChange={(event) => setPaletteQuery(event.target.value)}
                    onKeyDown={handlePaletteKeyDown}
                    placeholder="Search terminal snippets…"
                    className="mt-2 w-full rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 font-mono text-sm text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                    aria-controls="terminal-command-list"
                    aria-expanded={true}
                    aria-activedescendant={activeOptionId}
                    role="combobox"
                    autoComplete="off"
                  />
                </label>
              </div>
              <div className="max-h-64 overflow-y-auto rounded-md border border-slate-800 bg-black/40">
                {filteredCommands.length === 0 ? (
                  <p className="px-4 py-6 text-sm text-slate-400">
                    No commands match{' '}
                    <span className="font-semibold text-slate-200">{paletteQuery || 'your search'}</span>.
                  </p>
                ) : (
                  <ul
                    id="terminal-command-list"
                    role="listbox"
                    aria-label="Terminal command suggestions"
                    className="divide-y divide-slate-800"
                  >
                    {filteredCommands.map((command, index) => {
                      const clampedIndex = Math.min(paletteIndex, filteredCommands.length - 1);
                      const isActive = index === clampedIndex;
                      const optionId = `terminal-command-${command.id}`;
                      return (
                        <li key={command.id}>
                          <button
                            type="button"
                            id={optionId}
                            role="option"
                            aria-selected={isActive}
                            className={`w-full px-3 py-2 text-left transition-colors focus:outline-none ${
                              isActive
                                ? 'bg-sky-500/30 text-slate-50'
                                : 'text-slate-200 hover:bg-slate-700/40 focus:bg-slate-700/40'
                            }`}
                            onMouseEnter={() => setPaletteIndex(index)}
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => handlePaletteConfirm(command)}
                          >
                            <div className="flex items-center justify-between gap-4">
                              <span className="font-mono text-sm">{command.title}</span>
                              <span className="text-[10px] uppercase tracking-wider text-slate-300/80">
                                snippet
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-slate-300/90">{command.description}</p>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Press Enter to insert into the active session.</span>
                <span>Esc to close</span>
              </div>
            </div>
          </div>
        </div>
      )}
      {settingsOpen && (
        <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center z-10">
          <div className="bg-gray-900 p-4 rounded space-y-4">
            <div className="grid grid-cols-8 gap-2">
              {ansiColors.map((c, i) => (
                <div key={i} className="h-4 w-4 rounded" style={{ backgroundColor: c }} />
              ))}
            </div>
            <pre className="text-sm leading-snug">
              <span className="text-blue-400">bin</span>{' '}
              <span className="text-green-400">script.sh</span>{' '}
              <span className="text-gray-300">README.md</span>
            </pre>
            <div className="flex justify-end gap-2">
              <button
                className="px-2 py-1 bg-gray-700 rounded"
                onClick={() => {
                  setSettingsOpen(false);
                  termRef.current?.focus();
                }}
              >
                Cancel
              </button>
              <button
                className="px-2 py-1 bg-blue-600 rounded"
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
