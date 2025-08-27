import React from 'react';
import PerfOverlay from './Games/common/perf';

const GameLayout = ({ children, stage, lives, score, highScore }) => (
  <div className="h-full w-full relative text-white">
    <div className="absolute top-2 left-2 z-10 text-sm space-y-1">
      <div>Stage: {stage}</div>
      <div>Lives: {lives}</div>
      {score !== undefined && <div>Score: {score}</div>}
      {highScore !== undefined && <div>High: {highScore}</div>}
    </div>
    {children}
    <PerfOverlay />

  </div>
);

export default GameLayout;
