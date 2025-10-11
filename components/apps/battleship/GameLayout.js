import React from 'react';

const GameLayout = ({
  children,
  difficulty,
  onDifficultyChange,
  onRestart,
  stats,
  showHeatmap,
  onToggleHeatmap,
  salvo,
  onSalvoChange,
  fog,
  onFogChange,
  colorblind,
  onColorblindChange,
  hasSavedLayout = false,
  onRestoreLayout,
  onClearLayout,
}) => {
  const overallWins = stats?.overall?.wins ?? stats?.wins ?? 0;
  const overallLosses = stats?.overall?.losses ?? stats?.losses ?? 0;
  const currentDifficulty = stats?.byDifficulty?.[difficulty] ?? {
    wins: 0,
    losses: 0,
  };
  const salvoId = 'battleship-salvo-toggle';
  const fogId = 'battleship-fog-toggle';
  const colorblindId = 'battleship-colorblind-toggle';

  return (
    <div className="h-full w-full flex flex-col items-center justify-start bg-ub-cool-grey text-white p-4 overflow-auto">
      <div className="flex items-center space-x-2 mb-2">
        <label className="text-sm">
          Difficulty:
          <select
            className="ml-1 bg-gray-700 text-white p-1"
            value={difficulty}
            onChange={(e) => onDifficultyChange(e.target.value)}
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </label>
        <button className="px-2 py-1 bg-gray-700" onClick={onToggleHeatmap}>
          {showHeatmap ? 'Hide' : 'Show'} Heatmap
        </button>
        <label className="text-sm" htmlFor={salvoId}>
          <input
            type="checkbox"
            className="mr-1"
            checked={salvo}
            onChange={(e) => onSalvoChange(e.target.checked)}
            id={salvoId}
            aria-label="Toggle salvo mode"
          />
          Salvo
        </label>
        <label className="text-sm" htmlFor={fogId}>
          <input
            type="checkbox"
            className="mr-1"
            checked={fog}
            onChange={(e) => onFogChange(e.target.checked)}
            id={fogId}
            aria-label="Toggle fog of war"
          />
          Fog of War
        </label>
        <label className="text-sm" htmlFor={colorblindId}>
          <input
            type="checkbox"
            className="mr-1"
            checked={colorblind}
            onChange={(e) => onColorblindChange(e.target.checked)}
            id={colorblindId}
            aria-label="Toggle colorblind palette"
          />
          Colorblind
        </label>
        {stats && (
          <div className="ml-4 text-sm flex flex-col">
            <span>
              Overall W {overallWins} / L {overallLosses}
            </span>
            <span>
              {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} W{' '}
              {currentDifficulty.wins} / L {currentDifficulty.losses}
            </span>
          </div>
        )}
      </div>
      <div className="mb-3 flex space-x-2">
        <button className="px-2 py-1 bg-gray-700" onClick={onRestart}>
          Reset Game
        </button>
        {hasSavedLayout && onRestoreLayout && (
          <button className="px-2 py-1 bg-gray-700" onClick={onRestoreLayout}>
            Use Saved Layout
          </button>
        )}
        {hasSavedLayout && onClearLayout && (
          <button className="px-2 py-1 bg-gray-700" onClick={onClearLayout}>
            Clear Saved Layout
          </button>
        )}
      </div>
      {children}
    </div>
  );
};

export default GameLayout;
