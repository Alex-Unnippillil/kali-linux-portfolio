'use client';

import React, {
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
  useState,
} from 'react';
import useOPFS from '../../hooks/useOPFS';

export interface TerminalProps {
  openApp?: (id: string) => void;
}

export interface TerminalHandle {
  runCommand: (cmd: string) => Promise<void>;
  getContent: () => string;
}

const TerminalApp = forwardRef<TerminalHandle, TerminalProps>(({ openApp }, ref) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const termRef = useRef<any>(null);
  const fitRef = useRef<any>(null);
  const searchRef = useRef<any>(null);
  const commandRef = useRef('');
  const contentRef = useRef('');
  const registryRef = useRef<Record<string, (args: string) => Promise<void> | void>>({});
  const { hasAccess, list, readFile, writeFile, mkdir, rm } = useOPFS();
  const [cwd, setCwd] = useState('/');

  function writeLine(text: string) {
    if (termRef.current) termRef.current.writeln(text);
    contentRef.current += `${text}\n`;
  }

  function prompt() {
    if (termRef.current) termRef.current.write('$ ');
  }

  function resolvePath(p: string) {
    const parts = (p.startsWith('/') ? p : `${cwd}/${p}`)
      .split('/')
      .filter(Boolean);
    const stack: string[] = [];
    for (const part of parts) {
      if (part === '.' || part === '') continue;
      if (part === '..') stack.pop();
      else stack.push(part);
    }
    return `/${stack.join('/')}`;
  }

  useEffect(() => {
    registryRef.current = {
      help: () =>
        writeLine(`Available commands: ${Object.keys(registryRef.current).join(', ')}`),
      ls: async (arg = '') => {
        if (!hasAccess) return writeLine('Permission denied');
        try {
          const path = resolvePath(arg || '.');
          const items = await list(path);
          writeLine(
            items
              .map((i) => (i.kind === 'directory' ? `${i.name}/` : i.name))
              .join('  '),
          );
        } catch {
          writeLine(`ls: cannot access '${arg}': No such file or directory`);
        }
      },
      cd: async (arg = '') => {
        if (!hasAccess) return writeLine('Permission denied');
        try {
          const path = resolvePath(arg || '/');
          await list(path);
          setCwd(path);
        } catch {
          writeLine(`cd: ${arg}: No such directory`);
        }
      },
      cat: async (arg) => {
        if (!hasAccess) return writeLine('Permission denied');
        try {
          const content = await readFile(resolvePath(arg.trim()));
          writeLine(content);
        } catch {
          writeLine(`cat: ${arg}: No such file`);
        }
      },
      echo: async (args) => {
        const m = args.match(/^(.*)>(.*)$/);
        if (m) {
          const text = m[1].trim();
          const file = resolvePath(m[2].trim());
          await writeFile(file, text);
        } else {
          writeLine(args);
        }
      },
      touch: async (arg) => {
        if (!hasAccess) return writeLine('Permission denied');
        try {
          await writeFile(resolvePath(arg.trim()), '');
        } catch {
          writeLine(`touch: cannot create '${arg}'`);
        }
      },
      mkdir: async (arg) => {
        if (!hasAccess) return writeLine('Permission denied');
        try {
          await mkdir(resolvePath(arg.trim()));
        } catch {
          writeLine(`mkdir: cannot create directory '${arg}'`);
        }
      },
      rm: async (arg) => {
        if (!hasAccess) return writeLine('Permission denied');
        try {
          await rm(resolvePath(arg.trim()));
        } catch {
          writeLine(`rm: cannot remove '${arg}'`);
        }
      },
      clear: () => {
        termRef.current?.clear();
        contentRef.current = '';
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
  }, [openApp, hasAccess, cwd, list, readFile, writeFile, mkdir, rm]);

  async function runCommand(cmd: string) {
    const [name, ...rest] = cmd.trim().split(/\s+/);
    const handler = registryRef.current[name];
    if (handler) await handler(rest.join(' '));
    else if (name) writeLine(`Command not found: ${name}`);
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
        const cmd = commandRef.current.trim();
        commandRef.current = '';
        runCommand(cmd).finally(() => {
          prompt();
        });
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
  }, []);

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

  return (
    <div
      data-testid="xterm-container"
      ref={containerRef}
      className="h-full w-full bg-black text-white"
    />
  );
});

TerminalApp.displayName = 'TerminalApp';

export default TerminalApp;

