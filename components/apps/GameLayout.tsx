"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  createContext,
  useContext,
  useMemo,
} from 'react';
import HelpOverlay from './HelpOverlay';
import PerfOverlay from './Games/common/perf';
import usePrefersReducedMotion from '../../hooks/usePrefersReducedMotion';
import {
  serialize as serializeRng,
  deserialize as deserializeRng,
} from '../../apps/games/rng';
import AppTitleBar, {
  AppBreadcrumb,
  AppTitleBarAction,
} from '../ui/AppTitleBar';

interface GameLayoutProps {
  gameId?: string;
  children: React.ReactNode;
  stage?: number;
  lives?: number;
  score?: number;
  highScore?: number;
  editor?: React.ReactNode;
  title?: string;
  breadcrumbs?: AppBreadcrumb[];
  onBack?: () => void;
  contextLabel?: string;
}

interface RecordedInput {
  t: number;
  input: any;
  rng: string;
}

interface RecorderContextValue {
  record: (input: any) => void;
  registerReplay: (fn: (input: any, index: number) => void) => void;
}

const RecorderContext = createContext<RecorderContextValue>({
  record: () => {},
  registerReplay: () => {},
});

export const useInputRecorder = () => useContext(RecorderContext);

const formatTitle = (value: string) =>
  value
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase());

const GameLayout: React.FC<GameLayoutProps> = ({
  gameId = 'unknown',
  children,
  stage,
  lives,
  score,
  highScore,
  editor,
  title,
  breadcrumbs,
  onBack,
  contextLabel,
}) => {
  const [showHelp, setShowHelp] = useState(false);
  const [paused, setPaused] = useState(false);
  const [log, setLog] = useState<RecordedInput[]>([]);
  const [replayHandler, setReplayHandler] = useState<
    ((input: any, index: number) => void) | undefined
  >(undefined);
  const [replaying, setReplaying] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();

  const close = useCallback(() => setShowHelp(false), []);
  const toggle = useCallback(() => setShowHelp((h) => !h), []);

  const fallbackCopy = useCallback((text: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {
        /* ignore clipboard errors */
      });
    }
  }, []);

  const shareApp = useCallback(() => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ url }).catch(() => {
        fallbackCopy(url);
      });
    } else {
      fallbackCopy(url);
    }
  }, [fallbackCopy]);

  const shareScore = useCallback(() => {
    if (highScore === undefined) return;
    const url = window.location.href;
    const text = `I scored ${highScore} in ${gameId}!`;
    if (navigator.share) {
      navigator
        .share({ text, url })
        .catch(() => fallbackCopy(`${text} ${url}`));
    } else {
      fallbackCopy(`${text} ${url}`);
    }
  }, [fallbackCopy, highScore, gameId]);

  const record = useCallback(
    (input: any) => {
      if (replaying) return;
      setLog((l) => [...l, { t: Date.now(), input, rng: serializeRng() }]);
    },
    [replaying],
  );

  const registerReplay = useCallback(
    (fn: (input: any, index: number) => void) => {
      setReplayHandler(() => fn);
    },
    [],
  );

  const snapshot = useCallback(() => {
    const data = JSON.stringify(log, null, 2);
    try {
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${gameId}-inputs.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      /* ignore download errors */
    }
    console.log(data);
  }, [log, gameId]);

  const replay = useCallback(() => {
    if (!replayHandler || log.length === 0) return;
    setReplaying(true);
    let i = 0;
    const step = () => {
      if (i >= log.length) {
        setReplaying(false);
        return;
      }
      const ev = log[i];
      deserializeRng(ev.rng);
      replayHandler(ev.input, i);
      i += 1;
      setTimeout(step, 100);
    };
    step();
  }, [log, replayHandler]);

  // Keyboard shortcut to toggle help overlay
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;
      if (isInput) return;
      if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
        e.preventDefault();
        setShowHelp((h) => !h);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Show tutorial overlay on first visit
  useEffect(() => {
    try {
      const key = `seen_tutorial_${gameId}`;
      if (typeof window !== 'undefined' && !window.localStorage.getItem(key)) {
        setShowHelp(true);
        window.localStorage.setItem(key, '1');
      }
    } catch {
      // ignore storage errors
    }
  }, [gameId]);

  // Allow closing overlay with Escape
  useEffect(() => {
    if (!showHelp) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowHelp(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showHelp]);

  // Auto-pause when page becomes hidden or window loses focus
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        setPaused(true);
      }
    };
    const handleBlur = () => setPaused(true);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('blur', handleBlur);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  const resume = useCallback(() => setPaused(false), []);

  const contextValue = { record, registerReplay };

  const displayTitle = useMemo(
    () => title ?? formatTitle(gameId),
    [gameId, title],
  );

  const actions: AppTitleBarAction[] = useMemo(() => {
    const base: AppTitleBarAction[] = [
      {
        id: 'pause',
        label: paused ? 'Resume' : 'Pause',
        onSelect: () => setPaused((p) => !p),
        ariaLabel: paused ? 'Resume gameplay' : 'Pause gameplay',
      },
      {
        id: 'snapshot',
        label: 'Snapshot',
        onSelect: snapshot,
        ariaLabel: 'Download a snapshot of recent inputs',
      },
      {
        id: 'replay',
        label: 'Replay',
        onSelect: replay,
        ariaLabel: 'Replay your last recorded inputs',
      },
      {
        id: 'share',
        label: 'Share',
        onSelect: shareApp,
        ariaLabel: 'Share this game',
      },
    ];

    if (highScore !== undefined) {
      base.push({
        id: 'share-score',
        label: 'Share score',
        onSelect: shareScore,
        ariaLabel: 'Share your high score',
      });
    }

    base.push({
      id: 'help',
      label: showHelp ? 'Hide help' : 'Help',
      onSelect: toggle,
      ariaLabel: showHelp ? 'Close help overlay' : 'Open help overlay',
      pressed: showHelp,
      ariaExpanded: showHelp,
    });

    return base;
  }, [
    highScore,
    paused,
    replay,
    shareApp,
    shareScore,
    showHelp,
    snapshot,
    toggle,
  ]);

  const effectiveContextLabel =
    contextLabel ?? `Currently playing ${displayTitle}`;

  return (
    <RecorderContext.Provider value={contextValue}>
      <div
        className="flex h-full w-full flex-col"
        data-reduced-motion={prefersReducedMotion}
      >
        <AppTitleBar
          title={displayTitle}
          breadcrumbs={breadcrumbs}
          onBack={onBack}
          contextLabel={effectiveContextLabel}
          actions={actions}
          actionsLabel="Game actions"
        />
        <div className="relative flex-1">
          {showHelp && <HelpOverlay gameId={gameId} onClose={close} />}
          {paused && (
            <div
              className="absolute inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75"
              role="dialog"
              aria-modal="true"
            >
              <button
                type="button"
                onClick={resume}
                className="rounded bg-gray-700 px-4 py-2 text-white focus:outline-none focus:ring"
                autoFocus
              >
                Resume
              </button>
            </div>
          )}
          {children}
          <div className="absolute top-2 left-2 z-10 space-y-1 text-sm">
            {stage !== undefined && <div>Stage: {stage}</div>}
            {lives !== undefined && <div>Lives: {lives}</div>}
            {score !== undefined && <div>Score: {score}</div>}
            {highScore !== undefined && <div>High: {highScore}</div>}
          </div>
          {!prefersReducedMotion && <PerfOverlay />}
          {editor && (
            <div className="absolute bottom-2 left-2 z-30">{editor}</div>
          )}
        </div>
      </div>
    </RecorderContext.Provider>
  );
};

export default GameLayout;
