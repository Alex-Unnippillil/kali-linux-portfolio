import React from 'react';

const GameLayout = ({ children, difficulty, onDifficultyChange, onRestart, stats, mode, onModeChange }) => {
  return (
    <div className="h-full w-full flex flex-col items-center justify-start bg-ub-cool-grey text-white p-4 overflow-auto">
      <div className="flex items-center space-x-2 mb-2">
        <label className="text-sm">
          Mode:
          <select className="ml-1 bg-gray-700 text-white p-1" value={mode} onChange={(e) => onModeChange(e.target.value)}>
            <option value="ai">AI</option>
            <option value="hotseat">Hotseat</option>
          </select>
        </label>
        <label className="text-sm">
          Difficulty:
          <select
            className="ml-1 bg-gray-700 text-white p-1"
            value={difficulty}
            onChange={(e) => onDifficultyChange(e.target.value)}
          >
            <option value="easy">Easy</option>
            <option value="hard">Hard</option>
          </select>
        </label>
        <button className="px-2 py-1 bg-gray-700" onClick={onRestart}>
          Restart
        </button>
        {stats && (
          <div className="ml-4 text-sm">
            W: {stats.wins} L: {stats.losses}
          </div>
        )}
      </div>
      {children}
    </div>
  );
};

export default GameLayout;
