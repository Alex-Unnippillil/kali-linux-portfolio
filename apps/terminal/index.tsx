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
import type { ISearchOptions } from '@xterm/addon-search';
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
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchCaseSensitive, setSearchCaseSensitive] = useState(false);
  const [searchWrap, setSearchWrap] = useState(true);
  const [searchResults, setSearchResults] = useState({ index: -1, count: 0 });
  const [searchMessage, setSearchMessage] = useState<string | null>(null);
  const [searchReady, setSearchReady] = useState(false);
  const { supported: opfsSupported, getDir, readFile, writeFile, deleteFile } =
    useOPFS();
  const dirRef = useRef<FileSystemDirectoryHandle | null>(null);
  const [overflow, setOverflow] = useState({ top: false, bottom: false });
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const searchOptionsRef = useRef<ISearchOptions>({ caseSensitive: false });
  const searchMetaRef = useRef({ index: -1, count: 0 });
  const searchQueryRef = useRef('');
  const suppressWrapRef = useRef(false);
  const lastSearchDirectionRef = useRef<'next' | 'prev' | null>(null);
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
  const searchOptions = useMemo<ISearchOptions>(
    () => ({
      caseSensitive: searchCaseSensitive,
      decorations: {
        matchBackground: '#2563EB',
        matchBorder: '#1E3A8A',
        matchOverviewRuler: '#60A5FA',
        activeMatchBackground: '#1D4ED8',
        activeMatchBorder: '#BFDBFE',
        activeMatchColorOverviewRuler: '#2563EB',
      },
    }),
    [searchCaseSensitive],
  );

  useEffect(() => {
    searchOptionsRef.current = searchOptions;
  }, [searchOptions]);

  useEffect(() => {
    searchQueryRef.current = searchQuery;
  }, [searchQuery]);

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

  const runSearch = useCallback(
    (direction: 'next' | 'prev' | 'initial' = 'next') => {
      const addon = searchRef.current;
      const term = termRef.current;
      if (!addon || !term) return;

      if (!searchQuery) {
        addon.clearDecorations();
        term.clearSelection?.();
        const emptyMeta = { index: -1, count: 0 };
        searchMetaRef.current = emptyMeta;
        setSearchResults(emptyMeta);
        setSearchMessage(null);
        return;
      }

      if (direction === 'initial') {
        suppressWrapRef.current = true;
        lastSearchDirectionRef.current = null;
        const emptyMeta = { index: -1, count: 0 };
        searchMetaRef.current = emptyMeta;
        setSearchResults(emptyMeta);
        setSearchMessage(null);
      } else {
        lastSearchDirectionRef.current = direction;
      }

      const options =
        direction === 'initial'
          ? { ...searchOptionsRef.current, incremental: true }
          : searchOptionsRef.current;

      const found =
        direction === 'prev'
          ? addon.findPrevious(searchQuery, options)
          : addon.findNext(searchQuery, options);

      if (!found) {
        const emptyMeta = { index: -1, count: 0 };
        searchMetaRef.current = emptyMeta;
        setSearchResults(emptyMeta);
        setSearchMessage('No matches');
        addon.clearDecorations();
        term.clearSelection?.();
      }
    },
    [searchQuery],
  );

  const handleSearchNavigation = useCallback(
    (direction: 'next' | 'prev') => {
      runSearch(direction);
      requestAnimationFrame(() => {
        searchInputRef.current?.focus();
      });
    },
    [runSearch],
  );

  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    setSearchMessage(null);
    const emptyMeta = { index: -1, count: 0 };
    searchMetaRef.current = emptyMeta;
    setSearchResults(emptyMeta);
    lastSearchDirectionRef.current = null;
    suppressWrapRef.current = false;
    searchRef.current?.clearDecorations();
    termRef.current?.clearSelection?.();
    if (!paletteOpen && !settingsOpen) {
      termRef.current?.focus();
    }
  }, [paletteOpen, settingsOpen]);

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
      setSearchReady(true);
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
        } else if (
          (domEvent.ctrlKey || domEvent.metaKey) &&
          domEvent.key.toLowerCase() === 'f'
        ) {
          domEvent.preventDefault();
          const selection = termRef.current?.getSelection?.() ?? '';
          setSearchMessage(null);
          setSearchOpen(true);
          if (selection) {
            setSearchQuery(selection);
          }
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
      setSearchReady(false);
    };
    }, [opfsSupported, getDir, readFile, writeLine, prompt, handleInput, autocomplete, updateOverflow]);

  useEffect(() => {
    const addon = searchRef.current;
    if (
      !searchReady ||
      !addon ||
      typeof addon.onDidChangeResults !== 'function'
    ) {
      return;
    }
    const disposable = addon.onDidChangeResults(
      ({ resultIndex, resultCount }) => {
        if (suppressWrapRef.current) {
          suppressWrapRef.current = false;
        } else if (
          !searchWrap &&
          searchQueryRef.current &&
          resultCount > 0 &&
          searchMetaRef.current.index !== -1
        ) {
          const previousIndex = searchMetaRef.current.index;
          const direction = lastSearchDirectionRef.current;
          if (
            direction === 'next' &&
            resultIndex !== -1 &&
            previousIndex !== -1 &&
            resultIndex < previousIndex
          ) {
            setSearchMessage('Reached end of results');
            suppressWrapRef.current = true;
            searchRef.current?.findPrevious(
              searchQueryRef.current,
              searchOptionsRef.current,
            );
            return;
          }
          if (
            direction === 'prev' &&
            resultIndex !== -1 &&
            previousIndex !== -1 &&
            resultIndex > previousIndex
          ) {
            setSearchMessage('Reached start of results');
            suppressWrapRef.current = true;
            searchRef.current?.findNext(
              searchQueryRef.current,
              searchOptionsRef.current,
            );
            return;
          }
        }

        if (!suppressWrapRef.current && resultCount > 0 && resultIndex !== -1) {
          setSearchMessage((msg) =>
            msg && msg.startsWith('Reached') ? null : msg,
          );
        }

        const meta = { index: resultIndex, count: resultCount };
        searchMetaRef.current = meta;
        setSearchResults(meta);
      },
    );
    return () => disposable?.dispose?.();
  }, [searchReady, searchWrap]);

  useEffect(() => {
    if (searchOpen) {
      runSearch('initial');
    }
  }, [searchOpen, searchCaseSensitive, searchQuery, runSearch]);

  useEffect(() => {
    if (searchOpen) {
      termRef.current?.blur();
      const handle = requestAnimationFrame(() => {
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      });
      return () => cancelAnimationFrame(handle);
    }
    if (!paletteOpen && !settingsOpen) {
      termRef.current?.focus();
    }
  }, [searchOpen, paletteOpen, settingsOpen]);

  useEffect(() => {
    if (searchWrap) {
      setSearchMessage((msg) =>
        msg && msg.startsWith('Reached') ? null : msg,
      );
    }
  }, [searchWrap]);

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
          {searchOpen && (
            <div className="absolute top-2 right-2 z-20 w-72 rounded-lg border border-gray-700 bg-gray-900/95 p-3 shadow-lg">
              <div className="flex items-center gap-2">
                <input
                  ref={searchInputRef}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (e.shiftKey) handleSearchNavigation('prev');
                      else handleSearchNavigation('next');
                    } else if (e.key === 'Escape') {
                      e.preventDefault();
                      closeSearch();
                    }
                  }}
                  placeholder="Search terminal..."
                  className="flex-1 rounded bg-gray-800 px-2 py-1 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  className="rounded bg-gray-800 px-2 py-1 text-xs text-gray-100 hover:bg-gray-700 disabled:opacity-50"
                  onClick={() => handleSearchNavigation('prev')}
                  disabled={!searchQuery || searchResults.count === 0}
                >
                  Prev
                </button>
                <button
                  type="button"
                  className="rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-500 disabled:opacity-50"
                  onClick={() => handleSearchNavigation('next')}
                  disabled={!searchQuery || searchResults.count === 0}
                >
                  Next
                </button>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-gray-300">
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={searchCaseSensitive}
                      onChange={(e) => setSearchCaseSensitive(e.target.checked)}
                      className="h-3 w-3 accent-blue-500"
                    />
                    <span>Case</span>
                  </label>
                  <label className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={searchWrap}
                      onChange={(e) => setSearchWrap(e.target.checked)}
                      className="h-3 w-3 accent-blue-500"
                    />
                    <span>Wrap</span>
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <span>
                    {searchResults.count > 0
                      ? `${searchResults.index >= 0 ? searchResults.index + 1 : '–'}/${searchResults.count}`
                      : '0/0'}
                  </span>
                  <button
                    type="button"
                    onClick={closeSearch}
                    className="rounded p-1 text-gray-400 hover:text-white"
                    aria-label="Close search"
                  >
                    ×
                  </button>
                </div>
              </div>
              {searchMessage && (
                <div className="mt-2 text-xs text-amber-300">{searchMessage}</div>
              )}
            </div>
          )}
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
