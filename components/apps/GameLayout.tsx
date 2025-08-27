import React, { useState, useEffect, useCallback } from 'react';
import TutorialOverlay from './Games/common/tutorial';

interface GameLayoutProps {
  gameId: string;
  children: React.ReactNode;
}

const GameLayout: React.FC<GameLayoutProps> = ({ gameId, children }) => {
  const [showHelp, setShowHelp] = useState(false);
  const [paused, setPaused] = useState(false);

  const close = useCallback(() => setShowHelp(false), []);
  const toggle = useCallback(() => setShowHelp((h) => !h), []);

  // Show tutorial overlay until user opts out
  useEffect(() => {
    try {
      const key = `hide_tutorial_${gameId}`;
      if (typeof window !== 'undefined' && !window.localStorage.getItem(key)) {
        setShowHelp(true);
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

  // Auto-pause when page becomes hidden
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'hidden') {
        setPaused(true);
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, []);

  const resume = useCallback(() => setPaused(false), []);

  return (
    <div className="relative h-full w-full">
      {showHelp && <TutorialOverlay gameId={gameId} onClose={close} />}
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
    </div>
  );
};

export default GameLayout;
