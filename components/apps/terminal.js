import React, { useEffect, useRef, forwardRef, useImperativeHandle, useCallback } from 'react';

// Maximum number of commands kept in history
const HISTORY_LIMIT = 100;
const HOME = '/home/alex';

const APP_ALIASES = {
  code: 'vscode',
  x: 'x',
  spotify: 'spotify',
  chrome: 'chrome',
  youtube: 'youtube',
  weather: 'weather',
  gedit: 'gedit',
  settings: 'settings',
};

const Terminal = forwardRef(({ addFolder, openApp }, ref) => {
  const containerRef = useRef(null);
  const termRef = useRef(null);
  const fitAddonRef = useRef(null);
  const commandRef = useRef('');
  const logRef = useRef('');
  const historyRef = useRef([]);
  const historyIndexRef = useRef(0);
  const cwdRef = useRef(HOME);
  const dirsRef = useRef(new Set([HOME]));

  const promptText = 'alex@kali:~$ ';

  const prompt = useCallback(() => {
    termRef.current?.write(`\r\n${promptText}`);
  }, []);

  const resolvePath = (base, target) => {
    if (!target || target === '~') return HOME;
    const stack = base.split('/').filter(Boolean);
    const parts = target.split('/');
    if (target.startsWith('/')) {
      stack.length = 0;
    }
    parts.forEach((p) => {
      if (!p || p === '.') return;
      if (p === '..') stack.pop();
      else stack.push(p);
    });
    return '/' + stack.join('/');
  };

  const listDir = (path) => {
    const prefix = path.endsWith('/') ? path : path + '/';
    const entries = Array.from(dirsRef.current)
      .filter((d) => d !== path && d.startsWith(prefix) && !d.slice(prefix.length).includes('/'))
      .map((d) => d.slice(prefix.length))
      .sort();
    return entries.join('  ');
  };

  const clear = () => {
    termRef.current?.clear();
    logRef.current = '';
  };

  const runCommand = useCallback(
    (input) => {
      const trimmed = input.trim();
      if (!trimmed) {
        prompt();
        return '';
      }

      if (historyRef.current.length === HISTORY_LIMIT) historyRef.current.shift();
      historyRef.current.push(trimmed);
      historyIndexRef.current = historyRef.current.length;

      const [cmd, ...args] = trimmed.split(/\s+/);
      let output = '';

      const write = (text = '') => {
        termRef.current?.writeln(text);
        if (text) logRef.current += text + '\n';
      };

      if (cmd === 'help') {
        const cmds = [
          'help',
          'clear',
          'pwd',
          'cd',
          'ls',
          'echo',
          'mkdir',
          'exit',
          ...Object.keys(APP_ALIASES),
        ];
        output = `Available commands: ${cmds.sort().join(' ')}`;
        write('');
        write(output);
      } else if (cmd === 'clear') {
        clear();
      } else if (cmd === 'pwd') {
        output = cwdRef.current;
        write('');
        write(output);
      } else if (cmd === 'cd') {
        const target = args[0];
        const newPath = resolvePath(cwdRef.current, target);
        if (dirsRef.current.has(newPath)) {
          cwdRef.current = newPath;
        } else {
          output = `bash: cd: ${target}: No such file or directory`;
          write('');
          write(output);
        }
      } else if (cmd === 'ls') {
        output = listDir(cwdRef.current);
        write('');
        write(output);
      } else if (cmd === 'echo') {
        output = args.join(' ');
        write('');
        write(output);
      } else if (cmd === 'mkdir') {
        const name = args[0];
        if (name) {
          const newDir = resolvePath(cwdRef.current, name);
          dirsRef.current.add(newDir);
        }
      } else if (cmd === 'exit') {
        output = 'Session terminated';
        write('');
        write(output);
      } else if (APP_ALIASES[cmd]) {
        openApp?.(APP_ALIASES[cmd]);
      } else {
        output = `Command '${trimmed}' not found`;
        write('');
        write(output);
      }

      prompt();
      return output;
    },
    [openApp, prompt]
  );

  useEffect(() => {
    let term;
    let fitAddon;
    let mounted = true;

    const init = async () => {
      const [{ Terminal }, { FitAddon }, { SearchAddon }] = await Promise.all([
        import('@xterm/xterm'),
        import('@xterm/addon-fit'),
        import('@xterm/addon-search'),
      ]);
      await import('@xterm/xterm/css/xterm.css');
      if (!mounted) return;
      term = new Terminal({ cursorBlink: true, convertEol: true });
      fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      term.loadAddon(new SearchAddon());
      term.open(containerRef.current);
      termRef.current = term;
      fitAddonRef.current = fitAddon;
      fitAddon.fit();
      term.write('Welcome to the portfolio terminal');
      prompt();
      term.onKey(({ key, domEvent }) => {
        if (domEvent.ctrlKey && domEvent.key === 'l') {
          domEvent.preventDefault();
          clear();
          prompt();
        }
      });
    };

    init();

    const handleResize = () => fitAddonRef.current?.fit();
    window.addEventListener('resize', handleResize);

    return () => {
      mounted = false;
      window.removeEventListener('resize', handleResize);
      term?.dispose();
    };
  }, [prompt]);

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
