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
import usePersistentState from '../../hooks/usePersistentState';
import commandRegistry, { CommandContext } from './commands';
import TerminalContainer from './components/Terminal';
import { exoOpen } from '../../src/lib/exo-open';
import { TERMINAL_THEMES } from './themes';

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
  openApp?: (id: string, arg?: string) => void;
  scheme?: string;
  opacity?: number;
  onSettingsChange?: (scheme: string, opacity: number) => void;
}

export interface TerminalHandle {
  runCommand: (cmd: string) => void;
  getContent: () => string;
}

const files: Record<string, string> = {
  'README.md': 'Welcome to the web terminal.\nThis is a fake file used for demos.',
};

const hexToRgba = (hex: string, alpha: number) => {
  const sanitized = hex.replace('#', '');
  const num = parseInt(sanitized, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const TerminalApp = forwardRef<TerminalHandle, TerminalProps>(
  ({ openApp, scheme = 'Kali-Dark', opacity = 1, onSettingsChange }, ref) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const termRef = useRef<any>(null);
  const fitRef = useRef<any>(null);
  const searchRef = useRef<any>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const commandRef = useRef('');
  const contentRef = useRef('');
  const registryRef = useRef(commandRegistry);
  const workerRef = useRef<Worker | null>(null);
  const filesRef = useRef<Record<string, string>>(files);
  const aliasesRef = useRef<Record<string, string>>({});
  const historyRef = useRef<string[]>([]);
  const hintRef = useRef('');
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
  const [runHistory, setRunHistory] = usePersistentState<string[]>('terminal:run-history', []);
  const runHistIndexRef = useRef(runHistory.length);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsScheme, setSettingsScheme] = useState(scheme);
  const [settingsOpacity, setSettingsOpacity] = useState(opacity);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [linkMenu, setLinkMenu] = useState<{
    x: number;
    y: number;
    uri: string;
  } | null>(null);
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

  const renderHint = useCallback(() => {
    const term = termRef.current;
    const current = commandRef.current;
    if (!term || !current) {
      if (hintRef.current) {
        term?.write('\u001b[s\u001b[0K\u001b[u');
        hintRef.current = '';
      }
      return;
    }
    const historyMatch = [...historyRef.current]
      .reverse()
      .find((c) => c.startsWith(current) && c !== current);
    const registryMatch = Object.keys(registryRef.current).find(
      (c) => c.startsWith(current) && c !== current,
    );
    const match = historyMatch || registryMatch || '';
    const hint = match ? match.slice(current.length) : '';
    if (hintRef.current === hint) return;
    hintRef.current = hint;
    term.write('\u001b[s\u001b[0K');
    if (hint) term.write(`\u001b[90m${hint}\u001b[0m`);
    term.write('\u001b[u');
  }, []);

  const prompt = useCallback(() => {
    if (termRef.current) {
      termRef.current.write('┌──(🦊 kali)\r\n└─❯ ');
      renderHint();
    }
  }, [renderHint]);

  const handleCopy = () => {
    navigator.clipboard.writeText(contentRef.current).catch(() => {});
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const lines = text.split(/\r?\n/).length;
      if (lines > 1 && !window.confirm(`Paste ${lines} lines?`)) return;
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
    if (!termRef.current || !containerRef.current) return;
    const preset = TERMINAL_THEMES[scheme as keyof typeof TERMINAL_THEMES];
    const bg = hexToRgba(preset.background, opacity);
    termRef.current.options.theme = { ...preset, background: bg };
    containerRef.current.style.backgroundColor = bg;
    containerRef.current.style.color = preset.foreground;
  }, [scheme, opacity]);

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
        writeLine('Note: command output is simulated.');
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
        renderHint();
      } else if (matches.length > 1) {
        writeLine(matches.join('  '));
        prompt();
        termRef.current?.write(commandRef.current);
        renderHint();
      }
    }, [prompt, renderHint, writeLine]);

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
              renderHint();
            }
          } else {
            commandRef.current += ch;
            termRef.current?.write(ch);
            renderHint();
          }
        }
      },
      [runCommand, prompt, renderHint],
    );

  useImperativeHandle(ref, () => ({
    runCommand: (c: string) => runCommand(c),
    getContent: () => contentRef.current,
  }));

  useEffect(() => {
    let disposed = false;
    const handlePasteEvent = (e: ClipboardEvent) => {
      const text = e.clipboardData?.getData('text') || '';
      const lines = text.split(/\r?\n/).length;
      if (lines > 1 && !window.confirm(`Paste ${lines} lines?`)) {
        e.preventDefault();
        return;
      }
      e.preventDefault();
      handleInput(text);
    };
    const handleLinkContext = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.tagName === 'A' && target.getAttribute('data-uri')) {
        e.preventDefault();
        setLinkMenu({
          x: e.pageX,
          y: e.pageY,
          uri: target.getAttribute('data-uri')!,
        });
      }
    };
    const container = containerRef.current;
    (async () => {
      const [
        { Terminal: XTerm },
        { FitAddon },
        { SearchAddon },
        { WebLinksAddon },
      ] = await Promise.all([
        import('@xterm/xterm'),
        import('@xterm/addon-fit'),
        import('@xterm/addon-search'),
        import('@xterm/addon-web-links'),
      ]);
      await import('@xterm/xterm/css/xterm.css');
      if (disposed) return;
      const term = new XTerm({
        cursorBlink: true,
        scrollback: 1000,
        cols: 80,
        rows: 24,
      });
      const fit = new FitAddon();
      const search = new SearchAddon();
      const webLinks = new WebLinksAddon((e: MouseEvent, uri: string) => {
        e.preventDefault();
        void exoOpen('WebBrowser', openApp ?? (() => {}), uri);
      });
      termRef.current = term;
      fitRef.current = fit;
      searchRef.current = search;
      term.loadAddon(fit);
      term.loadAddon(search);
      term.loadAddon(webLinks);
      term.open(container!);
      fit.fit();
      term.focus();
      const textarea = term.textarea;
      textarea?.addEventListener('paste', handlePasteEvent);
      container?.addEventListener('contextmenu', handleLinkContext);
      const preset = TERMINAL_THEMES[scheme as keyof typeof TERMINAL_THEMES];
      const bg = hexToRgba(preset.background, opacity);
      if (term?.options) {
        term.options.theme = { ...preset, background: bg };
      }
      if (container) {
        container.style.backgroundColor = bg;
        container.style.color = preset.foreground;
      }
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
          setSearchOpen(true);
          setTimeout(() => searchInputRef.current?.focus(), 0);
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
      termRef.current?.dispose();
      const textarea = termRef.current?.textarea;
      textarea?.removeEventListener('paste', handlePasteEvent);
      container?.removeEventListener('contextmenu', handleLinkContext);
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
      openApp,
      scheme,
      opacity,
    ]);

  useEffect(() => {
    const handleFit = () => fitRef.current?.fit();
    let observer: ResizeObserver | undefined;
    const root = containerRef.current?.closest('[data-app-id]') as HTMLElement | null;

    const handleTiling = () => requestAnimationFrame(handleFit);

    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(handleFit);
      if (containerRef.current) observer.observe(containerRef.current);
    }
    window.addEventListener('resize', handleFit);
    root?.addEventListener('super-arrow', handleTiling);
    root?.addEventListener('transitionend', handleFit);
    return () => {
      window.removeEventListener('resize', handleFit);
      root?.removeEventListener('super-arrow', handleTiling);
      root?.removeEventListener('transitionend', handleFit);
      observer?.disconnect();
    };
  }, []);

  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setPaletteOpen((v) => {
          const next = !v;
          if (next) {
            runHistIndexRef.current = runHistory.length;
            termRef.current?.blur();
          } else {
            termRef.current?.focus();
          }
          return next;
        });
      }
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [paletteOpen, runHistory]);

  useEffect(() => {
    if (!linkMenu) return;
    const handleClick = () => setLinkMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [linkMenu]);

  return (
    <div className="relative h-full w-full">
      {paletteOpen && (
        <div className="absolute inset-0 bg-black bg-opacity-75 flex items-start justify-center z-10">
          <div className="mt-10 w-80 bg-gray-800 p-4 rounded">
            <input
              autoFocus
              className="w-full mb-2 bg-black text-white p-2"
              aria-label="command palette"
              value={paletteInput}
              onChange={(e) => setPaletteInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  runCommand(paletteInput);
                  setRunHistory((h) => {
                    const next = [...h, paletteInput].slice(-50);
                    runHistIndexRef.current = next.length;
                    return next;
                  });
                  setPaletteInput('');
                  setPaletteOpen(false);
                  termRef.current?.focus();
                } else if (e.key === 'Escape') {
                  setPaletteOpen(false);
                  termRef.current?.focus();
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  if (runHistIndexRef.current > 0) {
                    runHistIndexRef.current -= 1;
                    setPaletteInput(runHistory[runHistIndexRef.current] || '');
                  }
                } else if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  if (runHistIndexRef.current < runHistory.length) {
                    runHistIndexRef.current += 1;
                    if (runHistIndexRef.current === runHistory.length) {
                      setPaletteInput('');
                    } else {
                      setPaletteInput(runHistory[runHistIndexRef.current] || '');
                    }
                  }
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
          <div className="bg-gray-900 p-4 rounded space-y-4 text-white">
            <label className="flex flex-col">
              <span className="mb-1">Color Scheme</span>
              <select
                className="bg-gray-800 p-1 rounded"
                value={settingsScheme}
                onChange={(e) => setSettingsScheme(e.target.value)}
              >
                {Object.keys(TERMINAL_THEMES).map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col">
              <span className="mb-1">
                Background Opacity: {Math.round(settingsOpacity * 100)}%
              </span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={settingsOpacity}
                onChange={(e) =>
                  setSettingsOpacity(parseFloat(e.target.value))
                }
                aria-label="background opacity"
              />
            </label>
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
                  onSettingsChange?.(settingsScheme, settingsOpacity);
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
          <button
            onClick={() => {
              setSettingsScheme(scheme);
              setSettingsOpacity(opacity);
              setSettingsOpen(true);
            }}
            aria-label="Settings"
          >
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
          {searchOpen && (
            <div className="absolute bottom-1 left-1 right-1 z-20">
              <input
                ref={searchInputRef}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  searchRef.current?.findNext(e.target.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    searchRef.current?.findNext(searchQuery);
                  } else if (e.key === 'Escape') {
                    setSearchOpen(false);
                    setSearchQuery('');
                    termRef.current?.focus();
                  }
                }}
                className="w-full bg-black text-white p-1"
                aria-label="search terminal"
              />
            </div>
          )}
          {linkMenu && (
            <div
              className="absolute z-20 bg-gray-800 text-white border border-gray-900 rounded"
              style={{ left: linkMenu.x, top: linkMenu.y }}
            >
              <button
                className="block w-full text-left px-2 py-1 hover:bg-gray-700"
                onClick={() => {
                  void exoOpen('WebBrowser', openApp ?? (() => {}), linkMenu.uri);
                  setLinkMenu(null);
                }}
              >
                Open
              </button>
              <button
                className="block w-full text-left px-2 py-1 hover:bg-gray-700"
                onClick={() => {
                  navigator.clipboard.writeText(`curl ${linkMenu.uri}`);
                  setLinkMenu(null);
                }}
              >
                Copy as cURL
              </button>
            </div>
          )}
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
