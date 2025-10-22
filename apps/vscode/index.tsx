'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactEventHandler,
  type ReactNode,
} from 'react';
import ExternalFrame from '../../components/ExternalFrame';
import { CloseIcon, MaximizeIcon, MinimizeIcon } from '../../components/ToolbarIcons';
import { kaliTheme } from '../../styles/themes/kali';
import { ICON_SIZE, SIDEBAR_WIDTH } from './utils';

const STACKBLITZ_ORIGIN = 'https://stackblitz.com';
const STACKBLITZ_EMBED_URL =
  'https://stackblitz.com/github/Alex-Unnippillil/kali-linux-portfolio?embed=1&file=README.md';
export const STACKBLITZ_HANDSHAKE_TIMEOUT_MS = 12000;

const READY_KEYWORDS = ['ready', 'frame-ready', 'workspace-ready'];
const DENIED_KEYWORDS = ['denied', 'blocked', 'forbidden'];

const ACTIVITY_BAR_WIDTH = SIDEBAR_WIDTH * 2.5;
const ACTIVITY_ICON_SIZE = ICON_SIZE + 16;

const THEME_TOKENS = {
  dark: {
    accent: '#38bdf8',
    activity: '#020617',
    background: '#0b1120',
    status: '#0f172a',
    text: '#f8fafc',
  },
  light: {
    accent: '#2563eb',
    activity: '#eef2ff',
    background: '#f8fafc',
    status: '#e2e8f0',
    text: '#0f172a',
  },
} as const;

type ThemeId = keyof typeof THEME_TOKENS;

type CSSVarStyle = CSSProperties & {
  '--vscode-shell-accent': string;
  '--vscode-shell-background': string;
  '--vscode-shell-status': string;
};

type TabBadgeTone = 'info' | 'attention';

type TabConfig = {
  id: string;
  label: string;
  badge?: {
    label: string;
    tone: TabBadgeTone;
  };
};

const EDITOR_TABS: TabConfig[] = [
  { id: 'readme', label: 'README.md', badge: { label: '1', tone: 'info' } },
  { id: 'source', label: 'apps/vscode/index.tsx', badge: { label: 'M', tone: 'attention' } },
  { id: 'package', label: 'package.json' },
];

type CommandAction = 'open-readme' | 'open-source' | 'open-package' | 'open-repo' | 'toggle-theme';

type CommandDefinition = {
  id: string;
  label: string;
  description?: string;
  action: CommandAction;
};

const COMMAND_DEFINITIONS: CommandDefinition[] = [
  {
    id: 'readme',
    label: 'Reveal README.md',
    description: 'Focus the project documentation preview',
    action: 'open-readme',
  },
  {
    id: 'source',
    label: 'Reveal apps/vscode/index.tsx',
    description: 'Jump to the VS Code shell source',
    action: 'open-source',
  },
  {
    id: 'package',
    label: 'Reveal package.json',
    description: 'Inspect dependencies inside StackBlitz',
    action: 'open-package',
  },
  {
    id: 'repo',
    label: 'Open repository on GitHub',
    description: 'Launch Alex-Unnippillil/kali-linux-portfolio in a new tab',
    action: 'open-repo',
  },
  {
    id: 'toggle-theme',
    label: 'Toggle light/dark theme',
    description: 'Synchronise accent colour with the embed background',
    action: 'toggle-theme',
  },
];

type ActivityBarItem = {
  id: string;
  label: string;
  icon: ReactNode;
};

const ACTIVITY_BAR_ITEMS: ActivityBarItem[] = [
  {
    id: 'explorer',
    label: 'Explorer',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M3 9h18" />
      </svg>
    ),
  },
  {
    id: 'search',
    label: 'Search',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
        <circle cx="11" cy="11" r="6" />
        <line x1="20" y1="20" x2="16.65" y2="16.65" />
      </svg>
    ),
  },
  {
    id: 'git',
    label: 'Source Control',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M6 3v12" />
        <circle cx="6" cy="18" r="2" />
        <circle cx="18" cy="6" r="2" />
        <path d="M6 9l8.5 4.5" />
      </svg>
    ),
  },
  {
    id: 'run',
    label: 'Run and Debug',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
        <polygon points="9 5 19 12 9 19 9 5" />
        <line x1="5" y1="5" x2="5" y2="19" />
      </svg>
    ),
  },
  {
    id: 'extensions',
    label: 'Extensions',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M14 3h5a2 2 0 0 1 2 2v5" />
        <path d="M10 21H5a2 2 0 0 1-2-2v-5" />
        <path d="M21 14l-7 7-4-4-6 6" />
        <path d="M3 10l7-7 4 4 6-6" />
      </svg>
    ),
  },
];

type EmbedStatus = 'loading' | 'ready' | 'error' | 'timeout';

type StackBlitzPayload = {
  type?: string;
  status?: string;
  reason?: string;
};

function normalizePayload(data: unknown): StackBlitzPayload {
  if (typeof data === 'string') {
    try {
      return normalizePayload(JSON.parse(data));
    } catch {
      return { type: data };
    }
  }

  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>;
    const keys = ['type', 'event', 'action', 'cmd', 'kind'];
    for (const key of keys) {
      const value = record[key];
      if (typeof value === 'string') {
        return {
          type: value,
          status: typeof record.status === 'string' ? record.status : undefined,
          reason:
            typeof record.reason === 'string'
              ? record.reason
              : typeof record.error === 'string'
                ? record.error
                : typeof record.message === 'string'
                  ? record.message
                  : undefined,
        };
      }
    }

    return {
      status: typeof record.status === 'string' ? record.status : undefined,
      reason:
        typeof record.reason === 'string'
          ? record.reason
          : typeof record.error === 'string'
            ? record.error
            : typeof record.message === 'string'
              ? record.message
              : undefined,
    };
  }

  return {};
}

const getStatusMessage = (status: EmbedStatus, errorMessage: string | null): string => {
  switch (status) {
    case 'ready':
      return '';
    case 'error':
      return errorMessage ?? 'StackBlitz denied the embed request.';
    case 'timeout':
      return 'StackBlitz is taking longer than expected. You can open the project in a new tab.';
    default:
      return 'Connecting to the StackBlitz workspace…';
  }
};

export default function VsCode() {
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const [status, setStatus] = useState<EmbedStatus>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const statusRef = useRef<EmbedStatus>('loading');
  const [theme, setTheme] = useState<ThemeId>('dark');
  const [activeTab, setActiveTab] = useState<string>(EDITOR_TABS[0].id);
  const [activeActivityItem, setActiveActivityItem] = useState<string>(
    ACTIVITY_BAR_ITEMS[0]?.id ?? 'explorer',
  );
  const [isCommandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState('');
  const commandInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const media = window.matchMedia('(prefers-color-scheme: light)');
    setTheme(media.matches ? 'light' : 'dark');

    return undefined;
  }, []);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const handleMessage = (event: MessageEvent) => {
      if (!event.origin.startsWith(STACKBLITZ_ORIGIN)) {
        return;
      }

      const targetWindow = frameRef.current?.contentWindow;
      if (targetWindow && event.source && event.source !== targetWindow) {
        return;
      }

      const payload = normalizePayload(event.data);
      const type = payload.type?.toLowerCase();
      const payloadStatus = payload.status?.toLowerCase();

      if (type) {
        if (READY_KEYWORDS.some((keyword) => type.includes(keyword))) {
          setStatus('ready');
          setErrorMessage(null);
          return;
        }

        if (
          statusRef.current !== 'ready' &&
          (DENIED_KEYWORDS.some((keyword) => type.includes(keyword)) || type.includes('error'))
        ) {
          setStatus('error');
          setErrorMessage(payload.reason ?? 'StackBlitz denied the embed request.');
          return;
        }
      }

      if (payloadStatus) {
        if (READY_KEYWORDS.some((keyword) => payloadStatus.includes(keyword))) {
          setStatus('ready');
          setErrorMessage(null);
          return;
        }

        if (
          statusRef.current !== 'ready' &&
          DENIED_KEYWORDS.some((keyword) => payloadStatus.includes(keyword))
        ) {
          setStatus('error');
          setErrorMessage(payload.reason ?? 'StackBlitz denied the embed request.');
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    if (status !== 'loading') {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setStatus((current) => (current === 'ready' ? current : 'timeout'));
    }, STACKBLITZ_HANDSHAKE_TIMEOUT_MS);

    return () => window.clearTimeout(timeoutId);
  }, [status]);

  const themeTokens = THEME_TOKENS[theme];

  const shellStyle = useMemo(() => {
    return {
      '--vscode-shell-accent': themeTokens.accent,
      '--vscode-shell-background': themeTokens.background,
      '--vscode-shell-status': themeTokens.status,
      backgroundColor: themeTokens.background ?? kaliTheme.background,
      color: themeTokens.text ?? kaliTheme.text,
    } as CSSVarStyle;
  }, [themeTokens]);

  const commandResults = useMemo(() => {
    const normalized = commandQuery.trim().toLowerCase();
    if (!normalized) {
      return COMMAND_DEFINITIONS;
    }

    return COMMAND_DEFINITIONS.filter((command) => {
      const label = command.label.toLowerCase();
      const description = command.description?.toLowerCase() ?? '';
      return label.includes(normalized) || description.includes(normalized);
    });
  }, [commandQuery]);

  const sendThemeToEmbed = useCallback(() => {
    const targetWindow = frameRef.current?.contentWindow;
    if (!targetWindow) {
      return;
    }

    try {
      targetWindow.postMessage(
        {
          type: 'kali.vscode-theme',
          payload: {
            theme,
            accentColor: themeTokens.accent,
            background: themeTokens.background,
          },
        },
        STACKBLITZ_ORIGIN,
      );
    } catch {
      // Silently ignore errors from browsers that block the postMessage call.
    }
  }, [theme, themeTokens.accent, themeTokens.background]);

  useEffect(() => {
    if (status !== 'ready') {
      return;
    }
    sendThemeToEmbed();
  }, [status, sendThemeToEmbed]);

  useEffect(() => {
    if (!isCommandPaletteOpen) {
      setCommandQuery('');
      return;
    }

    const timer = window.setTimeout(() => {
      commandInputRef.current?.focus();
    }, 50);

    return () => window.clearTimeout(timer);
  }, [isCommandPaletteOpen]);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if ((event.metaKey || event.ctrlKey) && event.shiftKey && key === 'p') {
        event.preventDefault();
        setCommandPaletteOpen((visible) => !visible);
      }
    };

    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, []);

  useEffect(() => {
    if (!isCommandPaletteOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setCommandPaletteOpen(false);
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isCommandPaletteOpen]);

  const handleCommandSelect = (command: CommandDefinition) => {
    switch (command.action) {
      case 'open-readme':
        setActiveTab('readme');
        break;
      case 'open-source':
        setActiveTab('source');
        break;
      case 'open-package':
        setActiveTab('package');
        break;
      case 'open-repo':
        if (typeof window !== 'undefined') {
          window.open(
            'https://github.com/Alex-Unnippillil/kali-linux-portfolio',
            '_blank',
            'noopener,noreferrer',
          );
        }
        break;
      case 'toggle-theme':
        setTheme((current) => (current === 'dark' ? 'light' : 'dark'));
        break;
      default:
        break;
    }

    setCommandPaletteOpen(false);
  };

  const showOverlay = status !== 'ready';
  const statusMessage = getStatusMessage(status, errorMessage);

  const handleFrameError: ReactEventHandler<HTMLIFrameElement> = () => {
    if (statusRef.current === 'ready') {
      return;
    }
    setStatus('error');
    setErrorMessage('Unable to reach StackBlitz from this browser.');
  };

  return (
    <div
      className="relative flex h-full w-full flex-1 overflow-hidden border border-[color:var(--kali-panel-border)] bg-[color:var(--kali-panel)] text-[color:var(--color-text)]"
      style={shellStyle}
    >
      <aside
        className="hidden h-full flex-col justify-between border-r border-[color:var(--kali-panel-border)] bg-[color:var(--kali-panel)] px-2 py-6 lg:flex"
        style={{ width: ACTIVITY_BAR_WIDTH }}
      >
        <div className="flex flex-col items-center gap-2">
          {ACTIVITY_BAR_ITEMS.map((item) => {
            const isActive = item.id === activeActivityItem;
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={isActive}
                aria-label={item.label}
                onClick={() => setActiveActivityItem(item.id)}
                className={`relative flex items-center justify-center rounded-xl transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--vscode-shell-accent)] ${
                  isActive
                    ? 'bg-[var(--vscode-shell-accent)] text-[color:var(--kali-panel)] shadow-inner shadow-black/30'
                    : 'text-[color:var(--color-text)]/70 hover:text-[color:var(--color-text)]'
                }`}
                style={{ width: ACTIVITY_ICON_SIZE, height: ACTIVITY_ICON_SIZE }}
              >
                <motion.span
                  aria-hidden="true"
                  animate={{ scale: isActive ? 1.05 : 1 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 30 }}
                  className="flex items-center justify-center"
                >
                  {item.icon}
                </motion.span>
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => setCommandPaletteOpen(true)}
          className="flex items-center justify-center rounded-xl border border-transparent bg-[color:var(--kali-panel-highlight)] p-2 text-[color:var(--color-text)]/70 transition hover:border-[var(--vscode-shell-accent)] hover:text-[color:var(--color-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--vscode-shell-accent)]"
          aria-label="Open command palette"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M4 7h16" />
            <path d="M4 12h16" />
            <path d="M4 17h10" />
          </svg>
        </button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[color:var(--kali-panel-border)] bg-[color:var(--kali-panel)] px-4 py-3">
          <div className="flex items-center gap-3 text-xs font-semibold tracking-widest uppercase text-[color:var(--color-text)]/70">
            <div className="flex items-center gap-1">
              <span className="h-3 w-3 rounded-full bg-red-500/80" />
              <span className="h-3 w-3 rounded-full bg-yellow-400/80" />
              <span className="h-3 w-3 rounded-full bg-green-500/80" />
            </div>
            <span className="text-sm font-semibold normal-case tracking-tight text-[color:var(--color-text)]">
              Visual Studio Code
            </span>
          </div>
          <div className="flex flex-1 items-center justify-end gap-3">
            <div className="flex items-center gap-1 rounded-md border border-[color:var(--kali-panel-border)] bg-[color:var(--kali-panel-highlight)] p-1">
              {(Object.keys(THEME_TOKENS) as ThemeId[]).map((mode) => {
                const isActive = theme === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setTheme(mode)}
                    aria-pressed={isActive}
                    className={`rounded px-2 py-1 text-xs font-semibold capitalize transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--vscode-shell-accent)] ${
                      isActive
                        ? 'bg-[var(--vscode-shell-accent)] text-[color:var(--kali-panel)] shadow-sm'
                        : 'text-[color:var(--color-text)]/80 hover:text-[color:var(--color-text)]'
                    }`}
                  >
                    {mode}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCommandPaletteOpen(true)}
                aria-haspopup="dialog"
                aria-expanded={isCommandPaletteOpen}
                className="flex items-center gap-2 rounded-md border border-[color:var(--kali-panel-border)] bg-[color:var(--kali-panel-highlight)] px-3 py-2 text-xs font-medium text-[color:var(--color-text)] transition hover:border-[var(--vscode-shell-accent)] hover:text-[color:var(--color-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--vscode-shell-accent)]"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M5 8h14" />
                  <path d="M5 12h10" />
                  <path d="M5 16h6" />
                </svg>
                <span className="hidden sm:inline">Command Palette</span>
                <kbd className="hidden rounded bg-[color:var(--kali-panel-border)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider sm:inline-block">
                  Ctrl ⇧ P
                </kbd>
              </button>
              <div className="flex items-center gap-2 rounded-md border border-[color:var(--kali-panel-border)] bg-[color:var(--kali-panel-highlight)] px-2 py-1 text-[color:var(--color-text)]">
                <button aria-label="Minimize" type="button">
                  <MinimizeIcon />
                </button>
                <button aria-label="Maximize" type="button">
                  <MaximizeIcon />
                </button>
                <button aria-label="Close" type="button">
                  <CloseIcon />
                </button>
              </div>
            </div>
          </div>
        </header>

        <nav className="flex items-end gap-1 border-b border-[color:var(--kali-panel-border)] bg-[color:var(--kali-panel-highlight)] px-3 py-2">
          {EDITOR_TABS.map((tab) => {
            const isActive = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-2 rounded-t-md px-3 py-2 text-xs font-medium tracking-tight transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--vscode-shell-accent)] ${
                  isActive
                    ? 'text-[color:var(--color-text)]'
                    : 'text-[color:var(--color-text)]/70 hover:text-[color:var(--color-text)]'
                }`}
              >
                {isActive && (
                  <motion.span
                    layoutId="active-tab-indicator"
                    className="absolute inset-0 rounded-t-md border border-b-0 border-[color:var(--kali-panel-border)] bg-[color:var(--kali-panel)] shadow-[inset_0_-1px_0_var(--kali-panel-border)]"
                    transition={{ type: 'spring', stiffness: 360, damping: 30 }}
                    aria-hidden="true"
                  />
                )}
                <span className="relative z-10 whitespace-nowrap">{tab.label}</span>
                {tab.badge && (
                  <motion.span
                    initial={false}
                    animate={{
                      backgroundColor:
                        tab.badge.tone === 'attention'
                          ? 'var(--vscode-shell-accent)'
                          : 'var(--kali-panel-border)',
                      color:
                        tab.badge.tone === 'attention'
                          ? themeTokens.activity
                          : 'var(--color-text)',
                      scale: isActive ? 1 : 0.9,
                      opacity: 1,
                    }}
                    transition={{ type: 'spring', stiffness: 380, damping: 26 }}
                    className="relative z-10 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                  >
                    {tab.badge.label}
                  </motion.span>
                )}
              </button>
            );
          })}
          <span className="ml-auto text-[11px] uppercase tracking-wide text-[color:var(--color-text)]/60">
            Spaces: 2
          </span>
        </nav>

        <div className="relative flex-1" style={{ backgroundColor: 'var(--vscode-shell-background)' }}>
          <ExternalFrame
            ref={frameRef}
            src={STACKBLITZ_EMBED_URL}
            title="VsCode"
            className="h-full w-full border-0"
            style={{ backgroundColor: themeTokens.background }}
            onError={handleFrameError}
            prefetch
          />
          {showOverlay && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-5 bg-[color:var(--color-overlay-strong)] bg-opacity-80 px-6 text-center">
              <motion.span
                aria-hidden="true"
                className="h-5 w-5 rounded-full bg-[var(--vscode-shell-accent)]"
                animate={{ scale: [1, 1.25, 1] }}
                transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
              />
              <div
                className="flex flex-col items-center gap-3 text-[color:var(--color-text)]"
                role={status === 'error' || status === 'timeout' ? 'alert' : 'status'}
                aria-live="polite"
              >
                <span className="text-sm md:text-base">{statusMessage}</span>
                {(status === 'error' || status === 'timeout') && (
                  <a
                    href={STACKBLITZ_EMBED_URL.replace('embed=1&', '')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-md border border-[color:var(--kali-panel-border)] bg-[color:var(--kali-panel-highlight)] px-3 py-2 text-sm font-semibold text-[color:var(--color-text)] transition hover:border-[var(--vscode-shell-accent)] hover:text-[color:var(--color-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--vscode-shell-accent)]"
                  >
                    Open in StackBlitz
                  </a>
                )}
              </div>
            </div>
          )}

          <AnimatePresence>
            {isCommandPaletteOpen && (
              <motion.div
                key="command-palette"
                className="absolute inset-0 z-30 flex items-start justify-center bg-black/60 px-4 py-12 backdrop-blur"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <motion.div
                  className="w-full max-w-xl rounded-lg border border-[color:var(--kali-panel-border)] bg-[color:var(--kali-panel)] shadow-2xl"
                  role="dialog"
                  aria-modal="true"
                  aria-label="VS Code command palette"
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -20, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 360, damping: 30 }}
                >
                  <div className="border-b border-[color:var(--kali-panel-border)]">
                    <input
                      ref={commandInputRef}
                      type="text"
                      value={commandQuery}
                      onChange={(event) => setCommandQuery(event.target.value)}
                      placeholder="Type a command or search…"
                      aria-label="Command palette search"
                      className="w-full bg-transparent px-4 py-3 text-sm text-[color:var(--color-text)] focus:outline-none"
                    />
                  </div>
                  <ul className="max-h-72 overflow-y-auto" role="listbox">
                    {commandResults.map((command) => (
                      <li key={command.id}>
                        <button
                          type="button"
                          onClick={() => handleCommandSelect(command)}
                          className="flex w-full flex-col items-start gap-1 border-b border-[color:var(--kali-panel-border)] px-4 py-3 text-left text-sm text-[color:var(--color-text)] transition hover:bg-[color:var(--kali-panel-highlight)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--vscode-shell-accent)]"
                          role="option"
                          aria-selected="false"
                        >
                          <span className="font-medium">{command.label}</span>
                          {command.description && (
                            <span className="text-xs text-[color:var(--color-text)]/70">{command.description}</span>
                          )}
                        </button>
                      </li>
                    ))}
                    {commandResults.length === 0 && (
                      <li
                        className="px-4 py-6 text-center text-sm text-[color:var(--color-text)]/60"
                        role="option"
                        aria-selected="false"
                      >
                        No matching commands
                      </li>
                    )}
                  </ul>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <footer className="flex flex-wrap items-center gap-3 border-t border-[color:var(--kali-panel-border)] bg-[var(--vscode-shell-status)] px-3 py-2 text-[color:var(--color-text)]/80">
          <span className="flex items-center gap-2 text-xs font-semibold">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                status === 'ready'
                  ? 'bg-emerald-400'
                  : status === 'error'
                    ? 'bg-red-500'
                    : 'bg-amber-400 animate-pulse'
              }`}
              aria-hidden="true"
            />
            {status === 'ready'
              ? 'Connected to StackBlitz'
              : status === 'error'
                ? 'Embed connection blocked'
                : 'Waiting for workspace handshake'}
          </span>
          <span className="text-xs uppercase tracking-wide">Theme: {theme}</span>
          <span className="hidden text-xs sm:inline">Active tab: {activeTab}</span>
          <div className="ml-auto flex flex-wrap items-center gap-4 text-xs">
            <span>Ln 42, Col 2</span>
            <span>UTF-8</span>
            <span>LF</span>
          </div>
        </footer>
      </div>
    </div>
  );
}

