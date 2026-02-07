"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  createContext,
  useContext,
} from 'react';
import clsx from 'clsx';
import HelpOverlay from './HelpOverlay';
import PerfOverlay from './Games/common/perf';
import usePrefersReducedMotion from '../../hooks/usePrefersReducedMotion';
import {
  serialize as serializeRng,
  deserialize as deserializeRng,
} from '../../apps/games/rng';
import { consumeGameKey, shouldHandleGameKey } from '../../utils/gameInput';

interface GameLayoutProps {
  gameId?: string;
  children: React.ReactNode;
  stage?: number;
  lives?: number;
  score?: number;
  highScore?: number;
  editor?: React.ReactNode;
  onPauseChange?: (paused: boolean) => void;
  onRestart?: () => void;
  pauseHotkeys?: string[];
  restartHotkeys?: string[];
  settingsPanel?: React.ReactNode;
  isFocused?: boolean;
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

const isTextInput = (target: EventTarget | null) => {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable;
};

const matchesHotkey = (e: KeyboardEvent, hotkeys: string[]) => {
  const key = e.key.toLowerCase();
  const code = e.code.toLowerCase();
  return hotkeys.some((hotkey) => {
    const match = hotkey.toLowerCase();
    return key === match || code === match;
  });
};

const GameLayout: React.FC<GameLayoutProps> = ({
  gameId = 'unknown',
  children,
  stage,
  lives,
  score,
  highScore,
  editor,
  onPauseChange,
  onRestart,
  pauseHotkeys,
  restartHotkeys,
  settingsPanel,
  isFocused = true,
}) => {
  const [showHelp, setShowHelp] = useState(false);
  const [paused, setPaused] = useState(false);
  const [log, setLog] = useState<RecordedInput[]>([]);
  const [replayHandler, setReplayHandler] = useState<
    ((input: any, index: number) => void) | undefined
  >(undefined);
  const [replaying, setReplaying] = useState(false);
  const [scorePulse, setScorePulse] = useState(false);
  const [highScorePulse, setHighScorePulse] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
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

  const tweetScore = useCallback(() => {
    if (highScore === undefined) return;
    const url = window.location.href;
    const text = `I scored ${highScore} in ${gameId}!`;
    const tweetUrl = new URL('https://twitter.com/intent/tweet');
    tweetUrl.searchParams.set('text', text);
    tweetUrl.searchParams.set('url', url);
    window.open(tweetUrl.toString(), '_blank', 'noopener,noreferrer');
  }, [highScore, gameId]);

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

  useEffect(() => {
    if (score === undefined || prefersReducedMotion) return;
    setScorePulse(true);
    const timeout = window.setTimeout(() => setScorePulse(false), 320);
    return () => window.clearTimeout(timeout);
  }, [score, prefersReducedMotion]);

  useEffect(() => {
    if (highScore === undefined || prefersReducedMotion) return;
    setHighScorePulse(true);
    const timeout = window.setTimeout(() => setHighScorePulse(false), 360);
    return () => window.clearTimeout(timeout);
  }, [highScore, prefersReducedMotion]);

  // Keyboard shortcut to toggle help overlay
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!shouldHandleGameKey(e, { isFocused })) return;
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;
      if (isInput) return;
      if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
        consumeGameKey(e);
        setShowHelp((h) => !h);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isFocused]);

  // Show tutorial overlay on first visit
  useEffect(() => {
    if (typeof jest !== 'undefined') return;
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
      if (!shouldHandleGameKey(e, { isFocused })) return;
      if (e.key === 'Escape') {
        consumeGameKey(e);
        setShowHelp(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showHelp, isFocused]);

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

  useEffect(() => {
    onPauseChange?.(paused);
  }, [onPauseChange, paused]);

  const handleRestart = useCallback(() => {
    setPaused(false);
    onRestart?.();
  }, [onRestart]);

  useEffect(() => {
    if (!pauseHotkeys && !restartHotkeys) return undefined;
    const pauseKeys = pauseHotkeys?.length ? pauseHotkeys : [];
    const restartKeys = restartHotkeys?.length ? restartHotkeys : [];
    const handler = (e: KeyboardEvent) => {
      if (!shouldHandleGameKey(e, { isFocused })) return;
      if (isTextInput(e.target)) return;
      if (pauseKeys.length && matchesHotkey(e, pauseKeys)) {
        consumeGameKey(e);
        setPaused((p) => !p);
        return;
      }
      if (restartKeys.length && matchesHotkey(e, restartKeys)) {
        consumeGameKey(e);
        handleRestart();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [pauseHotkeys, restartHotkeys, handleRestart, isFocused]);

  return (
    <RecorderContext.Provider value={contextValue}>
      <div
        className="relative flex h-full w-full min-h-0 flex-col"
        data-reduced-motion={prefersReducedMotion}
        data-game-viewport
      >
        {showHelp && <HelpOverlay gameId={gameId} onClose={close} />}
        {paused && (
          <div
            className="absolute inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center"
            role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            onClick={resume}
            className="px-4 py-2 bg-gray-700 text-white rounded focus:outline-none focus:ring"
            autoFocus
          >
            Resume
          </button>
        </div>
      )}
      <div className="absolute top-2 right-2 z-40 flex space-x-2">
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          className="px-2 py-1 bg-gray-700 text-white rounded focus:outline-none focus:ring"
        >
          {paused ? 'Resume' : 'Pause'}
        </button>
        {onRestart && (
          <button
            type="button"
            onClick={handleRestart}
            className="px-2 py-1 bg-gray-700 text-white rounded focus:outline-none focus:ring"
          >
            Restart
          </button>
        )}
        <button
          type="button"
          onClick={snapshot}
          className="px-2 py-1 bg-gray-700 text-white rounded focus:outline-none focus:ring"
        >
          Snapshot
        </button>
        <button
          type="button"
          onClick={replay}
          className="px-2 py-1 bg-gray-700 text-white rounded focus:outline-none focus:ring"
        >
          Replay
        </button>
        <button
          type="button"
          onClick={shareApp}
          className="px-2 py-1 bg-gray-700 text-white rounded focus:outline-none focus:ring"
        >
          Share
        </button>
        {settingsPanel && (
          <button
            type="button"
            aria-label="Settings"
            aria-expanded={showSettings}
            onClick={() => setShowSettings((s) => !s)}
            className="px-2 py-1 bg-gray-700 text-white rounded focus:outline-none focus:ring"
          >
            Settings
          </button>
        )}
        {highScore !== undefined && (
          <button
            type="button"
            onClick={shareScore}
            className="px-2 py-1 bg-gray-700 text-white rounded focus:outline-none focus:ring"
          >
            Share Score
          </button>
        )}
        {highScore !== undefined && (
          <button
            type="button"
            onClick={tweetScore}
            className="px-2 py-1 bg-gray-700 text-white rounded focus:outline-none focus:ring"
          >
            Tweet Score
          </button>
        )}
        <button
          type="button"
          aria-label="Help"
          aria-expanded={showHelp}
          onClick={toggle}
          className="bg-gray-700 text-white rounded-full w-8 h-8 flex items-center justify-center focus:outline-none focus:ring"
        >
          ?
        </button>
      </div>
      {children}
      {showSettings && settingsPanel && (
        <div className="absolute top-12 right-2 z-50 rounded border border-slate-700/80 bg-slate-900/95 p-3 shadow-xl max-w-xs w-[18rem]">
          {settingsPanel}
        </div>
      )}
      <div
        className="absolute top-2 left-2 z-10 text-sm flex flex-col gap-1"
        role="status"
        aria-live="polite"
      >
        {stage !== undefined && (
          <div className="rounded px-2 py-1 bg-slate-900/60 border border-slate-700/70 backdrop-blur">
            Stage: {stage}
          </div>
        )}
        {lives !== undefined && (
          <div className="rounded px-2 py-1 bg-slate-900/60 border border-slate-700/70 backdrop-blur">
            Lives: {lives}
          </div>
        )}
        {score !== undefined && (
          <div
            className={clsx(
              'rounded px-2 py-1 bg-slate-900/70 border border-emerald-500/20 backdrop-blur shadow-sm transition-transform duration-300 ease-out',
              !prefersReducedMotion && scorePulse &&
                'scale-110 text-emerald-300 shadow-[0_0_18px_rgba(16,185,129,0.45)]',
            )}
          >
            Score: {score}
          </div>
        )}
        {highScore !== undefined && (
          <div
            className={clsx(
              'rounded px-2 py-1 bg-slate-900/70 border border-indigo-400/20 backdrop-blur shadow-sm transition-transform duration-300 ease-out',
              !prefersReducedMotion && highScorePulse &&
                'scale-105 text-indigo-300 shadow-[0_0_16px_rgba(129,140,248,0.35)]',
            )}
          >
            High: {highScore}
          </div>
        )}
      </div>
      {!prefersReducedMotion && <PerfOverlay />}
      {editor && (
        <div className="absolute bottom-2 left-2 z-30">{editor}</div>
      )}
      </div>
    </RecorderContext.Provider>
  );
};

export default GameLayout;
