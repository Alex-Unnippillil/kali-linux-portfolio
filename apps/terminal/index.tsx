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
  const rectangularSelectionRef = useRef('');
  const altSelectionRef = useRef<{
    active: boolean;
    anchor: {
      column: number;
      bufferRow: number;
      viewportRow: number;
    } | null;
    last: {
      column: number;
      bufferRow: number;
      viewportRow: number;
    } | null;
    overlay: HTMLDivElement | null;
    cellSize: { width: number; height: number } | null;
  }>({
    active: false,
    anchor: null,
    last: null,
    overlay: null,
    cellSize: null,
  });
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
  const [clipboardAvailable, setClipboardAvailable] = useState(false);
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

  useEffect(() => {
    setClipboardAvailable(
      typeof navigator !== 'undefined' &&
        !!navigator.clipboard &&
        typeof navigator.clipboard.writeText === 'function' &&
        typeof navigator.clipboard.readText === 'function',
    );
  }, []);

  const handleCopy = useCallback(() => {
    if (!clipboardAvailable) return;
    const term = termRef.current;
    const selected = term?.getSelection?.();
    const text =
      rectangularSelectionRef.current ||
      (selected && selected.length > 0 ? selected : contentRef.current);
    const result = navigator.clipboard?.writeText(text);
    if (result && typeof (result as Promise<unknown>).catch === 'function') {
      (result as Promise<unknown>).catch(() => {});
    }
    rectangularSelectionRef.current = '';
  }, [clipboardAvailable]);

  const handlePaste = useCallback(async () => {
    if (!clipboardAvailable) return;
    try {
      const text = await navigator.clipboard?.readText();
      if (text) {
        handleInput(text);
      }
    } catch {}
  }, [clipboardAvailable, handleInput]);

  useImperativeHandle(ref, () => ({
    runCommand: (c: string) => runCommand(c),
    getContent: () => contentRef.current,
  }));

  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | undefined;
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

      const container = containerRef.current;
      const termElement: HTMLElement | null = term.element;
      const ensureOverlay = () => {
        if (!altSelectionRef.current.overlay && container) {
          const overlay = document.createElement('div');
          overlay.style.position = 'absolute';
          overlay.style.pointerEvents = 'none';
          overlay.style.background = 'rgba(23, 147, 209, 0.25)';
          overlay.style.border = '1px solid #1793d1';
          overlay.style.zIndex = '5';
          container.appendChild(overlay);
          altSelectionRef.current.overlay = overlay;
        }
      };

      const clearOverlay = () => {
        const overlay = altSelectionRef.current.overlay;
        if (overlay?.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }
        altSelectionRef.current.overlay = null;
      };

      const updateOverlay = (
        start: { column: number; viewportRow: number },
        current: { column: number; viewportRow: number },
        cellSize: { width: number; height: number },
      ) => {
        if (!altSelectionRef.current.overlay) return;
        const leftColumn = Math.min(start.column, current.column);
        const rightColumn = Math.max(start.column, current.column) + 1;
        const topRow = Math.min(start.viewportRow, current.viewportRow);
        const bottomRow = Math.max(start.viewportRow, current.viewportRow) + 1;
        altSelectionRef.current.overlay.style.left = `${leftColumn * cellSize.width}px`;
        altSelectionRef.current.overlay.style.top = `${topRow * cellSize.height}px`;
        altSelectionRef.current.overlay.style.width = `${
          (rightColumn - leftColumn) * cellSize.width
        }px`;
        altSelectionRef.current.overlay.style.height = `${
          (bottomRow - topRow) * cellSize.height
        }px`;
        altSelectionRef.current.overlay.style.display = 'block';
      };

      const getBufferCoords = (event: MouseEvent) => {
        if (!termElement) return null;
        const rect = termElement.getBoundingClientRect();
        if (!rect.width || !rect.height) return null;
        const cellWidth = rect.width / term.cols;
        const cellHeight = rect.height / term.rows;
        const offsetX = event.clientX - rect.left;
        const offsetY = event.clientY - rect.top;
        if (offsetX < 0 || offsetY < 0 || offsetX > rect.width || offsetY > rect.height)
          return null;
        const column = Math.min(
          term.cols - 1,
          Math.max(0, Math.floor(offsetX / cellWidth)),
        );
        const viewportRow = Math.min(
          term.rows - 1,
          Math.max(0, Math.floor(offsetY / cellHeight)),
        );
        const buffer = term.buffer?.active;
        const bufferRow = buffer ? buffer.viewportY + viewportRow : viewportRow;
        return {
          column,
          viewportRow,
          bufferRow,
          cellSize: { width: cellWidth, height: cellHeight },
        };
      };

      const finalizeAltSelection = () => {
        const { anchor, last } = altSelectionRef.current;
        const termBuffer = term.buffer?.active;
        if (!anchor || !termBuffer) {
          rectangularSelectionRef.current = '';
        } else {
          const end = last ?? anchor;
          const startRow = Math.min(anchor.bufferRow, end.bufferRow);
          const endRow = Math.max(anchor.bufferRow, end.bufferRow);
          const startCol = Math.min(anchor.column, end.column);
          const endCol = Math.max(anchor.column, end.column);
          const lines: string[] = [];
          for (let row = startRow; row <= endRow; row++) {
            const line = termBuffer.getLine?.(row);
            if (!line) continue;
            lines.push(line.translateToString(false, startCol, endCol + 1));
          }
          rectangularSelectionRef.current = lines.join('\n');
        }
        altSelectionRef.current.active = false;
        altSelectionRef.current.anchor = null;
        altSelectionRef.current.last = null;
        altSelectionRef.current.cellSize = null;
        if (altSelectionRef.current.overlay) {
          altSelectionRef.current.overlay.style.display = 'none';
        }
      };

      const handleMouseDown = (event: MouseEvent) => {
        if (event.detail === 3) {
          event.preventDefault();
          rectangularSelectionRef.current = '';
          const coords = getBufferCoords(event);
          const bufferRow = coords?.bufferRow;
          if (typeof bufferRow === 'number') {
            term.selectLines(bufferRow, bufferRow);
          }
          return;
        }
        if (event.altKey && event.button === 0) {
          const coords = getBufferCoords(event);
          if (!coords) return;
          event.preventDefault();
          ensureOverlay();
          altSelectionRef.current.active = true;
          altSelectionRef.current.anchor = {
            column: coords.column,
            bufferRow: coords.bufferRow,
            viewportRow: coords.viewportRow,
          };
          altSelectionRef.current.last = {
            column: coords.column,
            bufferRow: coords.bufferRow,
            viewportRow: coords.viewportRow,
          };
          altSelectionRef.current.cellSize = coords.cellSize;
          rectangularSelectionRef.current = '';
          term.clearSelection?.();
          updateOverlay(
            { column: coords.column, viewportRow: coords.viewportRow },
            { column: coords.column, viewportRow: coords.viewportRow },
            coords.cellSize,
          );
        }
      };

      const handleMouseMove = (event: MouseEvent) => {
        if (!altSelectionRef.current.active) return;
        const coords = getBufferCoords(event);
        if (!coords || !altSelectionRef.current.cellSize) return;
        event.preventDefault();
        altSelectionRef.current.last = {
          column: coords.column,
          bufferRow: coords.bufferRow,
          viewportRow: coords.viewportRow,
        };
        updateOverlay(
          altSelectionRef.current.anchor!,
          altSelectionRef.current.last!,
          altSelectionRef.current.cellSize,
        );
      };

      const handleMouseUp = (event: MouseEvent) => {
        if (!altSelectionRef.current.active) return;
        event.preventDefault();
        finalizeAltSelection();
      };

      termElement?.addEventListener('mousedown', handleMouseDown);
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);

      cleanup = () => {
        termElement?.removeEventListener('mousedown', handleMouseDown);
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        clearOverlay();
      };
    })();
    return () => {
      cleanup?.();
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
      if (!e.ctrlKey || !e.shiftKey) return;
      const key = e.key.toLowerCase();
      if (key === 'p') {
        e.preventDefault();
        setPaletteOpen((v) => {
          const next = !v;
          if (next) termRef.current?.blur();
          else termRef.current?.focus();
          return next;
        });
      } else if (key === 'c') {
        if (!clipboardAvailable) return;
        e.preventDefault();
        handleCopy();
      } else if (key === 'v') {
        if (!clipboardAvailable) return;
        e.preventDefault();
        handlePaste();
      }
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [clipboardAvailable, handleCopy, handlePaste]);

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
          <button
            onClick={handleCopy}
            aria-label="Copy"
            disabled={!clipboardAvailable}
            className={!clipboardAvailable ? 'opacity-50 cursor-not-allowed' : ''}
          >
            <CopyIcon />
          </button>
          <button
            onClick={handlePaste}
            aria-label="Paste"
            disabled={!clipboardAvailable}
            className={!clipboardAvailable ? 'opacity-50 cursor-not-allowed' : ''}
          >
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
