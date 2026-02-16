import React from 'react';
import type { Objective } from '../engine/types';

export const Hud: React.FC<{
  level: number;
  score: number;
  movesLeft: number;
  objectives: Objective[];
  onReset: () => void;
  onPause: () => void;
  paused: boolean;
  onRules: () => void;
}> = ({ level, score, movesLeft, objectives, onReset, onPause, paused, onRules }) => (
  <div className="mb-3 grid gap-2 rounded-xl bg-slate-900/80 p-3 text-xs text-slate-100 sm:grid-cols-3">
    <div>
      <p className="font-semibold">Level {level}</p>
      <p>Score: {score}</p>
      <p>Moves: {movesLeft}</p>
    </div>
    <div>
      <p className="font-semibold">Objectives</p>
      {objectives.map((objective, idx) => (
        <p key={idx}>{objective.type === 'collectColor' ? `${objective.color}` : objective.type}: {objective.progress}/{objective.target}</p>
      ))}
    </div>
    <div className="flex items-start justify-end gap-2">
      <button type="button" onClick={onRules} className="rounded bg-slate-700 px-2 py-1">Rules</button>
      <button type="button" onClick={onPause} className="rounded bg-slate-700 px-2 py-1">{paused ? 'Resume' : 'Pause'}</button>
      <button type="button" onClick={onReset} className="rounded bg-rose-700 px-2 py-1">Reset</button>
    </div>
  </div>
);
