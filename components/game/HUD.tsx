'use client';
import React from 'react';
import PauseMenu from './PauseMenu';
import { useScore } from './score';

export default function HUD() {
  const { score } = useScore();
  return (
    <div
      className="absolute top-2 left-2 bg-black/60 text-white p-2 rounded text-sm sm:text-base md:text-lg"
      aria-label="game heads up display"
    >
      <span className="mr-4" aria-live="polite">
        Score: {score}
      </span>
      <PauseMenu />
    </div>
  );
}
