import React, { useState, useEffect, useCallback } from 'react';
import HelpOverlay from './HelpOverlay';
import PerfOverlay from './Games/common/perf';
import usePrefersReducedMotion from '../../hooks/usePrefersReducedMotion';

interface GameLayoutProps {
  gameId?: string;
  children: React.ReactNode;
  stage?: number;
  lives?: number;
  score?: number;
  highScore?: number;
}

const GameLayout: React.FC<GameLayoutProps> = ({
  gameId = 'unknown',
  children,
  stage,
  lives,
  score,
  highScore,
}) => {
  const [showHelp, setShowHelp] = useState(false);
  const [paused, setPaused] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();

  const close = useCallback(() => setShowHelp(false), []);
  const toggle = useCallback(() => setShowHelp((h) => !h), []);

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

  return (
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
            className="px-4 py-2 bg-gray-700 text-white rounded focus:outline-none focus:ring"
            autoFocus
          >
            Resume
          </button>
        </div>
      )}
      <button
        type="button"
        aria-label="Help"
        aria-expanded={showHelp}
        onClick={toggle}
        className="absolute top-2 right-2 z-40 bg-gray-700 text-white rounded-full w-8 h-8 flex items-center justify-center focus:outline-none focus:ring"
      >
        ?
      </button>
      {children}
      <div className="absolute top-2 left-2 z-10 text-sm space-y-1">
        {stage !== undefined && <div>Stage: {stage}</div>}
        {lives !== undefined && <div>Lives: {lives}</div>}
        {score !== undefined && <div>Score: {score}</div>}
        {highScore !== undefined && <div>High: {highScore}</div>}
      </div>
      {!prefersReducedMotion && <PerfOverlay />}
    </div>
  );
};

export default GameLayout;
