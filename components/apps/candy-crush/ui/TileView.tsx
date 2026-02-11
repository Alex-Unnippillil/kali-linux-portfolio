import React from 'react';
import type { Cell } from '../engine/types';

const colorClass: Record<string, string> = {
  red: 'from-rose-400 to-rose-600',
  blue: 'from-sky-400 to-indigo-600',
  green: 'from-emerald-400 to-emerald-600',
  yellow: 'from-amber-300 to-yellow-500',
  purple: 'from-violet-400 to-purple-600',
  orange: 'from-orange-400 to-orange-600',
};

export const TileView: React.FC<{ cell: Cell; selected: boolean; onSelect: () => void; size: number; disabled?: boolean; focused?: boolean }> = ({
  cell,
  selected,
  onSelect,
  size,
  disabled,
  focused,
}) => {
  if (cell.hole) return <div style={{ width: size, height: size }} />;

  const candy = cell.candy;
  return (
    <button
      type="button"
      data-cell={`${cell.coord.r}-${cell.coord.c}`}
      disabled={disabled}
      onClick={onSelect}
      className={`relative rounded-xl border border-slate-700/70 bg-slate-900/70 p-0 transition ${selected ? 'ring-2 ring-cyan-300' : ''} ${focused ? 'outline outline-2 outline-cyan-500' : ''}`}
      style={{ width: size, height: size }}
      aria-label={`tile ${cell.coord.r},${cell.coord.c}`}
    >
      {cell.jelly > 0 && <div className="absolute inset-1 rounded-lg bg-fuchsia-300/20" />}
      {cell.ice > 0 && <div className="absolute inset-1 rounded-lg bg-cyan-200/30" />}
      {candy && (
        <div className={`absolute inset-1 rounded-lg bg-gradient-to-br ${candy.color ? colorClass[candy.color] : 'from-slate-100 to-slate-400'} shadow`}> 
          {candy.kind === 'stripedH' && <div className="absolute inset-x-1 top-1/2 h-1 -translate-y-1/2 rounded bg-white/75" />}
          {candy.kind === 'stripedV' && <div className="absolute inset-y-1 left-1/2 w-1 -translate-x-1/2 rounded bg-white/75" />}
          {candy.kind === 'wrapped' && <div className="absolute inset-2 rounded-md border-2 border-white/70" />}
          {candy.kind === 'colorBomb' && <div className="absolute inset-2 grid grid-cols-2 gap-1">{[0,1,2,3].map((dot)=> <span key={dot} className="rounded-full bg-white/80" />)}</div>}
        </div>
      )}
    </button>
  );
};
