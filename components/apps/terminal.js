import React, { useEffect, useRef, forwardRef, useImperativeHandle, useCallback } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { SearchAddon } from 'xterm-addon-search';

const Terminal = forwardRef(({ addFolder, openApp }, ref) => {
  const containerRef = useRef(null);
  const termRef = useRef(null);
  const fitAddonRef = useRef(null);
  const workerRef = useRef(null);
  const commandRef = useRef('');
  const logRef = useRef('');

  // Prompt helper
  const prompt = useCallback(() => {
    termRef.current.write(`\r\nalex@kali:~$ `);
  }, []);

  // Handle command execution
  const runCommand = useCallback((command) => {
    const trimmed = command.trim();
    if (trimmed === 'pwd') {
      termRef.current.writeln('');
      termRef.current.writeln('/home/alex');
      logRef.current += '/home/alex\n';
      prompt();
    } else if (trimmed.startsWith('cd ')) {
      const target = trimmed.slice(3);
      termRef.current.writeln('');
      termRef.current.writeln(`bash: cd: ${target}: No such file or directory`);
      logRef.current += `bash: cd: ${target}: No such file or directory\n`;
      prompt();
    } else if (trimmed === 'simulate') {
      termRef.current.writeln('');
      termRef.current.writeln('Running heavy simulation...');
      logRef.current += 'Running heavy simulation...\n';
      workerRef.current.postMessage({ command: 'simulate' });
      // prompt will be called when worker responds
    } else if (trimmed.length === 0) {
      prompt();
    } else {
      termRef.current.writeln('');
      termRef.current.writeln(`Command '${trimmed}' not found`);
      logRef.current += `Command '${trimmed}' not found\n`;
      prompt();
    }
  }, [prompt]);

  // Initialise terminal
  useEffect(() => {
    const term = new XTerm({ cursorBlink: true, convertEol: true });
    const fitAddon = new FitAddon();
    const searchAddon = new SearchAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(searchAddon);
    term.open(containerRef.current);
    termRef.current = term;
    fitAddonRef.current = fitAddon;
    fitAddon.fit();
    term.write('Welcome to the portfolio terminal');
    prompt();
    term.onData((data) => {
      if (data === '\r') {
        runCommand(commandRef.current);
        commandRef.current = '';
      } else if (data === '\u0003') { // Ctrl+C
        term.write('^C');
        prompt();
        commandRef.current = '';
      } else if (data === '\u007F') { // Backspace
        if (commandRef.current.length > 0) {
          commandRef.current = commandRef.current.slice(0, -1);
          term.write('\b \b');
        }
      } else {
        commandRef.current += data;
        term.write(data);
      }
    });
    workerRef.current = new Worker(new URL('./terminal.worker.js', import.meta.url));
    workerRef.current.onmessage = (e) => {
      term.writeln('');
      term.writeln(String(e.data));
      logRef.current += `${String(e.data)}\n`;
      prompt();
    };

    const handleResize = () => fitAddon.fit();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      workerRef.current?.terminate();
      term.dispose();
    };
  }, [prompt, runCommand]);

  useImperativeHandle(ref, () => ({
    runCommand,
    getContent: () => logRef.current,
  }));

  return <div className="h-full w-full bg-ub-cool-grey" ref={containerRef} data-testid="xterm-container" />;
});

Terminal.displayName = 'Terminal';

export default Terminal;

export const displayTerminal = (addFolder, openApp) => {
  return <Terminal addFolder={addFolder} openApp={openApp} />;
};
