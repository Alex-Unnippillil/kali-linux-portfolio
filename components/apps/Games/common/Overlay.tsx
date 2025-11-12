import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import Toast from '../../../ui/Toast';
import { GAME_INSTRUCTIONS } from '../../HelpOverlay';

type Instruction = (typeof GAME_INSTRUCTIONS)[string];

interface OverlayProps {
  gameId?: keyof typeof GAME_INSTRUCTIONS | string;
  paused?: boolean;
  onPause?: () => void;
  onResume?: () => void;
  muted?: boolean;
  onToggleSound?: (muted: boolean) => void;
  onReset?: () => void;
  instructions?: Instruction;
}

/**
 * Shared pause/help overlay for games. Handles hotkeys, displays
 * instructions and keeps game state in sync when paused.
 */
export default function Overlay({
  gameId,
  paused: externalPaused,
  onPause,
  onResume,
  muted: externalMuted,
  onToggleSound,
  onReset,
  instructions,
}: OverlayProps) {
  const [paused, setPaused] = useState(Boolean(externalPaused));
  const [muted, setMuted] = useState(externalMuted ?? false);
  const [fps, setFps] = useState(0);
  const [toast, setToast] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const frame = useRef(performance.now());
  const count = useRef(0);
  const pausedByDisconnect = useRef(false);
  const overlayPausedRef = useRef(false);
  const resumeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const info = useMemo<Instruction | undefined>(() => {
    if (instructions) return instructions;
    if (!gameId) return undefined;
    if (Object.prototype.hasOwnProperty.call(GAME_INSTRUCTIONS, gameId)) {
      return GAME_INSTRUCTIONS[gameId as keyof typeof GAME_INSTRUCTIONS];
    }
    return undefined;
  }, [gameId, instructions]);

  // Track fps using requestAnimationFrame
  useEffect(() => {
    let raf: number;
    const measure = (now: number) => {
      count.current += 1;
      if (now - frame.current >= 1000) {
        setFps(count.current);
        count.current = 0;
        frame.current = now;
      }
      raf = requestAnimationFrame(measure);
    };
    raf = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(raf);
  }, []);

  const pauseGame = useCallback(() => {
    setPaused((prev) => {
      if (!prev) {
        onPause?.();
      }
      return true;
    });
  }, [onPause]);

  const resumeGame = useCallback(() => {
    setPaused((prev) => {
      if (!prev) return prev;
      onResume?.();
      return false;
    });
  }, [onResume]);

  const togglePause = useCallback(() => {
    setPaused((prev) => {
      const next = !prev;
      if (next) {
        onPause?.();
      } else {
        onResume?.();
      }
      return next;
    });
    if (showHelp) {
      overlayPausedRef.current = false;
      setShowHelp(false);
    }
  }, [onPause, onResume, showHelp]);

  const toggleSound = useCallback(() => {
    setMuted((m) => {
      const nm = !m;
      onToggleSound?.(nm);
      return nm;
    });
  }, [onToggleSound]);

  useEffect(() => {
    if (externalMuted !== undefined) {
      setMuted(externalMuted);
    }
  }, [externalMuted]);

  useEffect(() => {
    if (externalPaused === undefined) return;
    setPaused(externalPaused);
    if (!externalPaused && showHelp && !overlayPausedRef.current) {
      setShowHelp(false);
    }
  }, [externalPaused, showHelp]);

  useEffect(() => {
    const handleDisconnect = () => {
      pausedByDisconnect.current = true;
      setToast('Controller disconnected. Reconnect to resume.');
      pauseGame();
    };
    const handleConnect = () => {
      if (pausedByDisconnect.current) {
        pausedByDisconnect.current = false;
        setToast('');
        resumeGame();
      }
    };
    window.addEventListener('gamepaddisconnected', handleDisconnect);
    window.addEventListener('gamepadconnected', handleConnect);
    return () => {
      window.removeEventListener('gamepaddisconnected', handleDisconnect);
      window.removeEventListener('gamepadconnected', handleConnect);
    };
  }, [pauseGame, resumeGame]);

  const openHelp = useCallback(() => {
    if (showHelp) return;
    overlayPausedRef.current = !paused;
    if (!paused) {
      pauseGame();
    }
    setShowHelp(true);
  }, [pauseGame, paused, showHelp]);

  const closeHelp = useCallback(() => {
    if (!showHelp) return;
    setShowHelp(false);
    if (overlayPausedRef.current) {
      overlayPausedRef.current = false;
      resumeGame();
    }
  }, [resumeGame, showHelp]);

  useEffect(() => {
    if (!showHelp) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const timer = window.setTimeout(() => {
      resumeButtonRef.current?.focus();
    }, 0);
    return () => {
      window.clearTimeout(timer);
      previousFocusRef.current?.focus?.();
    };
  }, [showHelp]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      const isInput =
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        target?.isContentEditable;
      if (isInput) return;
      const key = e.key.toLowerCase();
      if (key === 'p') {
        e.preventDefault();
        e.stopPropagation();
        togglePause();
      } else if (key === 'h') {
        e.preventDefault();
        e.stopPropagation();
        if (showHelp) {
          closeHelp();
        } else {
          openHelp();
        }
      } else if (key === 'escape' && showHelp) {
        e.preventDefault();
        e.stopPropagation();
        closeHelp();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [closeHelp, openHelp, showHelp, togglePause]);

  const shortcutHints = useMemo(() => {
    return [
      { key: 'P', label: paused ? 'Resume' : 'Pause' },
      { key: 'H', label: showHelp ? 'Hide help' : 'Show help' },
    ];
  }, [paused, showHelp]);

  const renderActions = () => {
    if (!info?.actions) return null;
    return (
      <dl className="game-overlay__actions-grid">
        {Object.entries(info.actions).map(([action, keybind]) => (
          <div key={action} className="game-overlay__actions-row">
            <dt>{action}</dt>
            <dd>{keybind}</dd>
          </div>
        ))}
      </dl>
    );
  };

  return (
    <>
      <div className="game-overlay" role="toolbar" aria-label="Game overlay controls">
        <button
          type="button"
          onClick={togglePause}
          aria-label={paused ? 'Resume game (P)' : 'Pause game (P)'}
        >
          {paused ? 'Resume (P)' : 'Pause (P)'}
        </button>
        {onReset && (
          <button type="button" onClick={onReset} aria-label="Reset game">
            Reset
          </button>
        )}
        {onToggleSound && (
          <button
            type="button"
            onClick={toggleSound}
            aria-label={muted ? 'Unmute game audio' : 'Mute game audio'}
          >
            {muted ? 'Unmute' : 'Mute'}
          </button>
        )}
        <button
          type="button"
          onClick={showHelp ? closeHelp : openHelp}
          aria-expanded={showHelp}
          aria-label={showHelp ? 'Hide help overlay (H)' : 'Show help overlay (H)'}
        >
          {showHelp ? 'Close Help (H)' : 'Help (H)'}
        </button>
        <span className="fps" aria-live="polite">
          {fps} FPS
        </span>
      </div>
      {showHelp && (
        <div className="game-overlay__backdrop" role="presentation">
          <div
            className="game-overlay__panel"
            role="dialog"
            aria-modal="true"
            aria-label={gameId ? `${gameId} help` : 'Game help'}
          >
            <h2>{gameId ? `${gameId} controls` : 'Game controls'}</h2>
            {info?.objective && (
              <p>
                <strong>Objective:</strong> {info.objective}
              </p>
            )}
            {info?.controls && !info.actions && (
              <p>
                <strong>Controls:</strong> {info.controls}
              </p>
            )}
            {renderActions()}
            <div className="game-overlay__shortcuts" aria-live="polite">
              {shortcutHints.map((hint) => (
                <span key={hint.key} className="game-overlay__shortcut">
                  <kbd>{hint.key}</kbd>
                  <span>{hint.label}</span>
                </span>
              ))}
            </div>
            <div className="game-overlay__buttons">
              <button
                type="button"
                ref={resumeButtonRef}
                onClick={closeHelp}
                className="game-overlay__primary"
              >
                {overlayPausedRef.current ? 'Resume game' : 'Close'}
              </button>
              {onReset && (
                <button type="button" onClick={onReset}>
                  Restart
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {toast && (
        <Toast
          message={toast}
          onClose={() => setToast('')}
          duration={1000000}
        />
      )}
    </>
  );
}
