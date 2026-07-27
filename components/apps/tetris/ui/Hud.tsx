import React from 'react';
import { PIECE_COLORS, ROTATIONS, PieceType } from '../engine';

const MiniPiece: React.FC<{ type: PieceType | null }> = ({ type }) => {
  if (!type) return <div className="h-16 rounded border border-slate-700" />;
  return (
    <div className="grid grid-cols-4 grid-rows-4 gap-0.5 rounded border border-slate-700 p-1 h-16">
      {Array.from({ length: 16 }).map((_, idx) => {
        const x = idx % 4;
        const y = Math.floor(idx / 4);
        const filled = ROTATIONS[type][0].some((cell) => cell.x === x && cell.y === y);
        return <span key={idx} className="rounded-sm" style={{ backgroundColor: filled ? PIECE_COLORS[type] : 'transparent', border: filled ? '1px solid rgba(255,255,255,0.25)' : '1px dashed rgba(148,163,184,0.15)' }} />;
      })}
    </div>
  );
};

const Stat: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
  <div className="rounded border border-slate-700 bg-slate-900/70 px-3 py-2">
    <div className="text-[11px] uppercase tracking-widest text-slate-400">{label}</div>
    <div className="text-lg font-semibold text-slate-100">{value}</div>
  </div>
);

interface Props {
  hold: PieceType | null;
  next: PieceType[];
  score: number;
  lines: number;
  level: number;
  status: string;
}

const Hud: React.FC<Props> = ({ hold, next, score, lines, level, status }) => (
  <aside className="w-48 space-y-3">
    <Stat label="Score" value={score} />
    <Stat label="Lines" value={lines} />
    <Stat label="Level" value={level} />
    <Stat label="State" value={status} />

    <section aria-label="Hold piece" className="rounded border border-slate-700 bg-slate-900/70 p-2">
      <h3 className="mb-1 text-xs uppercase tracking-widest text-slate-300">Hold</h3>
      <MiniPiece type={hold} />
    </section>

    <section aria-label="Next pieces" className="rounded border border-slate-700 bg-slate-900/70 p-2">
      <h3 className="mb-1 text-xs uppercase tracking-widest text-slate-300">Next</h3>
      <div className="space-y-1">
        {next.slice(0, 5).map((piece, idx) => (
          <MiniPiece key={`${piece}-${idx}`} type={piece} />
        ))}
      </div>
    </section>
  </aside>
);

export default React.memo(Hud);
