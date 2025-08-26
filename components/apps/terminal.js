import React, { useEffect, useRef, forwardRef, useImperativeHandle, useCallback } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { SearchAddon } from '@xterm/addon-search';
import '@xterm/xterm/css/xterm.css';



const Terminal = forwardRef(({ addFolder, openApp }, ref) => {
  const containerRef = useRef(null);
  const termRef = useRef(null);
  const fitAddonRef = useRef(null);
  const workerRef = useRef(null);
  const commandRef = useRef('');
  const logRef = useRef('');
  const knownCommandsRef = useRef(
    new Set(['pwd', 'cd', 'simulate', 'history', 'clear', 'help']),
  );
  const historyRef = useRef([]);
  const historyIndexRef = useRef(0);
  const suggestionsRef = useRef([]);
  const suggestionIndexRef = useRef(0);
  const showingSuggestionsRef = useRef(false);

  const promptText = 'alex@kali:~$ ';

  // Prompt helper
  const prompt = useCallback(() => {
    termRef.current.write(`\r\n${promptText}`);
  }, []);

  // Handle command execution
  const runCommand = useCallback((command) => {
    const trimmed = command.trim();
    const first = trimmed.split(' ')[0];
    if (first) {
      knownCommandsRef.current.add(first);
    }
    if (trimmed) {
      historyRef.current.push(trimmed);
    }
    historyIndexRef.current = historyRef.current.length;
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
      if (workerRef.current) {
        termRef.current.writeln('Running heavy simulation...');
        logRef.current += 'Running heavy simulation...\n';
        workerRef.current.postMessage({ command: 'simulate' });
        // prompt will be called when worker responds
      } else {
        const msg = 'Web Workers are not supported in this environment.';
        termRef.current.writeln(msg);
        logRef.current += `${msg}\n`;
        prompt();
      }
    } else if (trimmed === 'clear') {
      termRef.current.clear();
      prompt();
    } else if (trimmed === 'help') {
      termRef.current.writeln('');
      const commands = Array.from(knownCommandsRef.current).sort().join(' ');
      termRef.current.writeln(`Available commands: ${commands}`);
      logRef.current += `Available commands: ${commands}\n`;
      prompt();
    } else if (trimmed === 'history') {
      termRef.current.writeln('');
      const history = historyRef.current.join('\n');
      termRef.current.writeln(history);
      logRef.current += `${history}\n`;
      prompt();
    } else if (trimmed.length === 0) {
      prompt();
    } else {
      termRef.current.writeln('');
      termRef.current.writeln(`Command '${trimmed}' not found`);
      logRef.current += `Command '${trimmed}' not found\n`;
      prompt();
    }
  }, [prompt]);

  const renderSuggestions = useCallback(() => {
    termRef.current.writeln('');
    termRef.current.writeln(
      suggestionsRef.current
        .map((cmd, idx) => (idx === suggestionIndexRef.current ? `\u001b[7m${cmd}\u001b[0m` : cmd))
        .join(' '),
    );
    prompt();
    termRef.current.write(commandRef.current);
  }, [prompt]);

  const handleTab = useCallback(() => {
    const current = commandRef.current;
    if (showingSuggestionsRef.current && suggestionsRef.current.length > 0) {
      const selection = suggestionsRef.current[suggestionIndexRef.current];
      const completion = selection.slice(current.length);
      termRef.current.write(completion);
      commandRef.current = selection;
      suggestionsRef.current = [];
      showingSuggestionsRef.current = false;
      return;
    }

    if (!current) return;
    const matches = Array.from(knownCommandsRef.current)
      .filter((cmd) => cmd.startsWith(current))
      .sort();
    if (matches.length === 1) {
      const completion = matches[0].slice(current.length);
      termRef.current.write(completion);
      commandRef.current = matches[0];
    } else if (matches.length > 1) {
      suggestionsRef.current = matches;
      suggestionIndexRef.current = 0;
      showingSuggestionsRef.current = true;
      renderSuggestions();
    }
  }, [renderSuggestions]);

  const handleSuggestionNav = useCallback((direction) => {
    if (!showingSuggestionsRef.current) return;
    if (direction === 'left') {
      suggestionIndexRef.current =
        (suggestionIndexRef.current - 1 + suggestionsRef.current.length) % suggestionsRef.current.length;
    } else if (direction === 'right') {
      suggestionIndexRef.current =
        (suggestionIndexRef.current + 1) % suggestionsRef.current.length;
    }
    renderSuggestions();
  }, [renderSuggestions]);

  const handleHistoryNav = useCallback((direction) => {
    if (historyRef.current.length === 0) return;
    if (direction === 'up') {
      if (historyIndexRef.current > 0) {
        historyIndexRef.current -= 1;
      }
    } else if (direction === 'down') {
      if (historyIndexRef.current < historyRef.current.length) {
        historyIndexRef.current += 1;
      }
    }
    const cmd = historyRef.current[historyIndexRef.current] || '';
    termRef.current.write('\x1b[2K\r');
    termRef.current.write(promptText);
    termRef.current.write(cmd);
    commandRef.current = cmd;
    suggestionsRef.current = [];
    showingSuggestionsRef.current = false;
  }, []);

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
    term.onKey(({ key, domEvent }) => {
      if (domEvent.key === 'Tab') {
        domEvent.preventDefault();
        handleTab();
      } else if (domEvent.key === 'ArrowLeft') {
        domEvent.preventDefault();
        handleSuggestionNav('left');
      } else if (domEvent.key === 'ArrowRight') {
        domEvent.preventDefault();
        handleSuggestionNav('right');
      } else if (domEvent.key === 'ArrowUp') {
        domEvent.preventDefault();
        handleHistoryNav('up');
      } else if (domEvent.key === 'ArrowDown') {
        domEvent.preventDefault();
        handleHistoryNav('down');
      }
    });

    term.onData((data) => {
      if (data === '\r') {
        runCommand(commandRef.current);
        commandRef.current = '';
        suggestionsRef.current = [];
        showingSuggestionsRef.current = false;
      } else if (data === '\u0003') { // Ctrl+C
        term.write('^C');
        prompt();
        commandRef.current = '';
        suggestionsRef.current = [];
        showingSuggestionsRef.current = false;
      } else if (data === '\u007F') { // Backspace
        if (commandRef.current.length > 0) {
          commandRef.current = commandRef.current.slice(0, -1);
          term.write('\b \b');
        }
        suggestionsRef.current = [];
        showingSuggestionsRef.current = false;
      } else if (data === '\t') {
        // handled in onKey
      } else {
        commandRef.current += data;
        term.write(data);
        suggestionsRef.current = [];
        showingSuggestionsRef.current = false;
      }
    });
    if (typeof window !== 'undefined' && typeof window.Worker === 'function') {
      workerRef.current = new Worker(new URL('./terminal.worker.js', import.meta.url));
      workerRef.current.onmessage = (e) => {
        term.writeln('');
        term.writeln(String(e.data));
        logRef.current += `${String(e.data)}\n`;
        prompt();
      };
    } else {
      workerRef.current = null;
    }

    const handleResize = () => fitAddon.fit();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      workerRef.current?.terminate();
      term.dispose();
    };
  }, [prompt, runCommand, handleTab, handleSuggestionNav, handleHistoryNav]);

  useImperativeHandle(ref, () => ({
    runCommand,
    getContent: () => logRef.current,
    getCommand: () => commandRef.current,
    historyNav: handleHistoryNav,
  }));

  return <div className="h-full w-full bg-ub-cool-grey" ref={containerRef} data-testid="xterm-container" />;
});

Terminal.displayName = 'Terminal';

export default Terminal;

export const displayTerminal = (addFolder, openApp) => {
  return <Terminal addFolder={addFolder} openApp={openApp} />;
};
