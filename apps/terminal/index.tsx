'use client';

import React, {
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from 'react';
import useOPFS from '../../hooks/useOPFS';
import commandRegistry, { CommandContext } from './commands';

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
  const { supported: opfsSupported, getDir, readFile, writeFile, deleteFile } =
    useOPFS();
  const dirRef = useRef<FileSystemDirectoryHandle | null>(null);

  function writeLine(text: string) {
    if (termRef.current) termRef.current.writeln(text);
    contentRef.current += `${text}\n`;
    if (opfsSupported && dirRef.current) {
      writeFile('history.txt', contentRef.current, dirRef.current);
    }
  }

  contextRef.current.writeLine = writeLine;

  function prompt() {
    if (termRef.current) termRef.current.write('$ ');
  }

  async function runWorker(command: string) {
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
  }

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
  }, [openApp, opfsSupported, deleteFile]);

  useEffect(() => {
    if (typeof Worker === 'function') {
      workerRef.current = new Worker(
        new URL('../../workers/terminal-worker.ts', import.meta.url),
      );
    }
    return () => workerRef.current?.terminate();
  }, []);

  async function runCommand(cmd: string) {
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
  }

  function autocomplete() {
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
  }

  function handleInput(data: string) {
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
  }

  useImperativeHandle(ref, () => ({
    runCommand: (c: string) => runCommand(c),
    getContent: () => contentRef.current,
  }));

  useEffect(() => {
    let disposed = false;
    (async () => {
      const [{ Terminal }, { FitAddon }, { SearchAddon }] = await Promise.all([
        import('@xterm/xterm'),
        import('@xterm/addon-fit'),
        import('@xterm/addon-search'),
      ]);
      await import('@xterm/xterm/css/xterm.css');
      if (disposed) return;
      const term = new Terminal({ cursorBlink: true, scrollback: 1000 });
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
        }
      });
      term.onPaste((d: string) => handleInput(d));
    })();
    return () => {
      disposed = true;
      termRef.current?.dispose();
    };
  }, [opfsSupported, getDir, readFile]);

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
        <div className="absolute inset-0 bg-black bg-opacity-75 flex items-start justify-center">
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
      <div
        data-testid="xterm-container"
        ref={containerRef}
        className="h-full w-full bg-black text-white"
      />
    </div>
  );
});

TerminalApp.displayName = 'TerminalApp';

export default TerminalApp;
