'use client';

import '@xterm/xterm/css/xterm.css';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import useOPFS from '../../hooks/useOPFS';
import usePersistentState from '../../hooks/usePersistentState';
import commandRegistry, { CommandContext } from './commands';
import TerminalContainer from './components/Terminal';
import { useTab } from '../../components/ui/TabbedWindow';
import { createSessionManager } from './utils/sessionManager';
import { FauxFileSystem, TerminalFileSystem, VirtualFileSystem } from './utils/filesystem';

// --- Polished Icons ---
const CopyIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}><rect x={9} y={9} width={13} height={13} rx={2} ry={2} /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
);
const SettingsIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx={12} cy={12} r={3} /></svg>
);
const PersistIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M6 2h9l3 3v15a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" /><path d="M14 2v4H8V2" /><path d="M8 12h8" /><path d="M8 16h6" /></svg>
);

export interface TerminalProps {
  openApp?: (id: string) => void;
  sessionName?: string;
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

const TerminalApp = ({ openApp, sessionName }: TerminalProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<any>(null);
  const fitRef = useRef<any>(null);
  const sessionRef = useRef<any>(null);
  const tab = useTab();

  // File System State
  const { root: opfsRoot, supported: opfsSupported } = useOPFS();
  const fsRef = useRef<TerminalFileSystem>(new VirtualFileSystem(null));
  const homePathRef = useRef('/home');

  // Terminal State
  const [isReady, setIsReady] = useState(false);
  const [safeMode, setSafeMode] = useState(true);
  const [persistSession, setPersistSession] = usePersistentState<boolean>(
    'terminal-session-persist',
    true,
    (value): value is boolean => typeof value === 'boolean',
  );
  const transcriptRef = useRef<TranscriptEntry[]>([]);
  const appendTranscriptRef = useRef<(entry: Omit<TranscriptEntry, 'timestamp'>) => void>(() => {});
  const persistTimerRef = useRef<number | null>(null);
  const buildPromptRef = useRef<() => string>(() => '');
  const buildPromptTextRef = useRef<() => string>(() => '');
  const loadSnapshotRef = useRef<() => Promise<TerminalSessionSnapshot | null>>(async () => null);
  const schedulePersistRef = useRef<() => void>(() => {});

  // Context Ref (Stable)
  const contextRef = useRef<CommandContext>({
    writeLine: (t) => {
      termRef.current?.writeln(t);
      appendTranscriptRef.current({ type: 'output', text: t });
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
    clear: () => termRef.current?.clear(),
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
      await fsRef.current.createDirectory('/.terminal');
      await fsRef.current.writeFile('/.terminal/session.json', payload);
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
    appendTranscriptRef.current = appendTranscript;
    buildPromptRef.current = buildPrompt;
    buildPromptTextRef.current = buildPromptText;
    loadSnapshotRef.current = loadSnapshot;
    schedulePersistRef.current = schedulePersist;
  }, [appendTranscript, buildPrompt, buildPromptText, loadSnapshot, schedulePersist]);

  const loadSnapshot = useCallback(async () => {
    if (!persistSession) return null;
    if (opfsRoot) {
      const payload = await fsRef.current.readFile('/.terminal/session.json');
      if (!payload) return null;
      return JSON.parse(payload) as TerminalSessionSnapshot;
    }
    try {
      const raw = window.localStorage.getItem('terminal-session');
      return raw ? (JSON.parse(raw) as TerminalSessionSnapshot) : null;
    } catch {
      return null;
    }
  }, [opfsRoot, persistSession]);

  // --- Main Terminal Logic ---
  useEffect(() => {
    let isMounted = true;
    let terminalInstance: any = null;
    let resizeHandler: (() => void) | null = null;
    let contextMenuHandler: ((event: MouseEvent) => void) | null = null;

    const init = async () => {
      if (!containerRef.current) return;

      // Dynamic imports to avoid SSR issues
      const [{ Terminal }, { FitAddon }] = await Promise.all([
        import('@xterm/xterm'),
        import('@xterm/addon-fit'),
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
        fontSize: 15,
        fontWeight: '500',
        fontFamily: '"Fira Code", monospace',
        allowProposedApi: true,
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


      term.open(containerRef.current);
      fit.fit();

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
          appendTranscriptRef.current({ type: 'output', text: t });
        },
        onHistoryUpdate: () => schedulePersistRef.current(),
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

      // Bind Input
      term.onData((data: string) => {
        sessionRef.current.handleInput(data);
      });

      term.attachCustomKeyEventHandler((event: KeyboardEvent) => {
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

      contextMenuHandler = (event: MouseEvent) => {
        event.preventDefault();
        const selection = term.getSelection();
        if (selection) {
          navigator.clipboard?.writeText(selection).catch(() => {});
        }
      };
      containerRef.current?.addEventListener('contextmenu', contextMenuHandler);

      // Handle Resize
      resizeHandler = () => fit.fit();
      window.addEventListener('resize', resizeHandler);

      const snapshot = await loadSnapshotRef.current();
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
            term.writeln(entry.text);
          });
        }
      } else {
        term.writeln('\x1b[1;37mWelcome to the Kali Linux Portfolio Terminal.\x1b[0m');
        term.writeln('Type \x1b[1;33mhelp\x1b[0m to list commands.');
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
      if (resizeHandler) {
        window.removeEventListener('resize', resizeHandler);
      }
      if (contextMenuHandler && containerRef.current) {
        containerRef.current.removeEventListener('contextmenu', contextMenuHandler);
      }
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
          appendTranscriptRef.current({ type: 'output', text: t });
        },
        prompt: () => {
          termRef.current.write(buildPromptRef.current());
          appendTranscriptRef.current({ type: 'prompt', text: buildPromptTextRef.current() });
        }
      });
    }
  });

  const handleSelectAll = () => {
    if (termRef.current) {
      termRef.current.selectAll();
      termRef.current.focus();
    }
  };

  const toggleSafeMode = () => {
    const newVal = !safeMode;
    setSafeMode(newVal);
    if (termRef.current) {
      const message = `[System] Safe Mode: ${newVal ? 'ON' : 'OFF'}`;
      termRef.current.writeln(`\r\n\x1b[1;33m${message}\x1b[0m`);
      appendTranscriptRef.current({ type: 'system', text: message });
      // Reprompt
      termRef.current.write(buildPromptFor(newVal));
      appendTranscriptRef.current({ type: 'prompt', text: buildPromptTextFor(newVal) });
    }
  };

  const togglePersistence = () => {
    const next = !persistSession;
    setPersistSession(next);
    if (termRef.current) {
      const message = `[System] Session persistence: ${next ? 'ON' : 'OFF'}`;
      termRef.current.writeln(`\r\n\x1b[1;33m${message}\x1b[0m`);
      appendTranscriptRef.current({ type: 'system', text: message });
      if (next) {
        void persistSnapshot();
      }
      termRef.current.write(buildPromptFor(safeMode));
      appendTranscriptRef.current({ type: 'prompt', text: buildPromptTextFor(safeMode) });
    }
  };

  useEffect(() => {
    if (tab?.active && termRef.current) {
      termRef.current.focus();
    }
  }, [tab?.active, isReady]);

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
        <div className="flex items-center gap-1">
          <button
            onClick={handleSelectAll}
            className="p-1.5 hover:bg-[#333] rounded transition-colors text-gray-400 hover:text-white"
            title="Select All"
          >
            <CopyIcon />
          </button>
          <button
            onClick={toggleSafeMode}
            className={`p-1.5 hover:bg-[#333] rounded transition-colors text-gray-400 hover:text-white ${!safeMode ? 'text-red-400 hover:text-red-300' : ''}`}
            title="Toggle Safe Mode"
          >
            <SettingsIcon />
          </button>
          <button
            onClick={togglePersistence}
            className={`p-1.5 hover:bg-[#333] rounded transition-colors text-gray-400 hover:text-white ${persistSession ? 'text-blue-300 hover:text-blue-200' : ''}`}
            title="Toggle Session Persistence"
          >
            <PersistIcon />
          </button>
        </div>
      </div>

      {/* Terminal Area */}
      <div className="relative flex-1 min-h-0 bg-[#0a0a0a]">
        {/* Wrapper to ensure size */}
        <TerminalContainer
          ref={containerRef}
          className="h-full w-full absolute inset-0"
          onClick={() => termRef.current?.focus()}
          onMouseDown={() => termRef.current?.focus()}
        />
      </div>
    </div>
  );
};

TerminalApp.displayName = 'TerminalApp';
export default TerminalApp;
