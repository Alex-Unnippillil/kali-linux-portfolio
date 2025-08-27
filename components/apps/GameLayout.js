import React, { useEffect } from 'react';

const GameLayout = ({
  gameId = 'game',
  title,
  children,
  stage,
  lives,
  score,
  highScore,
}) => {
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        document.getElementById(`close-${gameId}`)?.click();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [gameId]);

  return (
    <div
      role="application"
      aria-labelledby={`${gameId}-label`}
      className="h-full w-full relative text-white"
    >
      <div className="absolute top-2 left-2 z-10 text-sm space-y-1">
        <label id={`${gameId}-label`} className="font-bold">
          {title || gameId}
        </label>
        <div>Stage: {stage}</div>
        <div>Lives: {lives}</div>
        {score !== undefined && <div>Score: {score}</div>}
        {highScore !== undefined && <div>High: {highScore}</div>}
      </div>
      {children}
    </div>
  );
};

export default GameLayout;
