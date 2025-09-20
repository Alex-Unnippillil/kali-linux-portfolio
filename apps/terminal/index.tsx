'use client';

import React, {
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
  useCallback,
  useMemo,
} from 'react';
import type { ITheme } from '@xterm/xterm';
import SettingsPanel from '../../components/apps/terminal/SettingsPanel';
import {
  DEFAULT_TERMINAL_PRESET_ID,
  terminalColorPresets,
  type TerminalColorPreset,
  type TerminalColorVariant,
  type TerminalPresetId,
  type TerminalThemeVariant,
} from '../../data/terminal/colors';
import {
  assertAccessibleAnsiRamp,
} from '../../utils/color/ansiContrast';
import { isDarkTheme } from '../../utils/theme';
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

export interface TerminalHandle {
  runCommand: (cmd: string) => void;
  getContent: () => string;
}

const files: Record<string, string> = {
  'README.md': 'Welcome to the web terminal.\nThis is a fake file used for demos.',
};

const CUSTOM_PRESET_ID = 'custom' as const;
const TERMINAL_PALETTE_STORAGE_KEY = 'terminal:palette';

type PaletteId = TerminalPresetId | typeof CUSTOM_PRESET_ID;

interface TerminalPaletteExport {
  presetId?: string;
  custom?: {
    name?: string;
    description?: string;
    dark: TerminalColorVariant;
    light: TerminalColorVariant;
  };
  name?: string;
  description?: string;
  dark?: TerminalColorVariant;
  light?: TerminalColorVariant;
}

type VariantInput = Partial<TerminalColorVariant> & { palette?: unknown };

const sanitizeVariant = (
  variant: VariantInput | undefined,
  label: string,
): TerminalColorVariant => {
  if (!variant || typeof variant !== 'object') {
    throw new Error(`${label} is missing a color definition.`);
  }

  const { palette, background, foreground, cursor, selectionBackground } = variant;

  if (!Array.isArray(palette)) {
    throw new Error(`${label} must include a palette array.`);
  }

  if (palette.length !== 16) {
    throw new Error(`${label} palette must include 16 colors.`);
  }

  const colors = palette.map((color, index) => {
    if (typeof color !== 'string') {
      throw new Error(`${label} color ${index} must be a string.`);
    }
    return color;
  });

  if (typeof background !== 'string') {
    throw new Error(`${label} must include a background color.`);
  }

  if (typeof foreground !== 'string') {
    throw new Error(`${label} must include a foreground color.`);
  }

  if (typeof cursor !== 'string') {
    throw new Error(`${label} must include a cursor color.`);
  }

  if (typeof selectionBackground !== 'string') {
    throw new Error(`${label} must include a selectionBackground value.`);
  }

  assertAccessibleAnsiRamp(colors, background, { label, minContrast: 4.5 });

  return {
    palette: colors,
    background,
    foreground,
    cursor,
    selectionBackground,
  };
};

const buildCustomPreset = (
  input: TerminalPaletteExport['custom'] | TerminalColorPreset | undefined,
  fallbackName: string,
): TerminalColorPreset => {
  if (!input || typeof input !== 'object') {
    throw new Error('Custom palette definition is missing.');
  }

  const baseName =
    'name' in input && typeof input.name === 'string' && input.name.trim().length > 0
      ? input.name.trim()
      : fallbackName;

  const description =
    'description' in input && typeof input.description === 'string' && input.description.trim().length > 0
      ? input.description.trim()
      : 'Imported terminal color preset.';

  const darkVariant = 'dark' in input ? (input as any).dark : undefined;
  const lightVariant = 'light' in input ? (input as any).light : undefined;

  const dark = sanitizeVariant(darkVariant, `${baseName} (dark)`);
  const light = sanitizeVariant(lightVariant, `${baseName} (light)`);

  return {
    id: CUSTOM_PRESET_ID,
    name: baseName,
    description,
    dark,
    light,
  };
};

const detectThemeVariant = (): TerminalThemeVariant => {
  if (typeof document === 'undefined') return 'dark';
  const root = document.documentElement;
  if (root.classList.contains('dark')) return 'dark';
  const theme = root.dataset.theme;
  if (!theme || theme === 'default') return 'dark';
  return isDarkTheme(theme) ? 'dark' : 'light';
};

const toXtermTheme = (variant: TerminalColorVariant): ITheme => ({
  background: variant.background,
  foreground: variant.foreground,
  cursor: variant.cursor,
  cursorAccent: variant.foreground,
  selectionBackground: variant.selectionBackground,
  black: variant.palette[0],
  red: variant.palette[1],
  green: variant.palette[2],
  yellow: variant.palette[3],
  blue: variant.palette[4],
  magenta: variant.palette[5],
  cyan: variant.palette[6],
  white: variant.palette[7],
  brightBlack: variant.palette[8],
  brightRed: variant.palette[9],
  brightGreen: variant.palette[10],
  brightYellow: variant.palette[11],
  brightBlue: variant.palette[12],
  brightMagenta: variant.palette[13],
  brightCyan: variant.palette[14],
  brightWhite: variant.palette[15],
});

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
  const { supported: opfsSupported, getDir, readFile, writeFile, deleteFile } =
    useOPFS();
  const dirRef = useRef<FileSystemDirectoryHandle | null>(null);
  const [overflow, setOverflow] = useState({ top: false, bottom: false });
  const [paletteId, setPaletteId] = useState<PaletteId>(DEFAULT_TERMINAL_PRESET_ID);
  const [customPreset, setCustomPreset] = useState<TerminalColorPreset | null>(null);
  const [themeVariant, setThemeVariant] = useState<TerminalThemeVariant>(() =>
    typeof window === 'undefined' ? 'dark' : detectThemeVariant(),
  );
  const activePreset = useMemo<TerminalColorPreset>(() => {
    if (paletteId === CUSTOM_PRESET_ID && customPreset) {
      return customPreset;
    }
    const builtIn = terminalColorPresets.find((preset) => preset.id === paletteId);
    return builtIn ?? terminalColorPresets[0];
  }, [paletteId, customPreset]);
  const paletteVariant = useMemo<TerminalColorVariant>(
    () => activePreset[themeVariant],
    [activePreset, themeVariant],
  );
  const paletteVariantRef = useRef<TerminalColorVariant>(paletteVariant);

  useEffect(() => {
    paletteVariantRef.current = paletteVariant;
  }, [paletteVariant]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = window.localStorage.getItem(TERMINAL_PALETTE_STORAGE_KEY);
      if (!stored) return;
      const parsed: TerminalPaletteExport = JSON.parse(stored);
      if (!parsed || typeof parsed !== 'object') return;

      let nextCustom: TerminalColorPreset | null = null;
      try {
        if (parsed.custom || (parsed.dark && parsed.light)) {
          nextCustom = buildCustomPreset(
            parsed.custom ?? (parsed as TerminalColorPreset),
            'Saved palette',
          );
          setCustomPreset(nextCustom);
        }
      } catch (error) {
        console.warn('Ignoring stored terminal palette override', error);
      }

      if (typeof parsed.presetId === 'string') {
        if (parsed.presetId === CUSTOM_PRESET_ID && nextCustom) {
          setPaletteId(CUSTOM_PRESET_ID);
          return;
        }
        const builtIn = terminalColorPresets.find((preset) => preset.id === parsed.presetId);
        if (builtIn) {
          setPaletteId(builtIn.id);
          return;
        }
      }

      if (nextCustom) {
        setPaletteId(CUSTOM_PRESET_ID);
      }
    } catch (error) {
      console.warn('Failed to load terminal palette preference', error);
    }
  }, []);

  useEffect(() => {
    if (paletteId === CUSTOM_PRESET_ID && !customPreset) {
      setPaletteId(DEFAULT_TERMINAL_PRESET_ID);
    }
  }, [paletteId, customPreset]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const updateThemeVariant = () => setThemeVariant(detectThemeVariant());
    updateThemeVariant();
    const observer = new MutationObserver(updateThemeVariant);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme'],
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const payload: TerminalPaletteExport =
        paletteId === CUSTOM_PRESET_ID && customPreset
          ? {
              presetId: CUSTOM_PRESET_ID,
              custom: {
                name: customPreset.name,
                description: customPreset.description,
                dark: customPreset.dark,
                light: customPreset.light,
              },
            }
          : {
              presetId: paletteId,
              ...(customPreset
                ? {
                    custom: {
                      name: customPreset.name,
                      description: customPreset.description,
                      dark: customPreset.dark,
                      light: customPreset.light,
                    },
                  }
                : {}),
            };
      window.localStorage.setItem(
        TERMINAL_PALETTE_STORAGE_KEY,
        JSON.stringify(payload),
      );
    } catch (error) {
      console.warn('Failed to persist terminal palette preference', error);
    }
  }, [paletteId, customPreset]);

  const exportPalette = useCallback((): string => {
    const payload: TerminalPaletteExport =
      paletteId === CUSTOM_PRESET_ID && customPreset
        ? {
            presetId: CUSTOM_PRESET_ID,
            custom: {
              name: customPreset.name,
              description: customPreset.description,
              dark: customPreset.dark,
              light: customPreset.light,
            },
          }
        : { presetId: activePreset.id };
    return JSON.stringify(payload, null, 2);
  }, [activePreset, paletteId, customPreset]);

  const importPalette = useCallback(async (input: string): Promise<string> => {
    const trimmed = input.trim();
    if (!trimmed) {
      throw new Error('Paste preset JSON before importing.');
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch (error) {
      throw new Error('Preset JSON could not be parsed.');
    }

    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Preset payload must be an object.');
    }

    const payload = parsed as TerminalPaletteExport;

    if (payload.custom || (payload.dark && payload.light)) {
      const custom = buildCustomPreset(
        payload.custom ?? (payload as TerminalColorPreset),
        'Imported palette',
      );
      setCustomPreset(custom);
      setPaletteId(CUSTOM_PRESET_ID);
      return `Imported custom palette "${custom.name}".`;
    }

    if (payload.presetId && typeof payload.presetId === 'string') {
      const preset = terminalColorPresets.find((item) => item.id === payload.presetId);
      if (!preset) {
        throw new Error(`Unknown preset id "${payload.presetId}".`);
      }
      setPaletteId(preset.id as PaletteId);
      return `Loaded preset "${preset.name}".`;
    }

    throw new Error('Preset JSON must include a presetId or custom palette definition.');
  }, [setCustomPreset, setPaletteId]);

  const removeCustomPalette = useCallback(() => {
    setCustomPreset(null);
    if (paletteId === CUSTOM_PRESET_ID) {
      setPaletteId(DEFAULT_TERMINAL_PRESET_ID);
    }
  }, [paletteId]);

  useEffect(() => {
    if (!termRef.current) return;
    termRef.current.options.theme = toXtermTheme(paletteVariant);
  }, [paletteVariant]);

  useEffect(() => {
    const term = termRef.current;
    if (!term) return;
    if (settingsOpen) {
      term.blur?.();
    } else if (!paletteOpen) {
      term.focus?.();
    }
  }, [settingsOpen, paletteOpen]);

  const handleSelectPreset = useCallback(
    (id: string) => {
      if (id === CUSTOM_PRESET_ID) {
        if (customPreset) {
          setPaletteId(CUSTOM_PRESET_ID);
        }
        return;
      }
      setPaletteId(id as PaletteId);
    },
    [customPreset],
  );

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

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      handleInput(text);
    } catch {}
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
          if (ch === '\r') {
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

  useImperativeHandle(ref, () => ({
    runCommand: (c: string) => runCommand(c),
    getContent: () => contentRef.current,
  }));

  useEffect(() => {
    let disposed = false;
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
        theme: toXtermTheme(paletteVariantRef.current),
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
      term.onData((d: string) => handleInput(d));
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
      termRef.current?.dispose();
    };
    }, [opfsSupported, getDir, readFile, writeLine, prompt, handleInput, autocomplete, updateOverflow]);

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

  return (
    <div className="relative h-full w-full">
      {paletteOpen && (
        <div className="absolute inset-0 bg-black bg-opacity-75 flex items-start justify-center z-10">
          <div className="mt-10 w-80 bg-gray-800 p-4 rounded">
            <input
              autoFocus
              className="w-full mb-2 bg-black text-white p-2"
              value={paletteInput}
              aria-label="Command palette"
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
      <SettingsPanel
        open={settingsOpen}
        presets={terminalColorPresets}
        customPreset={customPreset}
        activePresetId={paletteId}
        activePreset={activePreset}
        activeVariant={themeVariant}
        onClose={() => setSettingsOpen(false)}
        onSelectPreset={handleSelectPreset}
        onExportPreset={exportPalette}
        onImportPreset={importPalette}
        onRemoveCustom={customPreset ? removeCustomPalette : undefined}
      />
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
