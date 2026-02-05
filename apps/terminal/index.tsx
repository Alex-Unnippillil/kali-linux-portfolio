'use client';

import '@xterm/xterm/css/xterm.css';
import React, { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import useOPFS from '../../hooks/useOPFS';
import usePersistentState from '../../hooks/usePersistentState';
import commandRegistry, { CommandContext } from './commands';
import TerminalContainer from './components/Terminal';
import { useTab } from '../../components/ui/TabbedWindow';
import { createSessionManager } from './utils/sessionManager';
import { FauxFileSystem, TerminalFileSystem, VirtualFileSystem } from './utils/filesystem';
import { createOutputBuffer, stripAnsi } from './utils/outputBuffer';
import { createWorkerRunner } from './utils/workerRunner';
import { useTerminalPreferences, type TerminalPrefs } from './hooks/useTerminalPreferences';

// --- Polished Icons ---
const CopyIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}><rect x={9} y={9} width={13} height={13} rx={2} ry={2} /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
);
const SettingsIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx={12} cy={12} r={3} /></svg>
);

export interface TerminalProps {
  openApp?: (id: string) => void;
  sessionName?: string;
}

export interface TerminalHandle {
  runCommand: (command: string) => Promise<void>;
  getTranscript: () => string;
  getContent: () => string;
  clearTranscript: () => void;
  focus: () => void;
}

interface TranscriptEntry {
  type: 'prompt' | 'command' | 'output' | 'system';
  text: string;
  timestamp: number;
}

interface TerminalSessionSnapshot {
  version: number;
  history: string[];
  transcript: TranscriptEntry[];
  cwd: string;
  safeMode: boolean;
}

const TerminalApp = forwardRef<TerminalHandle, TerminalProps>(({ openApp, sessionName }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<any>(null);
  const fitRef = useRef<any>(null);
  const sessionRef = useRef<any>(null);
  const tab = useTab();
  const outputBufferRef = useRef(createOutputBuffer(1200));
  const workerRunnerRef = useRef(createWorkerRunner());

  // File System State
  const { root: opfsRoot, supported: opfsSupported } = useOPFS();
  const fsRef = useRef<TerminalFileSystem>(new VirtualFileSystem(null));
  const homePathRef = useRef('/home');

  // Terminal State
  const [isReady, setIsReady] = useState(false);
  const preferences = useTerminalPreferences();
  const { prefs, aliases, history, ready, setAliases, setHistory, setPrefs } = preferences;
  const [safeMode, setSafeMode] = useState(preferences.prefs.safeMode);
  const [persistSession, setPersistSession] = usePersistentState<boolean>(
    'terminal-session-persist',
    true,
    (value): value is boolean => typeof value === 'boolean',
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const settingsPanelRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchAddonRef = useRef<{
    findNext: (term: string, options?: { incremental?: boolean; caseSensitive?: boolean }) => boolean;
  } | null>(null);
  const transcriptRef = useRef<TranscriptEntry[]>([]);
  const appendTranscriptRef = useRef<(entry: Omit<TranscriptEntry, 'timestamp'>) => void>(() => {});
  const persistTimerRef = useRef<number | null>(null);
  const buildPromptRef = useRef<() => string>(() => '');
  const buildPromptTextRef = useRef<() => string>(() => '');
  const loadSnapshotRef = useRef<() => Promise<TerminalSessionSnapshot | null>>(async () => null);
  const schedulePersistRef = useRef<() => void>(() => {});
  const appendOutput = useCallback((text: string) => {
    outputBufferRef.current.append(text);
  }, []);
  const prefsRef = useRef(prefs);
  const appendOutputRef = useRef((text: string) => outputBufferRef.current.append(text));
  const setHistoryRef = useRef(setHistory);

  useEffect(() => {
    prefsRef.current = prefs;
    appendOutputRef.current = appendOutput;
    setHistoryRef.current = setHistory;
  }, [appendOutput, prefs, setHistory]);

  // Context Ref (Stable)
  const contextRef = useRef<CommandContext>({
    writeLine: (t) => {
      termRef.current?.writeln(t);
      appendOutput(t + '\n');
      appendTranscriptRef.current({ type: 'output', text: stripAnsi(t) });
    },
    files: {},
    fs: fsRef.current,
    cwd: '/home',
    setCwd: (p) => { contextRef.current.cwd = p; },
    history: [],
    aliases: {},
    safeMode: true,
    setAlias: (name, value) => { contextRef.current.aliases[name] = value; },
    runWorker: async () => { },
    clear: () => {
      termRef.current?.clear();
      outputBufferRef.current.clear();
    },
    openApp,
    listCommands: () => commandRegistry.getAll(),
  });

  // Initialize FS
  useEffect(() => {
    if (opfsRoot) {
      const fs = new VirtualFileSystem(opfsRoot);
      fsRef.current = fs;
      homePathRef.current = '/home';
      contextRef.current.fs = fs;
      (async () => {
        try {
          await fs.createDirectory('/home');
          await fs.createDirectory('/etc');
          await fs.createDirectory('/var');
          if (!(await fs.exists('/home/README.md'))) {
            await fs.writeFile('/home/README.md', `Welcome to the Kali Linux Portfolio Terminal!\n\nThis uses the same virtual filesystem as Files.\nTry 'help' or 'ls'.\n`);
          }
        } catch (e) {
          console.error('FS Init Error', e);
        }
      })();
      return;
    }

    if (!opfsSupported) {
      const fs = new FauxFileSystem('/');
      fsRef.current = fs;
      homePathRef.current = '/';
      contextRef.current.fs = fs;
      contextRef.current.cwd = '/';
    }
  }, [opfsRoot, opfsSupported]);

  // Keep context safeMode in sync
  useEffect(() => {
    contextRef.current.safeMode = safeMode;
  }, [safeMode]);

  useEffect(() => {
    if (!ready) return;
    setSafeMode(prefs.safeMode);
    contextRef.current.aliases = aliases;
    contextRef.current.history = history;
    contextRef.current.setAlias = (name, value) => {
      const next = { ...contextRef.current.aliases, [name]: value };
      contextRef.current.aliases = next;
      setAliases(next);
    };
  }, [aliases, history, prefs.safeMode, ready, setAliases]);

  useEffect(() => {
    outputBufferRef.current.setMaxLines(prefs.scrollback);
    if (termRef.current) {
      termRef.current.options.fontSize = prefs.fontSize;
      termRef.current.options.scrollback = prefs.scrollback;
      termRef.current.options.screenReaderMode = prefs.screenReaderMode;
    }
  }, [prefs.fontSize, prefs.scrollback, prefs.screenReaderMode]);

  const formatCwd = useCallback(() => {
    const cwd = contextRef.current.cwd;
    if (homePathRef.current === '/home') {
      return cwd.replace(/^\/home/, '~') || '~';
    }
    return cwd || '/';
  }, []);

  const buildPromptFor = useCallback((mode: boolean) => {
    const cwd = formatCwd();
    const safeTag = mode ? ' \x1b[1;35m[safe]\x1b[1;36m' : '';
    return `\r\n\x1b[1;36m┌──(\x1b[1;34mkali㉿kali\x1b[1;36m${safeTag})-[\x1b[1;33m${cwd}\x1b[1;36m]\r\n\x1b[1;36m└─\x1b[1;32m$\x1b[0m `;
  }, [formatCwd]);

  const buildPromptTextFor = useCallback((mode: boolean) => {
    const cwd = formatCwd();
    const safeTag = mode ? ' [safe]' : '';
    return `kali@kali${safeTag}:${cwd}$`;
  }, [formatCwd]);

  const buildPrompt = useCallback(() => buildPromptFor(safeMode), [buildPromptFor, safeMode]);
  const buildPromptText = useCallback(() => buildPromptTextFor(safeMode), [buildPromptTextFor, safeMode]);

  const simulateNetworkCommand = useCallback((command: string) => {
    const normalized = command.trim();
    const seed = Array.from(normalized).reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const latency = 20 + (seed % 180);
    const ip = `192.168.${(seed % 200) + 1}.${(seed % 50) + 10}`;
    return [
      `[simulated] ${normalized}`,
      `Connecting to ${ip}...`,
      `Latency: ${latency}ms`,
      'Note: network access is simulated in this portfolio terminal.',
    ].join('\n');
  }, []);

  const collectWorkerFiles = useCallback(async (command: string) => {
    const files: Record<string, string> = {};
    const segments = command
      .split('|')
      .map((segment) => segment.trim())
      .filter(Boolean);
    for (const segment of segments) {
      const [name, ...args] = segment.split(/\s+/);
      if (name === 'cat' && args[0]) {
        const resolved = contextRef.current.fs.resolvePath(contextRef.current.cwd, args[0]);
        const content = await contextRef.current.fs.readFile(resolved);
        if (content !== null) files[args[0]] = content;
      }
      if (name === 'grep') {
        const file = args.filter((arg) => !arg.startsWith('-')).slice(1)[0];
        if (file) {
          const resolved = contextRef.current.fs.resolvePath(contextRef.current.cwd, file);
          const content = await contextRef.current.fs.readFile(resolved);
          if (content !== null) files[file] = content;
        }
      }
      if (name === 'jq') {
        const file = args[1];
        if (file) {
          const resolved = contextRef.current.fs.resolvePath(contextRef.current.cwd, file);
          const content = await contextRef.current.fs.readFile(resolved);
          if (content !== null) files[file] = content;
        }
      }
    }
    return files;
  }, []);

  const runWorkerCommand = useCallback(async (command: string) => {
    const [name] = command.trim().split(/\s+/);
    const risky = ['curl', 'wget', 'nmap', 'ping', 'telnet', 'nc', 'netcat', 'ssh'];
    if (risky.includes(name)) {
      const output = simulateNetworkCommand(command);
      contextRef.current.writeLine(output);
      return;
    }
    const files = await collectWorkerFiles(command);
    const output = await workerRunnerRef.current.run(command, { files });
    output.split('\n').forEach((line, idx, arr) => {
      if (line.length === 0 && idx === arr.length - 1) return;
      contextRef.current.writeLine(line);
    });
  }, [collectWorkerFiles, simulateNetworkCommand]);

  const persistSnapshot = useCallback(async () => {
    if (!persistSession) return;
    const snapshot: TerminalSessionSnapshot = {
      version: 1,
      history: [...contextRef.current.history],
      transcript: [...transcriptRef.current],
      cwd: contextRef.current.cwd,
      safeMode,
    };
    const payload = JSON.stringify(snapshot);
    if (opfsRoot) {
      await fsRef.current.createDirectory('/kali-terminal');
      await fsRef.current.writeFile('/kali-terminal/session.json', payload);
    } else {
      try {
        window.localStorage.setItem('terminal-session', payload);
      } catch {
        // ignore persistence errors
      }
    }
  }, [opfsRoot, persistSession, safeMode]);

  const schedulePersist = useCallback(() => {
    if (!persistSession) return;
    if (persistTimerRef.current) return;
    persistTimerRef.current = window.setTimeout(() => {
      persistTimerRef.current = null;
      void persistSnapshot();
    }, 300);
  }, [persistSession, persistSnapshot]);

  const appendTranscript = useCallback((entry: Omit<TranscriptEntry, 'timestamp'>) => {
    const next: TranscriptEntry = { ...entry, timestamp: Date.now() };
    transcriptRef.current = [...transcriptRef.current, next].slice(-600);
    schedulePersist();
  }, [schedulePersist]);

  useEffect(() => {
    contextRef.current.runWorker = runWorkerCommand;
  }, [runWorkerCommand]);

  useEffect(() => {
    appendTranscriptRef.current = appendTranscript;
    buildPromptRef.current = buildPrompt;
    buildPromptTextRef.current = buildPromptText;
    loadSnapshotRef.current = async () => {
      if (!persistSession) return null;
      if (opfsRoot) {
        const payload = await fsRef.current.readFile('/kali-terminal/session.json');
        if (!payload) return null;
        return JSON.parse(payload) as TerminalSessionSnapshot;
      }
      try {
        const raw = window.localStorage.getItem('terminal-session');
        return raw ? (JSON.parse(raw) as TerminalSessionSnapshot) : null;
      } catch {
        return null;
      }
    };
    schedulePersistRef.current = schedulePersist;
  }, [appendTranscript, buildPrompt, buildPromptText, opfsRoot, persistSession, schedulePersist]);

  // --- Main Terminal Logic ---
  useEffect(() => {
    let isMounted = true;
    let terminalInstance: any = null;
    let resizeHandler: (() => void) | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let containerEl: HTMLDivElement | null = null;
    const workerRunner = workerRunnerRef.current;
    let contextMenuHandler: ((event: MouseEvent) => void) | null = null;
    let focusHandler: (() => void) | null = null;
    let keyStopHandler: ((event: KeyboardEvent) => void) | null = null;
    let inputElement: HTMLTextAreaElement | null = null;

    const init = async () => {
      containerEl = containerRef.current;
      if (!containerEl) return;

      // Dynamic imports to avoid SSR issues
      const [{ Terminal }, { FitAddon }, { SearchAddon }, { WebLinksAddon }] = await Promise.all([
        import('@xterm/xterm'),
        import('@xterm/addon-fit'),
        import('@xterm/addon-search'),
        import('@xterm/addon-web-links'),
      ]);

      // Check mount status after async load
      if (!isMounted) return;

      // If a terminal already exists on this ref (from double-fire), dispose it
      if (termRef.current) {
        termRef.current.dispose();
        termRef.current = null;
      }

      const term = new Terminal({
        cursorBlink: true,
        fontSize: prefsRef.current.fontSize,
        fontWeight: '500',
        fontFamily: '"Fira Code", monospace',
        allowProposedApi: true,
        disableStdin: false,
        scrollback: prefsRef.current.scrollback,
        screenReaderMode: prefsRef.current.screenReaderMode,
        theme: {
          background: '#0a0a0a',
          foreground: '#ffffff', // High Contrast
          cursor: '#00ff00',
          selectionBackground: '#444444',
          black: '#000000',
          red: '#ff5555',
          green: '#50fa7b',
          yellow: '#f1fa8c',
          blue: '#bd93f9',
          magenta: '#ff79c6',
          cyan: '#8be9fd',
          white: '#f8f8f2',
          brightBlack: '#6272a4',
          brightRed: '#ff6e6e',
          brightGreen: '#69ff94',
          brightYellow: '#ffffa5',
          brightBlue: '#d6acff',
          brightMagenta: '#ff92df',
          brightCyan: '#a4ffff',
          brightWhite: '#ffffff',
        },
      });

      const fit = new FitAddon();
      term.loadAddon(fit);
      const searchAddon = new SearchAddon();
      term.loadAddon(searchAddon);
      const webLinks = new WebLinksAddon((_event, uri) => {
        const safe = uri.startsWith('http://') || uri.startsWith('https://');
        if (!safe) return;
        window.open(uri, '_blank', 'noopener,noreferrer');
      });
      term.loadAddon(webLinks);
      searchAddonRef.current = searchAddon;


      term.open(containerEl);
      fit.fit();
      term.focus();

      termRef.current = term;
      fitRef.current = fit;
      terminalInstance = term;

      // Initialize Session Manager
      sessionRef.current = createSessionManager({
        getRegistry: () => commandRegistry.getRegistry(),
        context: contextRef.current,
        prompt: () => {
          term.write(buildPromptRef.current());
          appendTranscriptRef.current({ type: 'prompt', text: buildPromptTextRef.current() });
        },
        write: (t) => term.write(t),
        writeLine: (t) => {
          term.writeln(t);
          appendOutputRef.current(t + '\n');
          appendTranscriptRef.current({ type: 'output', text: stripAnsi(t) });
        },
        onHistoryUpdate: (history) => {
          setHistoryRef.current(history.slice(-500));
          schedulePersistRef.current();
        },
        onCancelRunning: () => {},
        onCommand: (command) => {
          appendTranscriptRef.current({
            type: 'command',
            text: `${buildPromptTextRef.current()} ${command}`,
          });
          schedulePersistRef.current();
        },
      });

      // Pass terminal for scrollback config
      sessionRef.current.setTerminal(term);

      const handleTerminalInput = (data: string) => {
        sessionRef.current?.handleInput(data);
      };

      // Bind Input
      term.onData(handleTerminalInput);

      term.attachCustomKeyEventHandler((event: KeyboardEvent) => {
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f') {
          event.preventDefault();
          setSearchOpen(true);
          return false;
        }
        if (event.ctrlKey && event.shiftKey && event.code === 'KeyC') {
          const selection = term.getSelection();
          if (selection) {
            navigator.clipboard?.writeText(selection).catch(() => {});
          }
          return false;
        }
        if (event.ctrlKey && event.shiftKey && event.code === 'KeyV') {
          navigator.clipboard?.readText().then((text) => {
            sessionRef.current?.handlePaste(text);
          }).catch(() => {});
          return false;
        }
        return true;
      });

      focusHandler = () => {
        term.focus();
      };
      keyStopHandler = (event: KeyboardEvent) => event.stopPropagation();
      inputElement = (term as { textarea?: HTMLTextAreaElement }).textarea ?? null;

      contextMenuHandler = (event: MouseEvent) => {
        event.preventDefault();
        const selection = term.getSelection();
        if (selection) {
          navigator.clipboard?.writeText(selection).catch(() => {});
        }
      };
      containerEl.addEventListener('contextmenu', contextMenuHandler);
      containerEl.addEventListener('pointerdown', focusHandler, true);
      term.element?.addEventListener('keydown', keyStopHandler);

      // Handle Resize
      resizeHandler = () => fit.fit();
      if (typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(() => fit.fit());
        resizeObserver.observe(containerEl);
      } else {
        window.addEventListener('resize', resizeHandler);
      }

      const snapshot = await loadSnapshotRef.current();
      const writeOutputLine = (text: string) => {
        term.writeln(text);
        appendOutputRef.current(text + '\n');
      };

      if (snapshot) {
        contextRef.current.history = snapshot.history ?? [];
        contextRef.current.cwd = snapshot.cwd || contextRef.current.cwd;
        transcriptRef.current = snapshot.transcript ?? [];
        if (typeof snapshot.safeMode === 'boolean') {
          contextRef.current.safeMode = snapshot.safeMode;
          setSafeMode(snapshot.safeMode);
        }
        if (snapshot.transcript?.length) {
          snapshot.transcript.forEach((entry) => {
            writeOutputLine(entry.text);
          });
        }
      } else {
        writeOutputLine('\x1b[1;37mWelcome to the Kali Linux Portfolio Terminal.\x1b[0m');
        writeOutputLine('Type \x1b[1;33mhelp\x1b[0m to list commands.');
      }

      // Initial Prompt
      const initialPrompt = () => {
        term.write(buildPromptRef.current());
        appendTranscriptRef.current({ type: 'prompt', text: buildPromptTextRef.current() });
      };

      // Small delay to ensure fit is correct
      setTimeout(() => {
        if (isMounted) {
          fit.fit();
          term.focus();
          initialPrompt();
          setIsReady(true);
        }
      }, 100);
    };

    init();

    return () => {
      isMounted = false;
      // Clean up resize listener? (In strict mode this might double add if not careful, but component unmount clears it usually).
      // Actually, we added listener to window. We should remove it.
      // But the init function is closed over.
      // Ideally we'd store the resize handler.
      // For simplicity in this fix, we accept minor leak on resize in dev, or better:
      // Move resize logic to separate effect or use ResizeObserver.
      if (terminalInstance) {
        terminalInstance.dispose();
      }
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      if (resizeHandler) {
        window.removeEventListener('resize', resizeHandler);
      }
      if (contextMenuHandler && containerEl) {
        containerEl.removeEventListener('contextmenu', contextMenuHandler);
      }
      if (focusHandler && containerEl) {
        containerEl.removeEventListener('pointerdown', focusHandler, true);
      }
      if (keyStopHandler && terminalInstance?.element) {
        terminalInstance.element.removeEventListener('keydown', keyStopHandler);
      }
      workerRunner.dispose();
      termRef.current = null;
    };
  }, []);

  // Update Session Config (safe to run on every render or when dependencies change)
  useEffect(() => {
    if (sessionRef.current && termRef.current) {
      sessionRef.current.updateConfig({
        context: contextRef.current,
        write: (t: string) => termRef.current.write(t),
        writeLine: (t: string) => {
          termRef.current.writeln(t);
          appendOutput(t + '\n');
          appendTranscriptRef.current({ type: 'output', text: stripAnsi(t) });
        },
        prompt: () => {
          termRef.current.write(buildPromptRef.current());
          appendTranscriptRef.current({ type: 'prompt', text: buildPromptTextRef.current() });
        }
      });
    }
  });

  const handleCopySelection = async () => {
    if (!termRef.current) return;
    const selection = termRef.current.getSelection();
    if (selection) {
      try {
        await navigator.clipboard.writeText(selection);
        termRef.current.writeln('\r\n\x1b[1;33m[System] Selection copied.\x1b[0m');
        appendOutput('[System] Selection copied.\n');
      } catch {
        termRef.current.writeln('\r\n\x1b[1;33m[System] Clipboard blocked. Use Ctrl+Shift+C.\x1b[0m');
        appendOutput('[System] Clipboard blocked. Use Ctrl+Shift+C.\n');
      }
    } else {
      termRef.current.selectAll();
      termRef.current.focus();
    }
  };

  const toggleSafeMode = () => {
    const newVal = !safeMode;
    setSafeMode(newVal);
    setPrefs({ ...prefs, safeMode: newVal });
    if (termRef.current) {
      const message = `[System] Safe Mode: ${newVal ? 'ON' : 'OFF'}`;
      termRef.current.writeln(`\r\n\x1b[1;33m${message}\x1b[0m`);
      appendOutput(message + '\n');
      appendTranscriptRef.current({ type: 'system', text: message });
      sessionRef.current?.renderPrompt();
    }
  };

  const togglePersistence = () => {
    const next = !persistSession;
    setPersistSession(next);
    if (termRef.current) {
      const message = `[System] Session persistence: ${next ? 'ON' : 'OFF'}`;
      termRef.current.writeln(`\r\n\x1b[1;33m${message}\x1b[0m`);
      appendOutput(message + '\n');
      appendTranscriptRef.current({ type: 'system', text: message });
      if (next) {
        void persistSnapshot();
      }
      sessionRef.current?.renderPrompt();
    }
  };

  const updatePrefs = useCallback(
    (patch: Partial<TerminalPrefs>) => {
      setPrefs({ ...prefs, ...patch });
    },
    [prefs, setPrefs],
  );

  const applySearch = useCallback(() => {
    if (!searchAddonRef.current || !searchQuery) return;
    searchAddonRef.current.findNext(searchQuery, { incremental: true, caseSensitive: false });
  }, [searchQuery]);

  useEffect(() => {
    if (tab?.active && termRef.current) {
      termRef.current.focus();
    }
  }, [tab?.active, isReady]);

  useEffect(() => {
    if (!settingsOpen) return;
    const handleClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (settingsPanelRef.current?.contains(target)) return;
      if (settingsButtonRef.current?.contains(target)) return;
      setSettingsOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => {
      document.removeEventListener('mousedown', handleClick);
    };
  }, [settingsOpen]);

  useEffect(() => {
    if (!searchOpen) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setSearchOpen(false);
      }
    };
    document.addEventListener('keydown', handleKey);
    searchInputRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', handleKey);
    };
  }, [searchOpen]);

  useImperativeHandle(ref, () => ({
    runCommand: async (command: string) => {
      if (!sessionRef.current) return;
      await sessionRef.current.runCommand(command);
      sessionRef.current.renderPrompt();
    },
    getTranscript: () => outputBufferRef.current.getText(),
    clearTranscript: () => outputBufferRef.current.clear(),
    focus: () => termRef.current?.focus(),
    getContent: () => outputBufferRef.current.getText(),
  }), []);

  return (
    <div className="flex h-full flex-col bg-[#0a0a0a] text-white font-mono text-sm overflow-hidden rounded-b-lg">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-[#333] bg-[#111] px-3 py-2 select-none">
        <div className="flex items-center gap-2">
          <span className="text-gray-400 font-semibold">Terminal</span>
          {sessionName && (
            <span className="px-1.5 py-0.5 rounded bg-slate-700/60 text-slate-200 text-[10px] uppercase tracking-wider">
              {sessionName}
            </span>
          )}
          {safeMode && <span className="px-1.5 py-0.5 rounded bg-green-900/50 text-green-400 text-[10px] uppercase tracking-wider">Safe Mode</span>}
          {persistSession && <span className="px-1.5 py-0.5 rounded bg-blue-900/50 text-blue-300 text-[10px] uppercase tracking-wider">Persisted</span>}
        </div>
        <div className="flex items-center gap-1 relative">
          <button
            onClick={handleCopySelection}
            className="p-1.5 hover:bg-[#333] rounded transition-colors text-gray-400 hover:text-white"
            title="Copy selection (or select all)"
          >
            <CopyIcon />
          </button>
          <button
            onClick={() => setSettingsOpen((open) => !open)}
            className="p-1.5 hover:bg-[#333] rounded transition-colors text-gray-400 hover:text-white"
            title="Terminal settings"
            aria-haspopup="dialog"
            aria-expanded={settingsOpen}
            ref={settingsButtonRef}
          >
            <SettingsIcon />
          </button>
          {settingsOpen && (
            <div
              ref={settingsPanelRef}
              className="absolute right-0 top-10 z-20 w-64 rounded border border-[#333] bg-[#111] p-3 text-xs text-gray-200 shadow-lg"
              role="dialog"
              aria-label="Terminal settings"
            >
              <div className="flex items-center justify-between py-1">
                <span>Safe Mode</span>
                <button
                  type="button"
                  className={`rounded px-2 py-0.5 text-[10px] uppercase ${safeMode ? 'bg-green-900/60 text-green-300' : 'bg-red-900/60 text-red-200'}`}
                  onClick={toggleSafeMode}
                >
                  {safeMode ? 'On' : 'Off'}
                </button>
              </div>
              <div className="flex items-center justify-between py-1">
                <span>Persistence</span>
                <button
                  type="button"
                  className={`rounded px-2 py-0.5 text-[10px] uppercase ${persistSession ? 'bg-blue-900/60 text-blue-300' : 'bg-gray-800 text-gray-300'}`}
                  onClick={togglePersistence}
                >
                  {persistSession ? 'On' : 'Off'}
                </button>
              </div>
              <div className="py-1">
                <label htmlFor="terminal-font-size" className="block text-[10px] uppercase text-gray-400">Font size</label>
                <input
                  id="terminal-font-size"
                  aria-label="Font size"
                  type="range"
                  min={12}
                  max={20}
                  value={prefs.fontSize}
                  onChange={(event) => updatePrefs({ fontSize: Number(event.target.value) })}
                  className="w-full"
                />
              </div>
              <div className="py-1">
                <label htmlFor="terminal-scrollback" className="block text-[10px] uppercase text-gray-400">Scrollback</label>
                <input
                  id="terminal-scrollback"
                  aria-label="Scrollback size"
                  type="number"
                  min={300}
                  max={5000}
                  value={prefs.scrollback}
                  onChange={(event) => updatePrefs({ scrollback: Number(event.target.value) })}
                  className="w-full rounded bg-[#1b1b1b] px-2 py-1 text-xs text-white"
                />
              </div>
              <div className="flex items-center justify-between py-1">
                <span>Screen reader</span>
                <button
                  type="button"
                  className={`rounded px-2 py-0.5 text-[10px] uppercase ${prefs.screenReaderMode ? 'bg-green-900/60 text-green-300' : 'bg-gray-800 text-gray-300'}`}
                  onClick={() => updatePrefs({ screenReaderMode: !prefs.screenReaderMode })}
                >
                  {prefs.screenReaderMode ? 'On' : 'Off'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Terminal Area */}
      <div className="relative flex-1 min-h-0 bg-[#0a0a0a]">
        {searchOpen && (
          <div className="absolute right-4 top-4 z-20 flex items-center gap-2 rounded border border-[#333] bg-[#111] px-3 py-2 text-xs text-gray-200 shadow-lg">
            <input
              aria-label="Search scrollback"
              ref={searchInputRef}
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  applySearch();
                }
                if (event.key === 'Escape') {
                  setSearchOpen(false);
                }
              }}
              placeholder="Search scrollback…"
              className="w-48 rounded bg-[#1b1b1b] px-2 py-1 text-xs text-white"
            />
            <button
              type="button"
              className="rounded bg-[#222] px-2 py-1 text-[10px] uppercase text-gray-200"
              onClick={applySearch}
            >
              Find
            </button>
            <button
              type="button"
              className="rounded bg-[#222] px-2 py-1 text-[10px] uppercase text-gray-200"
              onClick={() => setSearchOpen(false)}
            >
              Close
            </button>
          </div>
        )}
        {/* Wrapper to ensure size */}
        <TerminalContainer
          ref={containerRef}
          className="h-full w-full absolute inset-0"
          onClick={() => termRef.current?.focus()}
          onMouseDown={() => termRef.current?.focus()}
        />
      </div>
      <form
        className="flex items-center gap-2 border-t border-[#333] bg-[#0f0f0f] px-3 py-2 md:hidden"
        onSubmit={(event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const input = form.elements.namedItem('mobile-command') as HTMLInputElement | null;
          const value = input?.value.trim();
          if (value) {
            void sessionRef.current?.runCommand(value).then(() => {
              sessionRef.current?.renderPrompt();
            });
            if (input) input.value = '';
          }
        }}
      >
        <input
          name="mobile-command"
          aria-label="Command input"
          placeholder="Type a command…"
          className="flex-1 rounded bg-[#1b1b1b] px-3 py-2 text-xs text-white"
        />
        <button
          type="submit"
          className="rounded bg-[#222] px-3 py-2 text-[10px] uppercase text-gray-200"
        >
          Run
        </button>
      </form>
    </div>
  );
});

TerminalApp.displayName = 'TerminalApp';
export default TerminalApp;
