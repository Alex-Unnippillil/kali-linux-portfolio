import React, {
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
  useCallback,
} from 'react';
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
    new Set([
      'pwd',
      'cd',
      'simulate',
      'history',
      'clear',
      'help',
      'demo nmap',
      'demo hashcat',
    ]),
  );
  const historyRef = useRef([]);
  const historyIndexRef = useRef(0);
  const suggestionsRef = useRef([]);
  const suggestionIndexRef = useRef(0);
  const showingSuggestionsRef = useRef(false);
  const ariaLiveRef = useRef(null);
  const hintRef = useRef('');
  const rafRef = useRef(null);

  const promptText = 'alex@kali:~$ ';

  // Prompt helper
  const renderHint = () => {
    if (typeof window === 'undefined' || !termRef.current) return;
    if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
    rafRef.current = window.requestAnimationFrame(() => {
      const current = commandRef.current;
      const match = Array.from(knownCommandsRef.current).find(
        (cmd) => cmd.startsWith(current) && cmd !== current,
      );
      const hint = match ? match.slice(current.length) : '';
      if (hintRef.current === hint) return;
      hintRef.current = hint;
      termRef.current.write('\u001b[s\u001b[0K');
      if (hint) {
        termRef.current.write(`\u001b[90m${hint}\u001b[0m`);
      }
      termRef.current.write('\u001b[u');
    });
  };

  const prompt = useCallback(() => {
    termRef.current.write(`\r\n${promptText}`);
    renderHint();
  }, []);

  const updateLive = useCallback((msg) => {
    if (ariaLiveRef.current) {
      ariaLiveRef.current.textContent = msg;
    }
  }, []);

  // Handle command execution
  const runCommand = useCallback(
    (command) => {
      const trimmed = command.trim();
      const first = trimmed.split(' ')[0];
      if (first) {
        knownCommandsRef.current.add(first);
      }
      if (trimmed) {
        historyRef.current.push(trimmed);
      }
      historyIndexRef.current = historyRef.current.length;
      const writeLine = (text) => {
        termRef.current.writeln(text);
        logRef.current += `${text}\n`;
        updateLive(text);
      };
      if (trimmed === 'pwd') {
        termRef.current.writeln('');
        writeLine('/home/alex');
        prompt();
      } else if (trimmed.startsWith('cd ')) {
        const target = trimmed.slice(3);
        termRef.current.writeln('');
        writeLine(`bash: cd: ${target}: No such file or directory`);
        prompt();
      } else if (trimmed === 'simulate') {
        termRef.current.writeln('');
        if (workerRef.current) {
          writeLine('Running heavy simulation...');
          workerRef.current.postMessage({ command: 'simulate' });
          // prompt will be called when worker responds
        } else {
          const msg = 'Web Workers are not supported in this environment.';
          writeLine(msg);
          prompt();
        }
      } else if (trimmed === 'demo nmap') {
        termRef.current.writeln('');
        writeLine('Starting Nmap 7.93 ( https://nmap.org )');
        writeLine('Nmap scan report for localhost (127.0.0.1)');
        writeLine('Host is up (0.00023s latency).');
        writeLine('Not shown: 998 closed ports');
        writeLine('22/tcp   open  ssh');
        writeLine('80/tcp   open  http');
        writeLine('443/tcp  open  https');
        writeLine('');
        writeLine('Nmap done: 1 IP address (1 host up) scanned.');
        prompt();
      } else if (trimmed === 'demo hashcat') {
        termRef.current.writeln('');
        writeLine('hashcat (v6.2.6) starting...');
        writeLine('* Device #1: NVIDIA GeForce RTX 3090, 24268/24576 MB');
        writeLine('Benchmarking: MD5');
        writeLine('Speed.#1.........: 39420.0 MH/s');
        writeLine('');
        writeLine('Hashcat finished.');
        prompt();
      } else if (trimmed === 'clear') {
        termRef.current.clear();
        prompt();
      } else if (trimmed === 'help') {
        termRef.current.writeln('');
        const commands = Array.from(knownCommandsRef.current)
          .sort()
          .join(' ');
        writeLine(`Available commands: ${commands}`);
        prompt();
      } else if (trimmed === 'demo') {
        termRef.current.writeln('');
        writeLine('Available demos: demo nmap, demo hashcat');
        prompt();
      } else if (trimmed === 'history') {
        termRef.current.writeln('');
        const history = historyRef.current.join('\n');
        writeLine(history);
        prompt();
      } else if (trimmed.length === 0) {
        prompt();
      } else {
        termRef.current.writeln('');
        writeLine(`Command '${trimmed}' not found`);
        prompt();
      }
      renderHint();
    },
    [prompt, updateLive],
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
      renderHint();
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
      renderHint();
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
    renderHint();
  }, []);

  // Initialise terminal
  useEffect(() => {
    const term = new XTerm({
      cursorBlink: true,
      convertEol: true,
      theme: {
        background: '#000000',
        foreground: '#00ff00',
        cursor: '#00ff00',
      },
    });
    const fitAddon = new FitAddon();
    const searchAddon = new SearchAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(searchAddon);
    term.open(containerRef.current);
    termRef.current = term;
    fitAddonRef.current = fitAddon;
    fitAddon.fit();
    containerRef.current.classList.add('crt-terminal');
    term.write('Welcome to the portfolio terminal');
    updateLive('Welcome to the portfolio terminal');
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
      renderHint();
    });
    if (typeof window !== 'undefined' && typeof window.Worker === 'function') {
      workerRef.current = new Worker(
        new URL('./terminal.worker.js', import.meta.url),
      );
      workerRef.current.onmessage = (e) => {
        term.writeln('');
        const msg = String(e.data);
        term.writeln(msg);
        logRef.current += `${msg}\n`;
        updateLive(msg);
        prompt();
        renderHint();
      };
    } else {
      workerRef.current = null;
    }

    const handleResize = () => fitAddon.fit();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      workerRef.current?.terminate();
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
      term.dispose();
    };
  }, [prompt, runCommand, handleTab, handleSuggestionNav, handleHistoryNav, updateLive]);

  useImperativeHandle(ref, () => ({
    runCommand,
    getContent: () => logRef.current,
    getCommand: () => commandRef.current,
    historyNav: handleHistoryNav,
  }));

  return (
    <div
      className="h-full w-full bg-ub-cool-grey"
      ref={containerRef}
      data-testid="xterm-container"
      aria-label="Terminal"
    >
      <div ref={ariaLiveRef} aria-live="polite" className="sr-only" />
    </div>
  );
});

Terminal.displayName = 'Terminal';

export default Terminal;

export const displayTerminal = (addFolder, openApp) => {
  return <Terminal addFolder={addFolder} openApp={openApp} />;
};
