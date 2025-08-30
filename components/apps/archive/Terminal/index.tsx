import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  forwardRef,
} from 'react';

const promptText = 'alex@kali:~$ ';

const TerminalPaneInner = (
  { onSplit, onClose, onFocus }: { onSplit: () => void; onClose: () => void; onFocus: () => void },
  ref: any,
) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const termRef = useRef<any>(null);
    const fitAddonRef = useRef<any>(null);
    const workerRef = useRef<any>(null);
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
        'split',
        'exit',
        'demo nmap',
        'demo hashcat',
      ]),
    );
    const historyRef = useRef<string[]>([]);
    const historyIndexRef = useRef(0);
    const suggestionsRef = useRef<string[]>([]);
    const suggestionIndexRef = useRef(0);
    const showingSuggestionsRef = useRef(false);
    const ariaLiveRef = useRef<HTMLDivElement | null>(null);
    const suggestionLiveRef = useRef<HTMLDivElement | null>(null);
    const hintRef = useRef('');
    const rafRef = useRef<any>(null);
    const fontSizeRef = useRef(14);
    const [revSearch, setRevSearch] = useState({
      active: false,
      query: '',
      match: '',
    });
    const revSearchRef = useRef(revSearch);
    const searchIdxRef = useRef(0);
    useEffect(() => {
      revSearchRef.current = revSearch;
    }, [revSearch]);

    const updateLive = useCallback((msg: string) => {
      if (ariaLiveRef.current) ariaLiveRef.current.textContent = msg;
    }, []);

    const updateSuggestionsLive = useCallback((msg: string) => {
      if (suggestionLiveRef.current)
        suggestionLiveRef.current.textContent = msg;
    }, []);

    const clearSuggestions = useCallback(() => {
      suggestionsRef.current = [];
      showingSuggestionsRef.current = false;
      updateSuggestionsLive('');
    }, [updateSuggestionsLive]);

    const renderHint = useCallback(() => {
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
    }, []);

    const prompt = useCallback(() => {
      termRef.current.write(`\r\n${promptText}`);
      renderHint();
    }, [renderHint]);

    const renderSuggestions = useCallback(() => {
      termRef.current.writeln('');
      const rendered = suggestionsRef.current
        .map((cmd, idx) =>
          idx === suggestionIndexRef.current
            ? `\u001b[7m${cmd}\u001b[0m`
            : cmd,
        )
        .join(' ');
      termRef.current.writeln(rendered);
      updateSuggestionsLive(suggestionsRef.current.join(' '));
      prompt();
      termRef.current.write(commandRef.current);
    }, [prompt, updateSuggestionsLive]);

    const handleTab = useCallback(() => {
      const current = commandRef.current;
      if (showingSuggestionsRef.current && suggestionsRef.current.length > 0) {
        const selection = suggestionsRef.current[suggestionIndexRef.current];
        const completion = selection.slice(current.length);
        termRef.current.write(completion);
        commandRef.current = selection;
        clearSuggestions();
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
      } else {
        clearSuggestions();
      }
    }, [renderSuggestions, renderHint, clearSuggestions]);

    const handleSuggestionNav = useCallback(
      (direction: 'left' | 'right') => {
        if (!showingSuggestionsRef.current) return;
        if (direction === 'left') {
          suggestionIndexRef.current =
            (suggestionIndexRef.current - 1 + suggestionsRef.current.length) %
            suggestionsRef.current.length;
        } else {
          suggestionIndexRef.current =
            (suggestionIndexRef.current + 1) % suggestionsRef.current.length;
        }
        renderSuggestions();
      },
      [renderSuggestions],
    );

    const handleHistoryNav = useCallback(
      (direction: 'up' | 'down') => {
        if (historyRef.current.length === 0) return;
        if (direction === 'up') {
          if (historyIndexRef.current > 0) historyIndexRef.current -= 1;
        } else if (direction === 'down') {
          if (historyIndexRef.current < historyRef.current.length)
            historyIndexRef.current += 1;
        }
        const cmd = historyRef.current[historyIndexRef.current] || '';
        termRef.current.write('\x1b[2K\r');
        termRef.current.write(promptText);
        termRef.current.write(cmd);
        commandRef.current = cmd;
        clearSuggestions();
        renderHint();
      },
      [clearSuggestions, renderHint],
    );

    const runCommand = useCallback(
      (command: string) => {
        const trimmed = command.trim();
        const first = trimmed.split(' ')[0];
        if (first) {
          knownCommandsRef.current.add(first);
        }
        if (trimmed) {
          historyRef.current.push(trimmed);
        }
        historyIndexRef.current = historyRef.current.length;
        const writeLine = (text: string) => {
          termRef.current.writeln(text);
          logRef.current += `${text}\n`;
          updateLive(text);
        };
        clearSuggestions();
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
          } else {
            const msg = 'Web Workers are not supported in this environment.';
            writeLine(msg);
            prompt();
          }
        } else if (trimmed === 'clear') {
          termRef.current.clear();
          prompt();
        } else if (trimmed.startsWith('help')) {
          termRef.current.writeln('');
          const parts = trimmed.split(' ').filter(Boolean);
          if (parts.length > 1) {
            const cmd = parts[1];
            const map: Record<string, string[]> = {
              pwd: ['pwd - print working directory', 'Example: pwd'],
              cd: ['cd <dir> - change directory', 'Example: cd projects'],
              simulate: [
                'simulate - run a heavy simulation in a worker',
                'Example: simulate',
              ],
              history: ['history - show command history', 'Example: history'],
              clear: ['clear - clear the terminal screen', 'Example: clear'],
              help: [
                'help [command] - show available commands or details',
                'Example: help pwd',
              ],
            };
            if (map[cmd]) {
              map[cmd].forEach(writeLine);
            } else {
              writeLine(`No help available for '${cmd}'`);
            }
          } else {
            writeLine('Available commands:');
            [
              'pwd                - print working directory',
              'cd <dir>           - change directory',
              'simulate           - run a simulation in a worker',
              'history            - show command history',
              'clear              - clear the screen',
              'help [command]     - show help information',
              'split              - split the pane',
              'exit               - close the pane',
              'demo nmap          - run nmap demo',
              'demo hashcat       - run hashcat demo',
            ].forEach(writeLine);
            writeLine('Use `help <command>` for more details.');
          }
          prompt();
        } else if (trimmed === 'history') {
          termRef.current.writeln('');
          const history = historyRef.current.join('\n');
          writeLine(history);
          prompt();
        } else if (trimmed === 'split') {
          termRef.current.writeln('');
          writeLine('Opened new pane');
          onSplit();
          prompt();
        } else if (trimmed === 'exit') {
          termRef.current.writeln('');
          writeLine('Closed pane');
          onClose();
          prompt();
        } else if (trimmed === 'demo nmap') {
          termRef.current.writeln('');
          [
            'Starting Nmap 7.93 ( https://nmap.org ) at 2024-03-15 12:00 UTC',
            'Nmap scan report for example.com (93.184.216.34)',
            'Host is up (0.013s latency).',
            'Not shown: 998 filtered tcp ports',
            'PORT   STATE SERVICE',
            '80/tcp open  http',
            '443/tcp open https',
            'Nmap done: 1 IP address (1 host up) scanned in 0.20 seconds',
          ].forEach(writeLine);
          prompt();
        } else if (trimmed === 'demo hashcat') {
          termRef.current.writeln('');
          [
            'hashcat (v6.2.6) starting in benchmark mode...',
            'OpenCL API (OpenCL 2.1) - Platform #1 [MockGPU]',
            '* Device #1: Example GPU, 4096/8192 MB (1024 MB allocatable), 64MCU',
            'Benchmark relevant options:',
            '==========================',
            '* --optimized-kernel-enable',
            '--------------------------',
            'Hashmode: 0 - MD5',
            'Speed.#1.........: 12345.0 MH/s (10.00ms) @ Accel:32 Loops:1024 Thr:256 Vec:8',
            'Started: Fri Mar 15 12:00:00 2024',
            'Stopped: Fri Mar 15 12:00:01 2024',
          ].forEach(writeLine);
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
      [prompt, updateLive, onSplit, onClose, renderHint, clearSuggestions],
    );

    const updateSearch = useCallback((query: string, repeat = false) => {
      let start = repeat ? searchIdxRef.current : historyRef.current.length;
      for (let i = start - 1; i >= 0; i--) {
        if (historyRef.current[i].includes(query)) {
          searchIdxRef.current = i;
          setRevSearch({ active: true, query, match: historyRef.current[i] });
          return;
        }
      }
      searchIdxRef.current = start;
      setRevSearch({ active: true, query, match: '' });
    }, []);

    useEffect(() => {
      (async () => {
        const [{ Terminal }, { FitAddon }, { SearchAddon }] = await Promise.all([
          import('@xterm/xterm'),
          import('@xterm/addon-fit'),
          import('@xterm/addon-search'),
        ]);
        const term = new Terminal({
          cursorBlink: true,
          convertEol: true,
          fontSize: fontSizeRef.current,
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
        term.open(containerRef.current!);
        termRef.current = term;
        fitAddonRef.current = fitAddon;
        fitAddon.fit();
        containerRef.current!.classList.add('crt-terminal');
        term.write('Welcome to the portfolio terminal');
        updateLive('Welcome to the portfolio terminal');
        prompt();

        term.onKey(({ key, domEvent }: any) => {
          onFocus();
          if (domEvent.ctrlKey && domEvent.shiftKey && domEvent.key === 'D') {
            domEvent.preventDefault();
            runCommand('split');
            return;
          }
          if (domEvent.ctrlKey && domEvent.key.toLowerCase() === 'c') {
            const sel = term.getSelection();
            if (sel) {
              domEvent.preventDefault();
              if (navigator.clipboard) {
                navigator.clipboard.writeText(sel);
              }
              term.clearSelection();
              return;
            }
          }
          if (domEvent.ctrlKey && domEvent.shiftKey && domEvent.key === 'V') {
            domEvent.preventDefault();
          }
        });
      })();
    }, []);
          if (navigator.clipboard) {
            navigator.clipboard.readText().then((text) => {
              term.write(text);
              commandRef.current += text;
              renderHint();
            });
          }
          return;
        }
        if (domEvent.ctrlKey && (domEvent.key === '+' || domEvent.key === '=')) {
          domEvent.preventDefault();
          fontSizeRef.current += 1;
          term.options.fontSize = fontSizeRef.current;
          fitAddon.fit();
          return;
        }
        if (domEvent.ctrlKey && domEvent.key === '-') {
          domEvent.preventDefault();
          fontSizeRef.current = Math.max(8, fontSizeRef.current - 1);
          term.options.fontSize = fontSizeRef.current;
          fitAddon.fit();
          return;
        }
        if (domEvent.ctrlKey && domEvent.key === 'r') {
          domEvent.preventDefault();
          if (!revSearchRef.current.active) {
            searchIdxRef.current = historyRef.current.length;
            setRevSearch({ active: true, query: '', match: '' });
          } else {
            updateSearch(revSearchRef.current.query, true);
          }
          return;
        }
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

      term.onData((data: string) => {
        if (revSearchRef.current.active) {
          if (data === '\r') {
            term.write('\x1b[2K\r');
            term.write(promptText);
            term.write(revSearchRef.current.match);
            commandRef.current = revSearchRef.current.match;
            setRevSearch({ active: false, query: '', match: '' });
            renderHint();
          } else if (data === '\u0003' || data === '\u001b') {
            setRevSearch({ active: false, query: '', match: '' });
            term.write('\x1b[2K\r');
            term.write(promptText);
            term.write(commandRef.current);
            renderHint();
          } else if (data === '\u007F') {
            const next = revSearchRef.current.query.slice(0, -1);
            updateSearch(next);
          } else {
            updateSearch(revSearchRef.current.query + data);
          }
          return;
        }
        if (data === '\r') {
          runCommand(commandRef.current);
          commandRef.current = '';
          clearSuggestions();
        } else if (data === '\u0003') {
          term.write('^C');
          prompt();
          commandRef.current = '';
          clearSuggestions();
        } else if (data === '\u007F') {
          if (commandRef.current.length > 0) {
            commandRef.current = commandRef.current.slice(0, -1);
            term.write('\b \b');
          }
          clearSuggestions();
        } else if (data === '\t') {
          // handled in onKey
        } else {
          commandRef.current += data;
          term.write(data);
          clearSuggestions();
        }
        renderHint();
      });

      if (typeof window !== 'undefined' && typeof Worker === 'function') {
        workerRef.current = new Worker(
          new URL('./terminal.worker.js', import.meta.url),
        );
        workerRef.current.onmessage = (e: any) => {
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
      let resizeObserver: ResizeObserver | null = null;
      if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
        resizeObserver = new ResizeObserver(handleResize);
        resizeObserver.observe(containerRef.current);
      }

      return () => {
        window.removeEventListener('resize', handleResize);
        resizeObserver?.disconnect();
        workerRef.current?.terminate();
        if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
        term.dispose();
      };
    }, [
      prompt,
      runCommand,
      handleTab,
      handleSuggestionNav,
      handleHistoryNav,
      onFocus,
      updateLive,
      renderHint,
      clearSuggestions,
      updateSearch,
    ]);

    useImperativeHandle(
      ref,
      () => ({
        runCommand,
        getContent: () => logRef.current,
        getCommand: () => commandRef.current,
        historyNav: handleHistoryNav,
      }),
      [runCommand, handleHistoryNav],
    );

    return (
      <div className="flex-1 w-full h-full relative" onClick={onFocus}>
        <div
          className="h-full w-full bg-ub-cool-grey"
          ref={containerRef}
          data-testid="xterm-container"
          aria-label="Terminal"
        />
        <div ref={ariaLiveRef} aria-live="polite" className="sr-only" />
        <div ref={suggestionLiveRef} aria-live="polite" className="sr-only" />
        {revSearch.active && (
          <div className="absolute bottom-0 left-0 w-full bg-black bg-opacity-90 text-green-400 text-sm px-2 pointer-events-none">
            (reverse-i-search)`{revSearch.query}`: {revSearch.match}
          </div>
        )}
      </div>
    );
};

const TerminalPane = forwardRef(TerminalPaneInner as any);
TerminalPane.displayName = 'TerminalPane';

const Terminal = forwardRef<any, any>((props, ref) => {
  const [panes, setPanes] = useState<number[]>([0]);
  const [paneHeights, setPaneHeights] = useState<number[]>([100]);
  const paneRefs = useRef<any[]>([]);
  const activePaneRef = useRef(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const startYRef = useRef(0);
  const startHeightsRef = useRef<number[]>([]);
  const resizingRef = useRef<number | null>(null);

  const addPane = useCallback(() => {
    setPanes((prev) => {
      const next = [...prev, prev.length];
      activePaneRef.current = next.length - 1;
      return next;
    });
    setPaneHeights((prev) => Array(prev.length + 1).fill(100 / (prev.length + 1)));
  }, []);

  const removePane = useCallback((idx: number) => {
    setPanes((prev) => {
      if (prev.length <= 1) return prev;
      const next = prev.filter((_, i) => i !== idx);
      paneRefs.current.splice(idx, 1);
      if (activePaneRef.current >= next.length) {
        activePaneRef.current = next.length - 1;
      } else if (activePaneRef.current > idx) {
        activePaneRef.current -= 1;
      }
      return next;
    });
    setPaneHeights((prev) => {
      if (prev.length <= 1) return prev;
      const remaining = prev.filter((_, i) => i !== idx);
      const total = remaining.reduce((a, b) => a + b, 0);
      return remaining.map((h) => (h / total) * 100);
    });
  }, []);

  const startResize = useCallback(
    (idx: number, e: React.MouseEvent) => {
      startYRef.current = e.clientY;
      startHeightsRef.current = [...paneHeights];
      resizingRef.current = idx;
      const onMove = (ev: MouseEvent) => {
        if (resizingRef.current === null || !containerRef.current) return;
        const deltaY = ev.clientY - startYRef.current;
        const totalHeight = containerRef.current.getBoundingClientRect().height;
        const percent = (deltaY / totalHeight) * 100;
        const i = resizingRef.current;
        const newHeights = [...startHeightsRef.current];
        newHeights[i] = Math.max(10, Math.min(90, startHeightsRef.current[i] + percent));
        newHeights[i + 1] = Math.max(
          10,
          Math.min(90, startHeightsRef.current[i + 1] - percent),
        );
        setPaneHeights(newHeights);
      };
      const onUp = () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        resizingRef.current = null;
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [paneHeights],
  );

  useImperativeHandle(
    ref,
    () => ({
      runCommand: (cmd: string) =>
        paneRefs.current[activePaneRef.current]?.runCommand(cmd),
      getContent: () => paneRefs.current[activePaneRef.current]?.getContent(),
      getCommand: () => paneRefs.current[activePaneRef.current]?.getCommand(),
      historyNav: (dir: 'up' | 'down') =>
        paneRefs.current[activePaneRef.current]?.historyNav(dir),
    }),
    [],
  );

  return (
    <div ref={containerRef} className="h-full w-full flex flex-col">
      {panes.map((id, idx) => (
        <React.Fragment key={id}>
          <div style={{ height: `${paneHeights[idx]}%` }} className="relative">
            <TerminalPane
              ref={(el) => {
                paneRefs.current[idx] = el;
              }}
              onSplit={addPane}
              onClose={() => removePane(idx)}
              onFocus={() => {
                activePaneRef.current = idx;
              }}
            />
          </div>
          {idx < panes.length - 1 && (
            <div
              className="h-1 bg-gray-700 cursor-row-resize"
              onMouseDown={(e) => startResize(idx, e)}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
});
Terminal.displayName = 'Terminal';

export default Terminal;

export const displayTerminal = (addFolder: any, openApp: any) => (
  <Terminal addFolder={addFolder} openApp={openApp} />
);

