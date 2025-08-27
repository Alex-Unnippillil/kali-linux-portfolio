import React, { useEffect, useRef, forwardRef, useImperativeHandle, useCallback } from 'react';

const HISTORY_LIMIT = 50;

const Terminal = forwardRef(({ addFolder, openApp }, ref) => {
  const containerRef = useRef(null);
  const termRef = useRef(null);
  const fitAddonRef = useRef(null);
  const workerRef = useRef(null);
  const commandRef = useRef('');
  const logRef = useRef('');
  const cwdRef = useRef('/home/alex');
  const knownCommandsRef = useRef(
    new Set([
      'help',
      'clear',
      'pwd',
      'cd',
      'ls',
      'echo',
      'mkdir',
      'exit',
      'simulate',
      'history',
      'code',
      'x',
      'spotify',
      'chrome',
      'about-alex',
      'todoist',
      'trash',
      'settings',
    ]),
  );
  const historyRef = useRef([]);
  const historyIndexRef = useRef(0);
  const suggestionsRef = useRef([]);
  const suggestionIndexRef = useRef(0);
  const showingSuggestionsRef = useRef(false);

  const promptText = 'alex@kali:~$ ';

  // Prompt helper
  const prompt = useCallback(() => {
    termRef.current?.write(`\r\n${promptText}`);
  }, []);

  // Handle command execution
  const runCommand = useCallback(
    (command) => {
      const trimmed = command.trim();
      const [first, ...rest] = trimmed.split(' ');
      if (first) {
        knownCommandsRef.current.add(first);
      }
      if (trimmed) {
        historyRef.current.push(trimmed);
        if (historyRef.current.length > HISTORY_LIMIT) {
          historyRef.current.shift();
        }
      }
      historyIndexRef.current = historyRef.current.length;

      const writeln = (text = '') => {
        termRef.current?.writeln(text);
        logRef.current += `${text}\n`;
      };

      if (first === 'pwd') {
        writeln('');
        writeln(cwdRef.current);
        prompt();
      } else if (first === 'cd') {
        const target = rest.join(' ');
        writeln('');
        if (!target || target === '.' || target === '/home' || target === '/home/alex') {
          cwdRef.current = '/home/alex';
        } else {
          writeln(`bash: cd: ${target}: No such file or directory`);
        }
        prompt();
      } else if (first === 'ls') {
        writeln('');
        writeln('Desktop Documents Downloads Music Pictures Videos');
        prompt();
      } else if (first === 'echo') {
        writeln('');
        writeln(rest.join(' '));
        prompt();
      } else if (first === 'mkdir') {
        const name = rest.join(' ');
        writeln('');
        if (name && typeof addFolder === 'function') {
          addFolder(name);
        }
        prompt();
      } else if (first === 'clear') {
        termRef.current?.clear();
        prompt();
      } else if (first === 'help') {
        writeln('');
        const commands = Array.from(knownCommandsRef.current).sort().join(' ');
        writeln(`Available commands: ${commands}`);
        prompt();
      } else if (first === 'history') {
        writeln('');
        const history = historyRef.current.join('\n');
        writeln(history);
        prompt();
      } else if (first === 'exit') {
        writeln('');
        writeln('logout');
        prompt();
      } else if (first === 'simulate') {
        writeln('');
        if (workerRef.current) {
          writeln('Running heavy simulation...');
          workerRef.current.postMessage({ command: 'simulate' });
          // prompt will be called when worker responds
        } else {
          const msg = 'Web Workers are not supported in this environment.';
          writeln(msg);
          prompt();
        }
      } else if (
        [
          'code',
          'x',
          'spotify',
          'chrome',
          'about-alex',
          'todoist',
          'trash',
          'settings',
        ].includes(first)
      ) {
        openApp?.(first === 'code' ? 'vscode' : first);
        prompt();
      } else if (trimmed.length === 0) {
        prompt();
      } else {
        writeln('');
        writeln(`Command '${trimmed}' not found`);
        prompt();
      }
    },
    [prompt, addFolder, openApp],
  );

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
    let term;
    let fitAddon;
    let searchAddon;
    let resizeHandler;

    const init = async () => {
      const [{ Terminal }, { FitAddon }, { SearchAddon }] = await Promise.all([
        import('xterm'),
        import('xterm-addon-fit'),
        import('xterm-addon-search'),
        import('xterm/css/xterm.css'),
      ]);

      term = new Terminal({ cursorBlink: true, convertEol: true });
      fitAddon = new FitAddon();
      searchAddon = new SearchAddon();
      term.loadAddon(fitAddon);
      term.loadAddon(searchAddon);
      term.open(containerRef.current);
      termRef.current = term;
      fitAddonRef.current = fitAddon;
      fitAddon.fit();
      term.write('Welcome to the portfolio terminal');
      prompt();
      term.onKey(({ key, domEvent }) => {
        if (domEvent.ctrlKey && domEvent.key.toLowerCase() === 'l') {
          domEvent.preventDefault();
          term.clear();
          prompt();
          commandRef.current = '';
        } else if (domEvent.key === 'Tab') {
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
        } else if (data === '\u0003') {
          term.write('^C');
          prompt();
          commandRef.current = '';
          suggestionsRef.current = [];
          showingSuggestionsRef.current = false;
        } else if (data === '\u007F') {
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

      resizeHandler = () => fitAddon.fit();
      window.addEventListener('resize', resizeHandler);
    };

    init();

    return () => {
      window.removeEventListener('resize', resizeHandler);
      workerRef.current?.terminate();
      term?.dispose();
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
