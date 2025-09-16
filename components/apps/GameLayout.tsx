"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  createContext,
  useContext,
  useMemo,
} from 'react';
import HelpOverlay, { GAME_INSTRUCTIONS } from './HelpOverlay';
import PerfOverlay from './Games/common/perf';
import usePrefersReducedMotion from '../../hooks/usePrefersReducedMotion';
import {
  serialize as serializeRng,
  deserialize as deserializeRng,
} from '../../apps/games/rng';
import useInputMapping from './Games/common/input-remap/useInputMapping';

interface GameLayoutProps {
  gameId?: string;
  children: React.ReactNode;
  stage?: number;
  lives?: number;
  score?: number;
  highScore?: number;
  editor?: React.ReactNode;
  onRestart?: () => void;
}

type OverlayView = 'help' | 'pause';

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
  onRestart,
}) => {
  const [overlayView, setOverlayView] = useState<OverlayView | null>(null);
  const [paused, setPaused] = useState(false);
  const [log, setLog] = useState<RecordedInput[]>([]);
  const [replayHandler, setReplayHandler] = useState<
    ((input: any, index: number) => void) | undefined
  >(undefined);
  const [replaying, setReplaying] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();
  const instructions = GAME_INSTRUCTIONS[gameId];
  const defaultActions = instructions?.actions ?? {};
  const [mapping, setKey] = useInputMapping(gameId, defaultActions);

  const formatKeyLabel = useCallback((key: string) => {
    if (!key) return '';
    if (key === ' ') return 'Space';
    if (key === 'ArrowUp') return 'Arrow Up';
    if (key === 'ArrowDown') return 'Arrow Down';
    if (key === 'ArrowLeft') return 'Arrow Left';
    if (key === 'ArrowRight') return 'Arrow Right';
    return key.length === 1 ? key.toUpperCase() : key;
  }, []);

  const actionLegend = useMemo(() => {
    if (!instructions?.actions) return null;
    return Object.keys(instructions.actions).map((action) => ({
      action,
      key: formatKeyLabel(mapping?.[action] ?? instructions.actions[action]),
    }));
  }, [instructions, mapping, formatKeyLabel]);

  const overlayLegend = useMemo(
    () => [
      {
        label: 'Shift + / (?)',
        description: 'Cycle help and pause overlay',
      },
      {
        label: 'P',
        description: 'Pause or resume game',
      },
      {
        label: 'Esc',
        description: 'Close overlay',
      },
    ],
    [],
  );

  const cycleOverlay = useCallback(() => {
    setOverlayView((view) => {
      if (view === 'help') {
        setPaused(true);
        return 'pause';
      }
      if (view === 'pause') {
        setPaused(false);
        return null;
      }
      return 'help';
    });
  }, []);

  const closeOverlay = useCallback(() => {
    setOverlayView((view) => {
      if (view === 'pause') {
        setPaused(false);
      }
      return null;
    });
  }, []);

  const switchOverlayView = useCallback((view: OverlayView) => {
    setOverlayView((current) => {
      if (current === view) return current;
      if (view === 'pause') {
        setPaused(true);
      }
      return view;
    });
  }, []);

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

  // Keyboard shortcuts to control overlays and pause state
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
        cycleOverlay();
      } else if (e.key === 'Escape') {
        if (overlayView) {
          e.preventDefault();
          closeOverlay();
        }
      } else if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        setPaused((prev) => {
          const next = !prev;
          setOverlayView((view) => {
            if (next) {
              return 'pause';
            }
            return view === 'pause' ? null : view;
          });
          return next;
        });
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [cycleOverlay, closeOverlay, overlayView]);

  // Show tutorial overlay on first visit
  useEffect(() => {
    try {
      const key = `seen_tutorial_${gameId}`;
      if (typeof window !== 'undefined' && !window.localStorage.getItem(key)) {
        setOverlayView('help');
        window.localStorage.setItem(key, '1');
      }
    } catch {
      // ignore storage errors
    }
  }, [gameId]);

  // Auto-pause when page becomes hidden or window loses focus
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        setPaused(true);
        setOverlayView('pause');
      }
    };
    const handleBlur = () => {
      setPaused(true);
      setOverlayView('pause');
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('blur', handleBlur);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  const resume = useCallback(() => {
    setPaused(false);
    setOverlayView((view) => (view === 'pause' ? null : view));
  }, []);

  const contextValue = { record, registerReplay };

  return (
    <RecorderContext.Provider value={contextValue}>
      <div className="relative h-full w-full" data-reduced-motion={prefersReducedMotion}>
        {overlayView && (
          <HelpOverlay
            gameId={gameId}
            view={overlayView}
            onClose={closeOverlay}
            onViewChange={switchOverlayView}
            onResume={resume}
            onRestart={onRestart}
            paused={paused}
            mapping={mapping}
            setKey={setKey as (action: string, key: string) => string | null}
            overlayLegend={overlayLegend}
          />
        )}
        <div className="absolute top-2 right-2 z-40 flex flex-col items-end space-y-2">
          <div className="flex space-x-2">
          <button
            type="button"
            onClick={() =>
              setPaused((p) => {
                const next = !p;
                setOverlayView((view) => {
                  if (next) {
                    return 'pause';
                  }
                  return view === 'pause' ? null : view;
                });
                return next;
              })
            }
            className="px-2 py-1 bg-gray-700 text-white rounded focus:outline-none focus:ring"
          >
            {paused ? 'Resume' : 'Pause'}
          </button>
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
          {highScore !== undefined && (
            <button
              type="button"
              onClick={shareScore}
              className="px-2 py-1 bg-gray-700 text-white rounded focus:outline-none focus:ring"
            >
              Share Score
            </button>
          )}
          <button
            type="button"
            aria-label="Help"
            aria-expanded={overlayView !== null}
            onClick={cycleOverlay}
            className="bg-gray-700 text-white rounded-full w-8 h-8 flex items-center justify-center focus:outline-none focus:ring"
          >
            ?
          </button>
          </div>
          {actionLegend && actionLegend.length > 0 && (
            <div
              className="bg-gray-900 bg-opacity-80 text-white text-xs rounded px-3 py-2 shadow-lg max-w-xs space-y-1"
              role="region"
              aria-label="Control legend"
            >
              <div className="font-semibold text-[0.7rem] uppercase tracking-wide text-gray-300">
                Controls
              </div>
              <ul className="space-y-0.5">
                {actionLegend.map(({ action, key }) => (
                  <li key={action} className="flex items-center justify-between gap-2">
                    <span className="capitalize text-gray-300">{action.replaceAll('-', ' ')}</span>
                    <span className="font-mono text-gray-100">{key}</span>
                  </li>
                ))}
              </ul>
              <div className="font-semibold text-[0.7rem] uppercase tracking-wide text-gray-300 pt-1 border-t border-gray-700">
                Overlay
              </div>
              <ul className="space-y-0.5">
                {overlayLegend.map((item) => (
                  <li key={item.label} className="flex items-center justify-between gap-2">
                    <span className="font-mono text-gray-100 whitespace-nowrap">
                      {item.label}
                    </span>
                    <span className="text-gray-300 text-right">{item.description}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
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
