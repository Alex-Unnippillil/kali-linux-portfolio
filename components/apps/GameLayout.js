import React from 'react';

const GameLayout = ({ children, paused, onPause, onRestart }) => (
  <div className="relative w-full h-full">
    {children}
    <div className="absolute top-2 right-2 flex gap-2 z-10">
      <button
        type="button"
        onClick={onPause}
        className="px-2 py-1 bg-gray-700 text-white rounded"
      >
        {paused ? 'Resume' : 'Pause'}
      </button>
      <button
        type="button"
        onClick={onRestart}
        className="px-2 py-1 bg-gray-700 text-white rounded"
      >
        Restart
      </button>
    </div>
  </div>
);

export default GameLayout;
