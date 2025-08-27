import React, { useState, useEffect, useCallback } from 'react';
import HelpOverlay from './HelpOverlay';

interface GameLayoutProps {
  gameId: string;
  children: React.ReactNode;
}

const GameLayout: React.FC<GameLayoutProps> = ({ gameId, children }) => {
  const [showHelp, setShowHelp] = useState(false);

  const close = useCallback(() => setShowHelp(false), []);
  const toggle = useCallback(() => setShowHelp((h) => !h), []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (showHelp) {
          setShowHelp(false);
        } else {
          document.getElementById(`close-${gameId}`)?.click();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showHelp, gameId]);

  return (
    <div
      role="application"
      aria-labelledby={`${gameId}-label`}
      className="relative h-full w-full"
    >
      <label
        id={`${gameId}-label`}
        className="absolute top-2 left-2 bg-gray-700 text-white px-2 py-1 rounded"
      >
        {gameId}
      </label>
      {showHelp && <HelpOverlay gameId={gameId} onClose={close} />}
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
