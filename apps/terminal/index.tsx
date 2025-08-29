'use client';

import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';

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

  function writeLine(text: string) {
    if (termRef.current) termRef.current.writeln(text);
    contentRef.current += `${text}\n`;
  }

  function prompt() {
    if (termRef.current) termRef.current.write('$ ');
  }

  const registry: Record<string, (args: string) => void> = {
    help: () =>
      writeLine(
        `Available commands: ${Object.keys(registry).join(', ')}`,
      ),
    ls: () => writeLine(Object.keys(files).join('  ')),
    cat: (arg) => {
      const content = files[arg.trim()];
      if (content) writeLine(content);
      else writeLine(`cat: ${arg}: No such file`);
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
    about: () =>
      writeLine('This terminal is powered by xterm.js'),
  };

  function runCommand(cmd: string) {
    const [name, ...rest] = cmd.trim().split(/\s+/);
    const handler = registry[name];
    if (handler) handler(rest.join(' '));
    else if (name) writeLine(`Command not found: ${name}`);
  }

  function autocomplete() {
    const current = commandRef.current;
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
  }, [openApp]);

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
