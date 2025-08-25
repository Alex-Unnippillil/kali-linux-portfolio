import React from 'react';

const GameLayout = ({ minesLeft, time, children }) => (
  <div className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white p-4 select-none">
    <div className="mb-2 flex space-x-4">
      <span>Mines: {minesLeft}</span>
      <span>Time: {time.toFixed(1)}s</span>
    </div>
    {children}
  </div>
);

export default GameLayout;
