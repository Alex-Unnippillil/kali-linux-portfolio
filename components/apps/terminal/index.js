import React, { useEffect, useRef, forwardRef, useImperativeHandle, useCallback, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { SearchAddon } from '@xterm/addon-search';
import '@xterm/xterm/css/xterm.css';
import commands from './commands';

const MAX_LOG_LINES = 1000;

const Terminal = forwardRef(({ addFolder, openApp }, ref) => {
  const containerRef = useRef(null);
  const termRef = useRef(null);
  const workerRef = useRef(null);
  const commandRef = useRef('');
  const logRef = useRef('');
  const historyRef = useRef([]);
  const historyIndexRef = useRef(0);
  const knownCommandsRef = useRef(new Set(Object.keys(commands)));

  const [suggestions, setSuggestions] = useState([]);
  const [suggestionIndex, setSuggestionIndex] = useState(0);

  const promptText = 'alex@kali:~$ ';

  const appendLog = (text) => {
    logRef.current += text;
    const lines = logRef.current.split('\n');
    if (lines.length > MAX_LOG_LINES) {
      logRef.current = lines.slice(-MAX_LOG_LINES).join('\n');
    }
  };

  const prompt = useCallback(() => {
    termRef.current.write(`\r\n${promptText}`);
  }, []);

  const runCommand = useCallback(
    (input) => {
      const trimmed = input.trim();
      if (trimmed) {
        historyRef.current.push(trimmed);
      }
      historyIndexRef.current = historyRef.current.length;

      if (!trimmed) {
        prompt();
        return;
      }

      const [cmd, ...args] = trimmed.split(/\s+/);
      if (cmd) {
        knownCommandsRef.current.add(cmd);
      }

      termRef.current.writeln('');
      appendLog('\n');

      const handler = commands[cmd];
      if (handler) {
        handler(
          {
            write: (line) => {
              termRef.current.writeln(line);
              appendLog(`${line}\n`);
            },
            clear: () => {
              termRef.current.clear();
              logRef.current = '';
            },
            openApp,
            addFolder,
          },
          args,
        );
      } else {
        const msg = `Command '${trimmed}' not found`;
        termRef.current.writeln(msg);
        appendLog(`${msg}\n`);
      }
      prompt();
      setSuggestions([]);
      setSuggestionIndex(0);
    },
    [prompt, openApp, addFolder],
  );

  const handleTab = useCallback(() => {
    const current = commandRef.current;
    if (suggestions.length > 0) {
      const selection = suggestions[suggestionIndex];
      const completion = selection.slice(current.length);
      termRef.current.write(completion);
      commandRef.current = selection;
      setSuggestions([]);
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
      setSuggestions(matches);
      setSuggestionIndex(0);
    }
  }, [suggestions, suggestionIndex]);

  const handleSuggestionNav = useCallback(
    (direction) => {
      if (suggestions.length === 0) return;
      if (direction === 'up') {
        setSuggestionIndex((suggestionIndex - 1 + suggestions.length) % suggestions.length);
      } else if (direction === 'down') {
        setSuggestionIndex((suggestionIndex + 1) % suggestions.length);
      }
    },
    [suggestions, suggestionIndex],
  );

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
  }, []);

  useEffect(() => {
    const term = new XTerm({ cursorBlink: true, convertEol: true, scrollback: 1000 });
    const fitAddon = new FitAddon();
    const searchAddon = new SearchAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(searchAddon);
    term.open(containerRef.current);
    termRef.current = term;
    fitAddon.fit();
    term.write('Welcome to the portfolio terminal');
    prompt();

    const handleChar = (ch) => {
      if (ch === '\r' || ch === '\n') {
        runCommand(commandRef.current);
        commandRef.current = '';
      } else if (ch === '\u0003') {
        term.write('^C');
        prompt();
        commandRef.current = '';
      } else if (ch === '\u007F') {
        if (commandRef.current.length > 0) {
          commandRef.current = commandRef.current.slice(0, -1);
          term.write('\b \b');
        }
      } else if (ch === '\t') {
        // handled in onKey
      } else {
        commandRef.current += ch;
        term.write(ch);
      }
      setSuggestions([]);
    };

    term.onData((data) => {
      for (const ch of data) {
        handleChar(ch);
      }
    });

    term.onKey(({ domEvent }) => {
      if (domEvent.key === 'Tab') {
        domEvent.preventDefault();
        handleTab();
      } else if (domEvent.key === 'ArrowUp') {
        domEvent.preventDefault();
        if (suggestions.length > 0) {
          handleSuggestionNav('up');
        } else {
          handleHistoryNav('up');
        }
      } else if (domEvent.key === 'ArrowDown') {
        domEvent.preventDefault();
        if (suggestions.length > 0) {
          handleSuggestionNav('down');
        } else {
          handleHistoryNav('down');
        }
      }
    });

    if (typeof window !== 'undefined' && typeof window.Worker === 'function') {
      workerRef.current = new Worker(new URL('./terminal.worker.js', import.meta.url));
      workerRef.current.onmessage = (e) => {
        term.writeln('');
        term.writeln(String(e.data));
        appendLog(`${String(e.data)}\n`);
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
  }, [prompt, runCommand, handleTab, handleSuggestionNav, handleHistoryNav, suggestions.length]);

  useImperativeHandle(ref, () => ({
    runCommand,
    getContent: () => logRef.current,
    getCommand: () => commandRef.current,
    historyNav: handleHistoryNav,
  }));

  return (
    <div className="relative h-full w-full bg-ub-cool-grey">
      <div className="h-full w-full" ref={containerRef} data-testid="xterm-container" />
      {suggestions.length > 0 && (
        <ul className="absolute bottom-0 left-0 bg-black text-green-500 text-xs">
          {suggestions.map((s, idx) => (
            <li
              key={s}
              className={idx === suggestionIndex ? 'bg-green-500 text-black' : ''}
            >
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});

Terminal.displayName = 'Terminal';

export default Terminal;

export const displayTerminal = (addFolder, openApp) => {
  return <Terminal addFolder={addFolder} openApp={openApp} />;
};
