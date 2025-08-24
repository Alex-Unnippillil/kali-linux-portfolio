'use client';
import React from 'react';
import PauseMenu from './PauseMenu';
import { useScore } from './score';

export default function HUD() {
  const { score } = useScore();
  return (
    <div className="absolute top-2 left-2 text-white" aria-label="game heads up display">
      <span className="mr-4">Score: {score}</span>
      <PauseMenu />
    </div>
  );
}
