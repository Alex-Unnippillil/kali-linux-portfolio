import React, { useState, useEffect, useCallback } from 'react';
import HelpOverlay from './HelpOverlay';
import { setWakeLock } from '../../utils/wakeLock';

interface GameLayoutProps {
  gameId: string;
  children: React.ReactNode;
}

const GameLayout: React.FC<GameLayoutProps> = ({ gameId, children }) => {
  const [showHelp, setShowHelp] = useState(false);
  const [awake, setAwake] = useState(false);
  const [wakeError, setWakeError] = useState('');

  const close = useCallback(() => setShowHelp(false), []);
  const toggle = useCallback(() => setShowHelp((h) => !h), []);

  const toggleWake = useCallback(async () => {
    const next = !awake;
    try {
      await setWakeLock(next);
      setAwake(next);
      setWakeError('');
    } catch (err: any) {
      setWakeError(err?.message || String(err));
      setAwake(false);
    }
  }, [awake]);

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
      <div className="absolute top-2 right-2 z-40 flex gap-2">
        <button
          type="button"
          aria-label="Toggle wake lock"
          aria-pressed={awake}
          onClick={toggleWake}
          className="bg-gray-700 text-white rounded-full w-8 h-8 flex items-center justify-center focus:outline-none focus:ring"
        >
          {awake ? '☕' : '⚡'}
        </button>
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
      {wakeError && (
        <p className="absolute bottom-2 left-2 text-xs text-red-500">{wakeError}</p>
      )}
      {children}

    </div>
  );
};

export default GameLayout;
