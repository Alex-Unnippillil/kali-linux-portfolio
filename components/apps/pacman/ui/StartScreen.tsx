import React from 'react';
import type { LevelDefinition } from '../../../../apps/pacman/types';

interface StartScreenProps {
  levelSearch: string;
  onLevelSearchChange: (value: string) => void;
  filteredLevels: LevelDefinition[];
  allLevels: LevelDefinition[];
  activeLevelIndex: number;
  onSelectLevel: (index: number) => void;
  onStart: () => void;
  scoreList: { name: string; score: number }[];
}

const StartScreen: React.FC<StartScreenProps> = ({
  levelSearch,
  onLevelSearchChange,
  filteredLevels,
  allLevels,
  activeLevelIndex,
  onSelectLevel,
  onStart,
  scoreList,
}) => (
  <div
    className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/70 text-white"
    role="button"
    aria-label="Start game"
    tabIndex={0}
    onPointerDown={(event) => {
      const target = event.target as HTMLElement;
      if (!['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(target.tagName)) onStart();
    }}
    onKeyDown={(event) => {
      if (event.key === 'Enter' || event.key === ' ') onStart();
    }}
  >
    <div className="text-lg font-semibold">Pacman</div>
    <div className="text-sm text-slate-200">Press Space or tap to start</div>
    <div className="w-64 space-y-2">
      <input
        type="text"
        value={levelSearch}
        aria-label="Search levels"
        onChange={(event) => onLevelSearchChange(event.target.value)}
        className="w-full rounded bg-slate-800/80 px-2 py-1 text-sm"
        placeholder="Search levels..."
      />
      <select
        aria-label="Select level"
        className="w-full rounded bg-slate-800/80 px-2 py-1 text-sm"
        value={activeLevelIndex}
        onChange={(event) => onSelectLevel(Number(event.target.value))}
      >
        {filteredLevels.map((level, index) => {
          const sourceIndex = allLevels.indexOf(level);
          return (
            <option key={`${level.name}-${index}`} value={sourceIndex}>
              {level.name || `Level ${index + 1}`} ({level.maze[0]?.length}x{level.maze.length})
            </option>
          );
        })}
      </select>
    </div>
    <button
      type="button"
      className="rounded bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900"
      onClick={onStart}
    >
      Start
    </button>
    {scoreList.length > 0 && (
      <ol className="text-xs">
        {scoreList.slice(0, 5).map((entry, index) => (
          <li key={`${entry.name}-${index}`}>{entry.name}: {entry.score}</li>
        ))}
      </ol>
    )}
  </div>
);

export default StartScreen;
