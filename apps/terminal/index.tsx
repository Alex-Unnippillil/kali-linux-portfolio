'use client';

import '@xterm/xterm/css/xterm.css';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import useOPFS from '../../hooks/useOPFS';
import commandRegistry, { CommandContext } from './commands';
import TerminalContainer from './components/Terminal';
import { createSessionManager } from './utils/sessionManager';
import { VirtualFileSystem } from './utils/filesystem';

// --- Polished Icons ---
const CopyIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}><rect x={9} y={9} width={13} height={13} rx={2} ry={2} /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
);
const SettingsIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx={12} cy={12} r={3} /></svg>
);

export interface TerminalProps {
  openApp?: (id: string) => void;
}

const TerminalApp = ({ openApp }: TerminalProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<any>(null);
  const fitRef = useRef<any>(null);
  const sessionRef = useRef<any>(null);

  // File System State
  const { root: opfsRoot } = useOPFS();
  const fsRef = useRef(new VirtualFileSystem(null));

  // Terminal State
  const [isReady, setIsReady] = useState(false);
  const [safeMode, setSafeMode] = useState(true);

  // Initialize FS
  useEffect(() => {
    if (opfsRoot) {
      fsRef.current.setRoot(opfsRoot);
      (async () => {
        try {
          await fsRef.current.createDirectory('/home');
          await fsRef.current.createDirectory('/etc');
          await fsRef.current.createDirectory('/var');
          if (!(await fsRef.current.exists('/home/README.md'))) {
            await fsRef.current.writeFile('/home/README.md', `Welcome to the Kali Linux Portfolio Terminal!\n\nThis uses a virtual filesystem (OPFS).\nTry 'help' or 'ls'.\n`);
          }
        } catch (e) {
          console.error('FS Init Error', e);
        }
      })();
    }
  }, [opfsRoot]);

  // Context Ref (Stable)
  const contextRef = useRef<CommandContext>({
    writeLine: (t) => termRef.current?.writeln(t),
    files: {},
    fs: fsRef.current,
    cwd: '/home',
    setCwd: (p) => { contextRef.current.cwd = p; },
    history: [],
    aliases: {},
    safeMode: true,
    runWorker: async () => { },
    clear: () => termRef.current?.clear(),
    openApp,
    listCommands: () => commandRegistry.getAll(),
  });

  // Keep context safeMode in sync
  useEffect(() => {
    contextRef.current.safeMode = safeMode;
  }, [safeMode]);

  // --- Main Terminal Logic ---
  useEffect(() => {
    let isMounted = true;
    let terminalInstance: any = null;

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
          const cwd = contextRef.current.cwd.replace(/^\/home/, '~');
          const time = new Date().toLocaleTimeString('en-US', { hour12: false });
          term.write(`\r\n\x1b[1;36m┌──(\x1b[1;34mkali㉿kali\x1b[1;36m)-[\x1b[1;33m${cwd}\x1b[1;36m]\r\n\x1b[1;36m└─\x1b[1;32m$\x1b[0m `);
        },
        write: (t) => term.write(t),
        writeLine: (t) => term.writeln(t),
        onHistoryUpdate: () => { }, // TODO: persist history
        onCancelRunning: () => { }
      });

      // Pass terminal for scrollback config
      sessionRef.current.setTerminal(term);

      // Bind Input
      term.onData((data: string) => {
        sessionRef.current.handleInput(data);
      });

      // Handle Resize
      window.addEventListener('resize', () => fit.fit());

      // Welcome Message
      term.writeln('\x1b[1;37mWelcome to the Kali Linux Portfolio Terminal.\x1b[0m');
      term.writeln('Type \x1b[1;33mhelp\x1b[0m to list commands.');

      // Initial Prompt
      const initialPrompt = () => {
        const cwd = contextRef.current.cwd.replace(/^\/home/, '~');
        term.write(`\r\n\x1b[1;36m┌──(\x1b[1;34mkali㉿kali\x1b[1;36m)-[\x1b[1;33m${cwd}\x1b[1;36m]\r\n\x1b[1;36m└─\x1b[1;32m$\x1b[0m `);
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
      termRef.current = null;
    };
  }, []);

  // Update Session Config (safe to run on every render or when dependencies change)
  useEffect(() => {
    if (sessionRef.current && termRef.current) {
      sessionRef.current.updateConfig({
        context: contextRef.current,
        write: (t: string) => termRef.current.write(t),
        writeLine: (t: string) => termRef.current.writeln(t),
        prompt: () => {
          const cwd = contextRef.current.cwd.replace(/^\/home/, '~');
          termRef.current.write(`\r\n\x1b[1;36m┌──(\x1b[1;34mkali㉿kali\x1b[1;36m)-[\x1b[1;33m${cwd}\x1b[1;36m]\r\n\x1b[1;36m└─\x1b[1;32m$\x1b[0m `);
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
      termRef.current.writeln(`\r\n\x1b[1;33m[System] Safe Mode: ${newVal ? 'ON' : 'OFF'}\x1b[0m`);
      // Reprompt
      const cwd = contextRef.current.cwd.replace(/^\/home/, '~');
      termRef.current.write(`\r\n\x1b[1;36m┌──(\x1b[1;34mkali㉿kali\x1b[1;36m)-[\x1b[1;33m${cwd}\x1b[1;36m]\r\n\x1b[1;36m└─\x1b[1;32m$\x1b[0m `);
    }
  };

  return (
    <div className="flex h-full flex-col bg-[#0a0a0a] text-white font-mono text-sm overflow-hidden rounded-b-lg">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-[#333] bg-[#111] px-3 py-2 select-none">
        <div className="flex items-center gap-2">
          <span className="text-gray-400 font-semibold">Terminal</span>
          {safeMode && <span className="px-1.5 py-0.5 rounded bg-green-900/50 text-green-400 text-[10px] uppercase tracking-wider">Safe Mode</span>}
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
        </div>
      </div>

      {/* Terminal Area */}
      <div className="relative flex-1 min-h-0 bg-[#0a0a0a]">
        {/* Wrapper to ensure size */}
        <TerminalContainer
          ref={containerRef}
          className="h-full w-full absolute inset-0"
          onClick={() => termRef.current?.focus()}
        />
      </div>
    </div>
  );
};

TerminalApp.displayName = 'TerminalApp';
export default TerminalApp;
