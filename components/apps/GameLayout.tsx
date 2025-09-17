"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  createContext,
  useContext,
} from 'react';
import HelpOverlay from './HelpOverlay';
import PerfOverlay from './Games/common/perf';
import usePrefersReducedMotion from '../../hooks/usePrefersReducedMotion';
import {
  serialize as serializeRng,
  deserialize as deserializeRng,
} from '../../apps/games/rng';

interface GameLayoutProps {
  gameId?: string;
  children: React.ReactNode;
  stage?: number;
  lives?: number;
  score?: number;
  highScore?: number;
  editor?: React.ReactNode;
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

const GameLayout: React.FC<GameLayoutProps> = ({
  gameId = 'unknown',
  children,
  stage,
  lives,
  score,
  highScore,
  editor,
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

  return (
    <RecorderContext.Provider value={contextValue}>
      <div className="relative h-full w-full" data-reduced-motion={prefersReducedMotion}>
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
              className="px-4 py-2 bg-gray-700 text-white rounded focus-ring"
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
          className="px-2 py-1 bg-gray-700 text-white rounded focus-ring"
        >
          {paused ? 'Resume' : 'Pause'}
        </button>
        <button
          type="button"
          onClick={snapshot}
          className="px-2 py-1 bg-gray-700 text-white rounded focus-ring"
        >
          Snapshot
        </button>
        <button
          type="button"
          onClick={replay}
          className="px-2 py-1 bg-gray-700 text-white rounded focus-ring"
        >
          Replay
        </button>
        <button
          type="button"
          onClick={shareApp}
          className="px-2 py-1 bg-gray-700 text-white rounded focus-ring"
        >
          Share
        </button>
        {highScore !== undefined && (
          <button
            type="button"
            onClick={shareScore}
            className="px-2 py-1 bg-gray-700 text-white rounded focus-ring"
          >
            Share Score
          </button>
        )}
        <button
          type="button"
          aria-label="Help"
          aria-expanded={showHelp}
          onClick={toggle}
          className="bg-gray-700 text-white rounded-full w-8 h-8 flex items-center justify-center focus-ring"
        >
          ?
        </button>
      </div>
      {children}
      <div className="absolute top-2 left-2 z-10 text-sm space-y-1">
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
    </RecorderContext.Provider>
  );
};

export default GameLayout;
