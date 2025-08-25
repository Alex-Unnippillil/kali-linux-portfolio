import React from 'react';

const GameLayout = ({ children, onRestart }) => (
  <div className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white p-4">
    {children}
    {onRestart && (
      <button
        className="mt-4 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
        onClick={onRestart}
      >
        Restart
      </button>
    )}
  </div>
);

export default GameLayout;
