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
import useOPFS from '../../hooks/useOPFS';
import commandRegistry, { CommandContext } from './commands';
import TerminalContainer from './components/Terminal';
import { createSessionManager } from './utils/sessionManager';

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
    clear: () => {},
    openApp,
    listCommands: () => Object.keys(registryRef.current),
  });
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteInput, setPaletteInput] = useState('');
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
      const historyColor = '\x1b[38;2;206;214;227m';
      const reset = '\x1b[0m';
      const hasAnsi = /\x1b\[[0-9;]*m/.test(text);
      const content =
        text.length === 0 ? '' : hasAnsi ? text : `${historyColor}${text}${reset}`;
      if (termRef.current) termRef.current.writeln(content);
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
    const accent = '\x1b[38;2;125;196;255m';
    const userColor = '\x1b[38;2;166;227;161m';
    const hostColor = '\x1b[38;2;148;196;255m';
    const pathColor = '\x1b[38;2;248;196;108m';
    const symbolColor = '\x1b[38;2;234;241;252m';
    const reset = '\x1b[0m';
    termRef.current.writeln(
      `${accent}┌──(${reset}${userColor}kali${reset}${accent}㉿${reset}${hostColor}kali${reset}${accent})-[${reset}${pathColor}~${reset}${accent}]${reset}`,
    );
    termRef.current.write(`${accent}└─${reset} ${symbolColor}$${reset} `);
  }, []);

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
      }),
    [prompt, writeLine],
  );

  const clearTerminal = useCallback(() => {
    termRef.current?.clear();
    contentRef.current = '';
    if (opfsSupported && dirRef.current) {
      deleteFile('history.txt', dirRef.current);
    }
    setOverflow({ top: false, bottom: false });
    sessionManager.setBuffer('');
  }, [opfsSupported, deleteFile, sessionManager]);


  const handleCopy = () => {
    navigator.clipboard.writeText(contentRef.current).catch(() => {});
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      sessionManager.handlePaste(text);
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

  contextRef.current.writeLine = writeLine;
  contextRef.current.runWorker = runWorker;
  contextRef.current.clear = clearTerminal;
  contextRef.current.openApp = openApp;
  contextRef.current.listCommands = () => Object.keys(registryRef.current);
  contextRef.current.files = filesRef.current;
  contextRef.current.history = historyRef.current;
  contextRef.current.aliases = aliasesRef.current;

  useEffect(() => {
    if (typeof Worker === 'function') {
      workerRef.current = new Worker(
        new URL('../../workers/terminal-worker.ts', import.meta.url),
      );
    }
    return () => workerRef.current?.terminate();
  }, []);

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
        fontFamily: '"Fira Code", monospace',
        fontSize: 15,
        letterSpacing: 0.75,
        lineHeight: 1.38,
        theme: {
          background: '#080d12',
          foreground: '#e3eaf6',
          cursor: '#5cc8ff',
          cursorAccent: '#080d12',
          selection: '#1c2a3b',
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
      if (opfsSupported) {
        dirRef.current = await getDir('terminal');
        const existing = await readFile('history.txt', dirRef.current || undefined);
        if (existing) {
          const historyColor = '\x1b[38;2;206;214;227m';
          const reset = '\x1b[0m';
          existing
            .split('\n')
            .filter(Boolean)
            .forEach((l) => {
              if (termRef.current)
                termRef.current.writeln(
                  /\x1b\[[0-9;]*m/.test(l) ? l : `${historyColor}${l}${reset}`,
                );
            });
          contentRef.current = existing.endsWith('\n')
            ? existing
            : `${existing}\n`;
        }
      }
      writeLine('Welcome to the web terminal!');
      writeLine('Type "help" to see available commands.');
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
    }, [opfsSupported, getDir, readFile, writeLine, prompt, sessionManager, updateOverflow]);

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
      <div className="flex h-full flex-col">
        <div
          className="flex flex-wrap items-center gap-2 border-b border-slate-700/70 bg-slate-900/80 p-2 text-slate-100 shadow-inner backdrop-blur"
          role="toolbar"
          aria-label="Terminal controls"
        >
          <button
            onClick={handleCopy}
            aria-label="Copy"
            className="inline-flex items-center rounded-md border border-slate-700/60 bg-slate-800/70 p-1 text-slate-200 transition hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
          >
            <CopyIcon />
          </button>
          <button
            onClick={handlePaste}
            aria-label="Paste"
            className="inline-flex items-center rounded-md border border-slate-700/60 bg-slate-800/70 p-1 text-slate-200 transition hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
          >
            <PasteIcon />
          </button>
          <button
            onClick={() => setSettingsOpen(true)}
            aria-label="Settings"
            className="inline-flex items-center rounded-md border border-slate-700/60 bg-slate-800/70 p-1 text-slate-200 transition hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
          >
            <SettingsIcon />
          </button>
        </div>
        <div className="relative flex-1 min-h-0">
          <TerminalContainer
            ref={containerRef}
            className="h-full w-full overflow-hidden font-mono"
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
