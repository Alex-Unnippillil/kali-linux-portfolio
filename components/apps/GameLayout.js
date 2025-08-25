import React, { useState } from 'react';

const GameLayout = ({ children, editor }) => {
  const [mode, setMode] = useState('game');
  return (
    <div className="h-full w-full flex flex-col bg-black text-white">
      <div className="p-2 space-x-2 bg-gray-800">
        <button
          className="px-2 py-1 bg-gray-700 hover:bg-gray-600"
          onClick={() => setMode('game')}
        >
          Play
        </button>
        <button
          className="px-2 py-1 bg-gray-700 hover:bg-gray-600"
          onClick={() => setMode('editor')}
        >
          Level Editor
        </button>
      </div>
      <div className="flex-1 flex items-center justify-center">
        {mode === 'game' ? children : editor}
      </div>
    </div>
  );
};

export default GameLayout;
