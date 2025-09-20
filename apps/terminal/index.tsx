'use client';

import React, {
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
  useCallback,
} from 'react';
import { trackEvent } from '@/lib/analytics-client';
import useOPFS from '../../hooks/useOPFS';
import commandRegistry, { CommandContext } from './commands';
import TerminalContainer from './components/Terminal';

const CopyIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    width={24}
    height={24}
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <rect x={9} y={9} width={13} height={13} rx={2} ry={2} />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const PasteIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    width={24}
    height={24}
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M8 5H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
    <rect x={9} y={2} width={6} height={4} rx={1} />
  </svg>
);

const SettingsIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    width={24}
    height={24}
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <circle cx={12} cy={12} r={3} />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.06a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.06a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.06a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

export interface TerminalProps {
  openApp?: (id: string) => void;
}

const TRUST_STORAGE_KEY = 'terminal:trustedOriginsOnce';

interface PendingPaste {
  payload: string;
  lines: string[];
  lineCount: number;
  origin?: string;
  sourceLabel: string;
  trigger: 'paste' | 'toolbar' | 'keyboard';
}

interface LineModeProgress {
  current: number;
  total: number;
}

const normalizeText = (text: string) => text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

const trimTrailingBlankLines = (lines: string[]) => {
  const trimmed = [...lines];
  while (trimmed.length > 0 && trimmed[trimmed.length - 1].trim() === '') {
    trimmed.pop();
  }
  return trimmed;
};

const formatOriginLabel = (origin?: string, fallback = 'Clipboard') => {
  if (!origin) return fallback;
  try {
    const url = new URL(origin);
    return url.host || origin;
  } catch {
    return origin;
  }
};

const extractSourceOrigin = (html?: string | null): string | undefined => {
  if (!html) return undefined;
  const sourceMatch = html.match(/SourceURL:(.*)/i);
  if (sourceMatch?.[1]) {
    const rawUrl = sourceMatch[1].trim();
    if (rawUrl) {
      try {
        return new URL(rawUrl).origin;
      } catch {
        return rawUrl;
      }
    }
  }
  const httpMatch = html.match(/https?:\/\/[^\s"'>]+/i);
  if (httpMatch?.[0]) {
    const rawUrl = httpMatch[0];
    try {
      return new URL(rawUrl).origin;
    } catch {
      return rawUrl;
    }
  }
  if (typeof window !== 'undefined') {
    try {
      const parser = new DOMParser();
      const firstTag = html.indexOf('<');
      const markup = firstTag >= 0 ? html.slice(firstTag) : html;
      const doc = parser.parseFromString(markup, 'text/html');
      const candidate =
        doc.querySelector('base[href]')?.getAttribute('href') ||
        doc.querySelector('link[rel="canonical"]')?.getAttribute('href') ||
        doc.querySelector('meta[property="og:url" i]')?.getAttribute('content');
      if (candidate) {
        return new URL(candidate, window.location.href).origin;
      }
    } catch {
      // ignore parse failures
    }
  }
  return undefined;
};

export interface TerminalHandle {
  runCommand: (cmd: string) => void;
  getContent: () => string;
}

const files: Record<string, string> = {
  'README.md': 'Welcome to the web terminal.\nThis is a fake file used for demos.',
};

const TerminalApp = forwardRef<TerminalHandle, TerminalProps>(({ openApp }, ref) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const termRef = useRef<any>(null);
  const fitRef = useRef<any>(null);
  const searchRef = useRef<any>(null);
  const commandRef = useRef('');
  const contentRef = useRef('');
  const registryRef = useRef(commandRegistry);
  const workerRef = useRef<Worker | null>(null);
  const filesRef = useRef<Record<string, string>>(files);
  const aliasesRef = useRef<Record<string, string>>({});
  const historyRef = useRef<string[]>([]);
  const contextRef = useRef<CommandContext>({
    writeLine: () => {},
    files: filesRef.current,
    history: historyRef.current,
    aliases: aliasesRef.current,
    setAlias: (n, v) => {
      aliasesRef.current[n] = v;
    },
    runWorker: async () => {},
  });
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteInput, setPaletteInput] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pendingPaste, setPendingPaste] = useState<PendingPaste | null>(null);
  const [pendingTrustOnce, setPendingTrustOnce] = useState(false);
  const [lineModeProgress, setLineModeProgress] = useState<LineModeProgress | null>(null);
  const { supported: opfsSupported, getDir, readFile, writeFile, deleteFile } =
    useOPFS();
  const dirRef = useRef<FileSystemDirectoryHandle | null>(null);
  const [overflow, setOverflow] = useState({ top: false, bottom: false });
  const trustedOriginsRef = useRef<Set<string>>(new Set());
  const lineModeCancelRef = useRef(false);
  const persistTrustedOrigins = useCallback((origins: Set<string>) => {
    if (typeof window === 'undefined') return;
    try {
      sessionStorage.setItem(
        TRUST_STORAGE_KEY,
        JSON.stringify(Array.from(origins)),
      );
    } catch {
      // ignore storage errors
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = sessionStorage.getItem(TRUST_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          trustedOriginsRef.current = new Set(
            parsed.filter((item): item is string => typeof item === 'string'),
          );
        }
      }
    } catch {
      trustedOriginsRef.current = new Set();
    }
  }, []);

  const addTrustedOrigin = useCallback(
    (origin: string) => {
      if (!origin) return;
      const next = new Set(trustedOriginsRef.current);
      next.add(origin);
      trustedOriginsRef.current = next;
      persistTrustedOrigins(next);
    },
    [persistTrustedOrigins],
  );

  const consumeTrustedOrigin = useCallback(
    (origin?: string) => {
      if (!origin) return false;
      const next = new Set(trustedOriginsRef.current);
      if (!next.has(origin)) return false;
      next.delete(origin);
      trustedOriginsRef.current = next;
      persistTrustedOrigins(next);
      return true;
    },
    [persistTrustedOrigins],
  );
  const ansiColors = [
    '#000000',
    '#AA0000',
    '#00AA00',
    '#AA5500',
    '#0000AA',
    '#AA00AA',
    '#00AAAA',
    '#AAAAAA',
    '#555555',
    '#FF5555',
    '#55FF55',
    '#FFFF55',
    '#5555FF',
    '#FF55FF',
    '#55FFFF',
    '#FFFFFF',
  ];

  const updateOverflow = useCallback(() => {
    const term = termRef.current;
    if (!term || !term.buffer) return;
    const { viewportY, baseY } = term.buffer.active;
    setOverflow({ top: viewportY > 0, bottom: viewportY < baseY });
  }, []);

  const writeLine = useCallback(
    (text: string) => {
      if (termRef.current) termRef.current.writeln(text);
      contentRef.current += `${text}\n`;
      if (opfsSupported && dirRef.current) {
        writeFile('history.txt', contentRef.current, dirRef.current);
      }
      updateOverflow();
    },
    [opfsSupported, updateOverflow, writeFile],
  );

  contextRef.current.writeLine = writeLine;

  const prompt = useCallback(() => {
    if (!termRef.current) return;
    termRef.current.writeln(
      '\x1b[1;34m┌──(\x1b[0m\x1b[1;36mkali\x1b[0m\x1b[1;34m㉿\x1b[0m\x1b[1;36mkali\x1b[0m\x1b[1;34m)-[\x1b[0m\x1b[1;32m~\x1b[0m\x1b[1;34m]\x1b[0m',
    );
    termRef.current.write('\x1b[1;34m└─\x1b[0m$ ');
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(contentRef.current).catch(() => {});
  };

  const runWorker = useCallback(
    async (command: string) => {
      const worker = workerRef.current;
      if (!worker) {
        writeLine('Worker not available');
        return;
      }
      await new Promise<void>((resolve) => {
        worker.onmessage = ({ data }: MessageEvent<any>) => {
          if (data.type === 'data') {
            for (const line of String(data.chunk).split('\n')) {
              if (line) writeLine(line);
            }
          } else if (data.type === 'end') {
            resolve();
          }
        };
        worker.postMessage({
          action: 'run',
          command,
          files: filesRef.current,
        });
      });
    },
    [writeLine],
  );

  contextRef.current.runWorker = runWorker;

  useEffect(() => {
    registryRef.current = {
      ...commandRegistry,
      help: () => {
        writeLine(
          `Available commands: ${Object.keys(registryRef.current).join(', ')}`,
        );
        writeLine(
          'Example scripts: https://github.com/unnippillil/kali-linux-portfolio/tree/main/scripts/examples',
        );
      },
      ls: () => writeLine(Object.keys(filesRef.current).join('  ')),
      clear: () => {
        termRef.current?.clear();
        contentRef.current = '';
        if (opfsSupported && dirRef.current) {
          deleteFile('history.txt', dirRef.current);
        }
        setOverflow({ top: false, bottom: false });
      },
      open: (arg) => {
        if (!arg) {
          writeLine('Usage: open <app>');
        } else {
          openApp?.(arg.trim());
          writeLine(`Opening ${arg}`);
        }
      },
      date: () => writeLine(new Date().toString()),
      about: () => writeLine('This terminal is powered by xterm.js'),
    };
    }, [openApp, opfsSupported, deleteFile, writeLine]);

  useEffect(() => {
    if (typeof Worker === 'function') {
      workerRef.current = new Worker(
        new URL('../../workers/terminal-worker.ts', import.meta.url),
      );
    }
    return () => workerRef.current?.terminate();
  }, []);

    const runCommand = useCallback(
      async (cmd: string) => {
        const [name, ...rest] = cmd.trim().split(/\s+/);
        const expanded =
          aliasesRef.current[name]
            ? `${aliasesRef.current[name]} ${rest.join(' ')}`.trim()
            : cmd;
        const [cmdName, ...cmdRest] = expanded.split(/\s+/);
        const handler = registryRef.current[cmdName];
        historyRef.current.push(cmd);
        if (handler) await handler(cmdRest.join(' '), contextRef.current);
        else if (cmdName) await runWorker(expanded);
      },
      [runWorker],
    );

    const autocomplete = useCallback(() => {
      const current = commandRef.current;
      const registry = registryRef.current;
      const matches = Object.keys(registry).filter((c) => c.startsWith(current));
      if (matches.length === 1) {
        const completion = matches[0].slice(current.length);
        termRef.current?.write(completion);
        commandRef.current = matches[0];
      } else if (matches.length > 1) {
        writeLine(matches.join('  '));
        prompt();
        termRef.current?.write(commandRef.current);
      }
    }, [prompt, writeLine]);

    const handleInput = useCallback(
      (data: string) => {
        for (const ch of data) {
          if (ch === '\r' || ch === '\n') {
            termRef.current?.writeln('');
            runCommand(commandRef.current.trim());
            commandRef.current = '';
            prompt();
          } else if (ch === '\u007F') {
            if (commandRef.current.length > 0) {
              termRef.current?.write('\b \b');
              commandRef.current = commandRef.current.slice(0, -1);
            }
          } else {
            commandRef.current += ch;
            termRef.current?.write(ch);
          }
        }
      },
      [runCommand, prompt],
    );

    const clearPending = useCallback(() => {
      setPendingPaste(null);
      setPendingTrustOnce(false);
      setLineModeProgress(null);
      termRef.current?.focus();
    }, []);

    const stageInput = useCallback(
      (
        rawData: string,
        meta: { origin?: string; sourceLabel?: string; trigger: 'keyboard' | 'paste' | 'toolbar' },
      ) => {
        if (!rawData) return;
        const normalized = normalizeText(rawData);
        const rawLines = normalized.split('\n');
        const lines = trimTrailingBlankLines(rawLines);
        const lineCount = lines.length;
        const payloadBase = lines.join('\r');
        const payload =
          payloadBase.length > 0
            ? `${payloadBase}${normalized.endsWith('\n') ? '\r' : ''}`
            : normalized.endsWith('\n')
            ? '\r'
            : '';
        if (lineCount <= 1) {
          handleInput(payload);
          return;
        }
        const originKey = meta.origin;
        trackEvent('terminal_paste_detected', {
          origin: originKey ?? 'unknown',
          lines: lineCount,
          mechanism: meta.trigger,
        });
        if (consumeTrustedOrigin(originKey)) {
          trackEvent('terminal_paste_bypassed', {
            origin: originKey ?? 'unknown',
            lines: lineCount,
            via: 'trusted_once',
          });
          handleInput(payload);
          return;
        }
        setPendingTrustOnce(false);
        setPendingPaste({
          payload,
          lines,
          lineCount,
          origin: originKey,
          sourceLabel: meta.sourceLabel || originKey || 'Clipboard',
          trigger: meta.trigger,
        });
      },
      [consumeTrustedOrigin, handleInput],
    );

    const executeLineByLine = useCallback(
      async (pending: PendingPaste) => {
        lineModeCancelRef.current = false;
        const total = pending.lines.length;
        if (total === 0) {
          clearPending();
          return;
        }
        for (let i = 0; i < total; i += 1) {
          if (lineModeCancelRef.current) break;
          setLineModeProgress({ current: i, total });
          const line = pending.lines[i];
          if (line) {
            handleInput(`${line}\r`);
          } else {
            handleInput('\r');
          }
          await new Promise<void>((resolve) => setTimeout(resolve, 120));
        }
        const wasCancelled = lineModeCancelRef.current;
        lineModeCancelRef.current = false;
        setLineModeProgress(null);
        if (!wasCancelled) {
          clearPending();
        }
      },
      [clearPending, handleInput],
    );

    const confirmPaste = useCallback(
      (mode: 'all' | 'line', via: 'button' | 'chord') => {
        if (!pendingPaste) return;
        const { payload, lines, lineCount, origin } = pendingPaste;
        if (pendingTrustOnce && origin) {
          addTrustedOrigin(origin);
        }
        if (mode === 'all') {
          trackEvent('terminal_paste_confirmed', {
            origin: origin ?? 'unknown',
            lines: lineCount,
            mode: 'all',
            via,
          });
          clearPending();
          handleInput(payload);
        } else {
          trackEvent('terminal_paste_confirmed', {
            origin: origin ?? 'unknown',
            lines: lineCount,
            mode: 'line',
            via,
          });
          void executeLineByLine(pendingPaste);
        }
      },
      [pendingPaste, pendingTrustOnce, addTrustedOrigin, clearPending, handleInput, executeLineByLine],
    );

    const handleCancelPaste = useCallback(() => {
      if (!pendingPaste) return;
      if (lineModeProgress) {
        lineModeCancelRef.current = true;
      }
      trackEvent('terminal_paste_cancelled', {
        origin: pendingPaste.origin ?? 'unknown',
        lines: pendingPaste.lineCount,
        mode: lineModeProgress ? 'line' : 'all',
      });
      clearPending();
    }, [pendingPaste, lineModeProgress, clearPending]);

    const handlePaste = useCallback(async () => {
      try {
        let html: string | undefined;
        let text = '';
        const advancedClipboard = navigator.clipboard as Clipboard & {
          read?: () => Promise<ClipboardItem[]>;
        };
        if (typeof advancedClipboard.read === 'function') {
          const items = await advancedClipboard.read();
          for (const item of items) {
            if (!text && item.types.includes('text/plain')) {
              const blob = await item.getType('text/plain');
              text = await blob.text();
            }
            if (!html && item.types.includes('text/html')) {
              const blob = await item.getType('text/html');
              html = await blob.text();
            }
          }
        }
        if (!text) {
          text = await navigator.clipboard.readText();
        }
        if (!text) return;
        const origin = extractSourceOrigin(html);
        stageInput(text, {
          origin,
          sourceLabel: origin || 'Clipboard',
          trigger: 'toolbar',
        });
      } catch {
        try {
          const fallback = await navigator.clipboard.readText();
          if (fallback) {
            stageInput(fallback, {
              trigger: 'toolbar',
              sourceLabel: 'Clipboard',
            });
          }
        } catch {
          // ignore clipboard errors
        }
      }
    }, [stageInput]);

  useImperativeHandle(ref, () => ({
    runCommand: (c: string) => runCommand(c),
    getContent: () => contentRef.current,
  }));

  useEffect(() => {
    let disposed = false;
    let cleanupTextarea: HTMLTextAreaElement | null = null;
    let cleanupPaste: ((event: ClipboardEvent) => void) | null = null;
    (async () => {
      const [{ Terminal: XTerm }, { FitAddon }, { SearchAddon }] = await Promise.all([
        import('@xterm/xterm'),
        import('@xterm/addon-fit'),
        import('@xterm/addon-search'),
      ]);
      await import('@xterm/xterm/css/xterm.css');
      if (disposed) return;
      const term = new XTerm({
        cursorBlink: true,
        scrollback: 1000,
        cols: 80,
        rows: 24,
        fontFamily: '"Fira Code", monospace',
        theme: {
          background: '#0f1317',
          foreground: '#f5f5f5',
          cursor: '#1793d1',
        },
      });
      const fit = new FitAddon();
      const search = new SearchAddon();
      termRef.current = term;
      fitRef.current = fit;
      searchRef.current = search;
      term.loadAddon(fit);
      term.loadAddon(search);
      term.open(containerRef.current!);
      fit.fit();
      term.focus();
      if (opfsSupported) {
        dirRef.current = await getDir('terminal');
        const existing = await readFile('history.txt', dirRef.current || undefined);
        if (existing) {
          existing
            .split('\n')
            .filter(Boolean)
            .forEach((l) => {
              if (termRef.current) termRef.current.writeln(l);
            });
          contentRef.current = existing.endsWith('\n')
            ? existing
            : `${existing}\n`;
        }
      }
      writeLine('Welcome to the web terminal!');
      writeLine('Type "help" to see available commands.');
      prompt();
      term.onData((d: string) => stageInput(d, { trigger: 'keyboard' }));
      const textarea =
        (term.textarea ||
          (term.element?.querySelector('textarea') as HTMLTextAreaElement | null)) ?? null;
      const handleDomPaste = (event: ClipboardEvent) => {
        if (!event.clipboardData) return;
        const text =
          event.clipboardData.getData('text/plain') ||
          event.clipboardData.getData('text');
        if (!text) return;
        event.preventDefault();
        const origin = extractSourceOrigin(event.clipboardData.getData('text/html'));
        stageInput(text, {
          origin,
          sourceLabel: origin || 'Clipboard',
          trigger: 'paste',
        });
      };
      textarea?.addEventListener('paste', handleDomPaste);
      cleanupTextarea = textarea;
      cleanupPaste = handleDomPaste;
      term.onKey(({ domEvent }: any) => {
        if (domEvent.key === 'Tab') {
          domEvent.preventDefault();
          autocomplete();
        } else if (domEvent.ctrlKey && domEvent.key === 'f') {
          domEvent.preventDefault();
          const q = window.prompt('Search');
          if (q) searchRef.current?.findNext(q);
        } else if (domEvent.ctrlKey && domEvent.key === 'r') {
          domEvent.preventDefault();
          const q = window.prompt('Search history');
          if (q) {
            const match = [...historyRef.current]
              .reverse()
              .find((c) => c.includes(q));
            if (match && termRef.current) {
              termRef.current.write('\u001b[2K\r');
              prompt();
              termRef.current.write(match);
              commandRef.current = match;
            } else {
              writeLine(`No match: ${q}`);
              prompt();
            }
          }
        }
      });
      updateOverflow();
      term.onScroll?.(updateOverflow);
    })();
    return () => {
      disposed = true;
      if (cleanupTextarea && cleanupPaste) {
        cleanupTextarea.removeEventListener('paste', cleanupPaste);
      }
      termRef.current?.dispose();
    };
    }, [
      opfsSupported,
      getDir,
      readFile,
      writeLine,
      prompt,
      stageInput,
      autocomplete,
      updateOverflow,
    ]);

  useEffect(() => {
    const handleResize = () => fitRef.current?.fit();
    let observer: ResizeObserver | undefined;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(handleResize);
      if (containerRef.current) observer.observe(containerRef.current);
    }
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      observer?.disconnect();
    };
  }, []);

  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setPaletteOpen((v) => {
          const next = !v;
          if (next) termRef.current?.blur();
          else termRef.current?.focus();
          return next;
        });
      }
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [paletteOpen]);

  useEffect(() => {
    if (!pendingPaste) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        handleCancelPaste();
      } else if (event.ctrlKey && event.shiftKey && event.key === 'Enter') {
        event.preventDefault();
        confirmPaste('all', 'chord');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [pendingPaste, handleCancelPaste, confirmPaste]);

  const originLabel = pendingPaste
    ? formatOriginLabel(pendingPaste.origin, pendingPaste.sourceLabel)
    : '';
  const previewLines = pendingPaste ? pendingPaste.lines.slice(0, 20) : [];
  const totalPreviewLines = pendingPaste ? pendingPaste.lines.length : 0;
  const lineDigits = totalPreviewLines ? Math.max(2, String(totalPreviewLines).length) : 2;
  const remainingPreviewLines = Math.max(totalPreviewLines - previewLines.length, 0);

  return (
    <div className="relative h-full w-full">
      {pendingPaste && (
        <div className="absolute inset-0 z-20 flex items-start justify-center bg-black/70 p-4">
          <div className="mt-10 w-full max-w-3xl rounded-lg border border-blue-500 bg-gray-900 text-white shadow-xl">
            <div className="border-b border-blue-500/50 p-4">
              <h2 className="text-lg font-semibold">Multi-line paste detected</h2>
              <p className="mt-1 text-sm text-blue-200">
                {pendingPaste.lineCount} line{pendingPaste.lineCount === 1 ? '' : 's'} from {originLabel}.
                Review before running.
              </p>
            </div>
            <div className="max-h-64 overflow-y-auto border-b border-blue-500/40 bg-black/40 p-4 font-mono text-sm">
              {previewLines.map((line, idx) => (
                <div
                  key={idx}
                  className={`flex gap-3 ${
                    lineModeProgress?.current === idx ? 'bg-blue-900/40' : ''
                  }`}
                >
                  <span className="w-12 shrink-0 text-right text-blue-300">
                    {String(idx + 1).padStart(lineDigits, ' ')}
                  </span>
                  <span className="whitespace-pre-wrap break-words text-gray-100">
                    {line.length > 0 ? line : <span className="text-gray-500">[blank]</span>}
                  </span>
                </div>
              ))}
              {remainingPreviewLines > 0 && (
                <div className="mt-2 text-xs text-blue-200">
                  +{remainingPreviewLines} more line{remainingPreviewLines === 1 ? '' : 's'} not shown
                </div>
              )}
            </div>
            {lineModeProgress && (
              <div className="border-b border-blue-500/40 bg-blue-900/20 px-4 py-2 text-sm text-blue-200">
                Running line {lineModeProgress.current + 1} of {lineModeProgress.total}
              </div>
            )}
            <div className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-col gap-2 text-sm">
                <div className="text-blue-100">
                  Press{' '}
                  <kbd className="rounded bg-blue-800 px-1 py-0.5 text-xs">Ctrl</kbd>
                  +
                  <kbd className="rounded bg-blue-800 px-1 py-0.5 text-xs">Shift</kbd>
                  +
                  <kbd className="rounded bg-blue-800 px-1 py-0.5 text-xs">Enter</kbd>{' '}
                  to run everything.
                </div>
                {pendingPaste.origin ? (
                  <label className="inline-flex items-center gap-2 text-blue-100">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-blue-400 bg-gray-800"
                      checked={pendingTrustOnce}
                      onChange={(event) => setPendingTrustOnce(event.target.checked)}
                      disabled={Boolean(lineModeProgress)}
                    />
                    <span>Trust {originLabel} for the next paste only</span>
                  </label>
                ) : (
                  <span className="text-xs text-blue-200">
                    Origin unknown — trust toggle unavailable for this paste.
                  </span>
                )}
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  className="rounded bg-gray-700 px-3 py-2 text-sm"
                  onClick={handleCancelPaste}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="rounded bg-blue-700 px-3 py-2 text-sm disabled:opacity-60"
                  onClick={() => confirmPaste('line', 'button')}
                  disabled={Boolean(lineModeProgress)}
                >
                  Run line by line
                </button>
                <button
                  type="button"
                  className="rounded bg-green-600 px-3 py-2 text-sm disabled:opacity-60"
                  onClick={() => confirmPaste('all', 'button')}
                  disabled={Boolean(lineModeProgress)}
                >
                  Run all lines
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {paletteOpen && (
        <div className="absolute inset-0 bg-black bg-opacity-75 flex items-start justify-center z-10">
          <div className="mt-10 w-80 bg-gray-800 p-4 rounded">
            <input
              autoFocus
              className="w-full mb-2 bg-black text-white p-2"
              value={paletteInput}
              onChange={(e) => setPaletteInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  runCommand(paletteInput);
                  setPaletteInput('');
                  setPaletteOpen(false);
                  termRef.current?.focus();
                } else if (e.key === 'Escape') {
                  setPaletteOpen(false);
                  termRef.current?.focus();
                }
              }}
            />
            <ul className="max-h-40 overflow-y-auto">
              {Object.keys(registryRef.current)
                .filter((c) => c.startsWith(paletteInput))
                .map((c) => (
                  <li key={c} className="text-white">
                    {c}
                  </li>
                ))}
            </ul>
          </div>
        </div>
      )}
      {settingsOpen && (
        <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center z-10">
          <div className="bg-gray-900 p-4 rounded space-y-4">
            <div className="grid grid-cols-8 gap-2">
              {ansiColors.map((c, i) => (
                <div key={i} className="h-4 w-4 rounded" style={{ backgroundColor: c }} />
              ))}
            </div>
            <pre className="text-sm leading-snug">
              <span className="text-blue-400">bin</span>{' '}
              <span className="text-green-400">script.sh</span>{' '}
              <span className="text-gray-300">README.md</span>
            </pre>
            <div className="flex justify-end gap-2">
              <button
                className="px-2 py-1 bg-gray-700 rounded"
                onClick={() => {
                  setSettingsOpen(false);
                  termRef.current?.focus();
                }}
              >
                Cancel
              </button>
              <button
                className="px-2 py-1 bg-blue-600 rounded"
                onClick={() => {
                  setSettingsOpen(false);
                  termRef.current?.focus();
                }}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-2 bg-gray-800 p-1">
          <button onClick={handleCopy} aria-label="Copy">
            <CopyIcon />
          </button>
          <button onClick={handlePaste} aria-label="Paste">
            <PasteIcon />
          </button>
          <button onClick={() => setSettingsOpen(true)} aria-label="Settings">
            <SettingsIcon />
          </button>
        </div>
        <div className="relative">
          <TerminalContainer
            ref={containerRef}
            className="resize overflow-hidden font-mono"
            style={{
              width: '80ch',
              height: '24em',
              fontSize: 'clamp(1rem, 0.6vw + 1rem, 1.1rem)',
              lineHeight: 1.4,
            }}
          />
          {overflow.top && (
            <div className="pointer-events-none absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-black" />
          )}
          {overflow.bottom && (
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-black" />
          )}
        </div>
      </div>
    </div>
  );
});

TerminalApp.displayName = 'TerminalApp';

export default TerminalApp;
