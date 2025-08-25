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

  return (
    <div className="relative h-full w-full">
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
