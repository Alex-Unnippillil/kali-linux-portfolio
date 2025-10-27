import React, { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { logEvent } from './analytics';

const APP_CATEGORY_OVERRIDES = {
  terminal: 'tools',
  weather: 'reference',
  'weather_widget': 'reference',
  'sticky_notes': 'tools',
  'subnet-calculator': 'tools',
  'resource-monitor': 'tools',
  'clipboard_manager': 'tools',
  'project-gallery': 'reference',
  'security-tools': 'reference',
  quote: 'reference',
  converter: 'tools',
  calculator: 'tools',
  'timer_stopwatch': 'tools',
  todoist: 'tools',
  qr: 'tools',
  http: 'tools',
  ssh: 'tools',
  'html-rewriter': 'tools',
  'input-lab': 'tools',
  'radare2': 'reference',
  metasploit: 'reference',
  'metasploit-post': 'reference',
  hydra: 'reference',
  hashcat: 'reference',
  mimikatz: 'reference',
  'mimikatz/offline': 'reference',
};

const TOOL_KEYWORDS = [
  'calc',
  'note',
  'tool',
  'monitor',
  'terminal',
  'builder',
  'widget',
  'manager',
  'resource',
  'qr',
  'timer',
  'http',
  'ssh',
  'clipboard',
  'input',
  'lab',
  'subnet',
  'weather',
  'resource',
];

const GAME_KEYWORDS = [
  'game',
  '2048',
  'snake',
  'tetris',
  'sudoku',
  'chess',
  'checkers',
  'hangman',
  'frogger',
  'flappy',
  'minesweeper',
  'pong',
  'pacman',
  'memory',
  'solitaire',
  'tower',
  'runner',
  'platformer',
  'pinball',
  'gomoku',
  'reversi',
  'battleship',
  'blackjack',
  'breakout',
  'candy',
  'word',
  'simon',
  'sokoban',
  'nonogram',
  'racer',
  'invader',
  'defense',
];

const REFERENCE_KEYWORDS = [
  'report',
  'gallery',
  'project',
  'security',
  'guide',
  'vault',
  'evidence',
  'catalog',
  'reference',
  'quote',
];

const OFFLINE_GUIDANCE_LIBRARY = {
  tools: {
    category: 'tools',
    heading: 'Continue your offline recon',
    description:
      'Cached simulators remain usable without a network connection, so you can keep working while waiting to reconnect.',
    actions: [
      'Re-run recent missions in the Terminal to keep muscle memory sharp.',
      'Capture ideas in Sticky Notes—everything will sync once you are back online.',
      'Prep upcoming tasks with the Subnet Calculator or HTTP Request Builder.',
    ],
  },
  games: {
    category: 'games',
    heading: 'Arcade mode unlocked',
    description:
      'Need a break while the connection is down? Cached games remain available for quick practice sessions.',
    actions: [
      'Challenge the AI in Checkers, Chess, or Gomoku.',
      'Speed-run puzzle staples such as 2048 or Tetris.',
      'Sharpen pattern recognition with Minesweeper or Snake.',
    ],
  },
  reference: {
    category: 'reference',
    heading: 'Review cached intelligence',
    description:
      'Knowledge-base modules are stored locally so you can study them offline and plan your next move.',
    actions: [
      'Browse the Security Tools catalog for lab inspiration.',
      'Open the Project Gallery to revisit recent case studies.',
      'Check the Quote widget for a burst of motivation.',
    ],
  },
  general: {
    category: 'general',
    heading: 'Working offline',
    description:
      'We will retry the load when your connection returns. In the meantime, everything already cached stays available.',
    actions: [
      'Keep this window open—we will reload automatically once you are back online.',
      'Open the desktop launcher to explore other cached apps.',
      'Select “Retry connection” after you reconnect to refresh immediately.',
    ],
  },
};

const normalizeAppId = (rawId) => {
  if (!rawId) return '';
  const trimmed = String(rawId).split(/[?#]/)[0];
  const cleaned = trimmed.replace(/^\/+|\/+$/g, '');
  const [root] = cleaned.split('/');
  return (root || cleaned).toLowerCase();
};

const categorizeAppId = (rawId) => {
  const normalized = normalizeAppId(rawId);
  if (!normalized) return 'general';
  if (APP_CATEGORY_OVERRIDES[normalized]) return APP_CATEGORY_OVERRIDES[normalized];
  if (GAME_KEYWORDS.some((keyword) => normalized.includes(keyword))) return 'games';
  if (TOOL_KEYWORDS.some((keyword) => normalized.includes(keyword))) return 'tools';
  if (REFERENCE_KEYWORDS.some((keyword) => normalized.includes(keyword))) return 'reference';
  return 'general';
};

export const offlineGuidanceFor = (appId) => {
  const category = categorizeAppId(appId);
  const config = OFFLINE_GUIDANCE_LIBRARY[category] || OFFLINE_GUIDANCE_LIBRARY.general;
  return { ...config, category };
};

const OfflineAwareFallback = ({ appId, title, state, errorMessage }) => {
  const [offline, setOffline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine === false : false,
  );

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const update = () => {
      setOffline(typeof navigator !== 'undefined' ? navigator.onLine === false : false);
    };
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  const guidance = useMemo(() => offlineGuidanceFor(appId), [appId]);

  const retry = () => {
    if (typeof window !== 'undefined' && typeof window.location?.reload === 'function') {
      window.location.reload();
    }
  };

  if (!offline) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey p-6 text-center text-white">
        <p className="text-lg font-semibold">
          {state === 'error' ? `Unable to load ${title}` : `Loading ${title}...`}
        </p>
        {state === 'error' && errorMessage ? (
          <p className="mt-2 max-w-md text-sm text-gray-200 opacity-80">{errorMessage}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="h-full w-full flex items-center justify-center bg-ub-cool-grey p-6 text-white">
      <div className="max-w-lg space-y-4 text-left">
        <p className="text-xs uppercase tracking-[0.3em] text-ubt-blue/80">Offline</p>
        <h2 className="text-2xl font-semibold leading-tight">{guidance.heading}</h2>
        <p className="text-sm text-gray-200">{guidance.description}</p>
        <ul className="list-disc space-y-2 pl-5 text-sm text-gray-100">
          {guidance.actions.map((action) => (
            <li key={action}>{action}</li>
          ))}
        </ul>
        <button
          type="button"
          onClick={retry}
          className="inline-flex rounded-full bg-ubt-blue px-4 py-2 text-sm font-semibold text-white transition hover:bg-ubt-blue/90 focus:outline-none focus:ring-2 focus:ring-white/70"
        >
          Retry connection
        </button>
      </div>
    </div>
  );
};

export const createDynamicApp = (id, title) =>
  dynamic(
    async () => {
      try {
        const mod = await import(
          /* webpackPrefetch: true */ `../components/apps/${id}`
        );
        logEvent({ category: 'Application', action: `Loaded ${title}` });
        return mod.default;
      } catch (err) {
        console.error(`Failed to load ${title}`, err);
        const offline = typeof navigator !== 'undefined' ? navigator.onLine === false : false;
        const message = offline
          ? ''
          : err instanceof Error
          ? err.message
          : typeof err === 'string'
          ? err
          : '';
        const OfflineErrorFallback = () => (
          <OfflineAwareFallback
            appId={id}
            title={title}
            state="error"
            errorMessage={message}
          />
        );
        OfflineErrorFallback.displayName = `OfflineFallback(${title})`;
        return OfflineErrorFallback;
      }
    },
    {
      ssr: false,
      loading: () => <OfflineAwareFallback appId={id} title={title} state="loading" />,
    }
  );

export const createDisplay = (Component) => {
  const DynamicComponent = dynamic(() => Promise.resolve({ default: Component }), {
    ssr: false,
  });
  const Display = (addFolder, openApp, context) => {
    const extraProps =
      context && typeof context === 'object' ? context : undefined;
    return (
      <DynamicComponent
        addFolder={addFolder}
        openApp={openApp}
        context={context}
        {...(extraProps || {})}
      />
    );
  };

  Display.prefetch = () => {
    if (typeof Component.preload === 'function') {
      Component.preload();
    }
  };

  return Display;
};

