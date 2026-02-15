import React, { memo, useMemo } from 'react';
import clsx from 'clsx';
import { COLS, ROWS, getValidRow, type Cell, type Token } from '../../../games/connect-four/solver';
import { buildTokenGradient, getHintStyle, PATTERNS, type PALETTES } from './constants';

type Props = {
  board: Cell[][];
  layout: { boardWidth: number; boardHeight: number; gap: number; cellSize: number; slot: number };
  highContrast: boolean;
  normalizedQuality: number;
  prefersReducedMotion: boolean;
  winningSet: Set<string>;
  effectiveCol: number;
  assists: boolean;
  confirmMove: boolean;
  canInteract: boolean;
  hintScores: (number | null)[];
  palette: keyof typeof PALETTES;
  paletteConfig: (typeof PALETTES)[keyof typeof PALETTES];
  tokenNames: Record<Token, string>;
  currentPlayer: Token;
  showPatterns: boolean;
  ghostDiscStyle: React.CSSProperties | null;
  ghostRow: number;
  animDisc: { col: number; token: Token; y: number; size: number } | null;
  setHoverCol: (col: number | null) => void;
  selectColumn: (col: number, source: 'pointer' | 'keyboard') => void;
};

const CellView = memo(function CellView({
  cell,
  r,
  c,
  isWin,
  highContrast,
  prefersReducedMotion,
  layout,
  tokenNames,
  renderToken,
}: any) {
  return (
    <div
      className={clsx(
        'rounded-full flex items-center justify-center',
        highContrast ? 'border-2 border-white/60' : 'border border-slate-700',
        isWin && (prefersReducedMotion ? 'ring-2 ring-cyan-400' : 'ring-2 ring-cyan-300 animate-pulse'),
      )}
      style={{ width: layout.cellSize, height: layout.cellSize, backgroundColor: 'rgba(2,6,23,0.65)' }}
      aria-label={`Row ${r + 1} column ${c + 1}. ${cell ? tokenNames[cell] : 'Empty'}.`}
      role="gridcell"
      data-testid={`connect-four-cell-${r}-${c}`}
      data-token={cell ?? ''}
    >
      {cell && renderToken(cell, Math.max(10, layout.cellSize - 12))}
    </div>
  );
});

export default function BoardView(props: Props) {
  const renderToken = (token: Token, size: number, isGhost = false) => {
    const tokenConfig = props.paletteConfig.tokens[token];
    const gradient = buildTokenGradient(tokenConfig.primary, tokenConfig.secondary, tokenConfig.highlight);
    return (
      <div
        className={clsx(
          'relative rounded-full transition-transform',
          props.normalizedQuality > 0 && 'shadow-lg',
          props.highContrast ? 'ring-2 ring-white/70' : 'ring-1 ring-black/30',
        )}
        style={{ width: size, height: size, backgroundImage: gradient, opacity: isGhost ? 0.45 : 1, filter: isGhost ? 'saturate(0.9)' : 'none' }}
      >
        {props.showPatterns && (
          <div className="absolute inset-0 rounded-full" style={{ backgroundImage: PATTERNS[token], opacity: isGhost ? 0.4 : 0.55, mixBlendMode: 'screen' }} />
        )}
      </div>
    );
  };

  const lastMoveAria = useMemo(() => {
    if (props.animDisc) return `Last move in progress for column ${props.animDisc.col + 1}.`;
    return '';
  }, [props.animDisc]);

  return (
    <div
      className={clsx('relative rounded-2xl p-3', props.normalizedQuality > 0 ? 'shadow-xl' : 'shadow-none', props.highContrast ? 'border-2 border-gray-100/80' : 'border border-gray-700/70')}
      style={{ width: props.layout.boardWidth + 24, background: props.normalizedQuality > 0 ? 'linear-gradient(145deg, rgba(15,23,42,0.95), rgba(30,41,59,0.95))' : 'rgba(15,23,42,0.9)' }}
    >
      <div className="sr-only" aria-live="polite">{lastMoveAria}</div>
      <div className="relative grid grid-rows-6 grid-cols-7" style={{ width: props.layout.boardWidth, height: props.layout.boardHeight, gap: `${props.layout.gap}px` }} role="grid" aria-rowcount={ROWS} aria-colcount={COLS}>
        {props.board.map((row, r) => row.map((cell, c) => <CellView key={`${r}-${c}`} cell={cell} r={r} c={c} isWin={props.winningSet.has(`${r}:${c}`)} highContrast={props.highContrast} prefersReducedMotion={props.prefersReducedMotion} layout={props.layout} tokenNames={props.tokenNames} renderToken={renderToken} />))}
        {props.ghostDiscStyle && props.ghostRow !== -1 && <div className="absolute pointer-events-none" style={props.ghostDiscStyle}>{renderToken(props.currentPlayer, props.layout.cellSize, true)}</div>}
        {props.animDisc && <div className="absolute pointer-events-none" style={{ left: props.animDisc.col * props.layout.slot, top: props.animDisc.y, width: props.animDisc.size, height: props.animDisc.size }}>{renderToken(props.animDisc.token, props.animDisc.size)}</div>}
      </div>
      <div className="absolute inset-0 grid grid-cols-7" style={{ gap: `${props.layout.gap}px` }}>
        {Array.from({ length: COLS }, (_, col) => {
          const colFull = getValidRow(props.board, col) === -1;
          const isSelected = props.effectiveCol === col;
          const score = props.hintScores[col];
          const disabled = colFull || !props.canInteract;
          const labelParts = [`Column ${col + 1}`];
          if (colFull) labelParts.push('Full');
          if (props.confirmMove) labelParts.push('Tap twice to drop');
          if (props.assists && typeof score === 'number') labelParts.push(`Hint score ${Math.round(score)}`);
          return (
            <button key={col} type="button" aria-label={labelParts.join('. ')} aria-pressed={isSelected} disabled={disabled} onMouseEnter={() => props.setHoverCol(col)} onMouseLeave={() => props.setHoverCol(null)} onFocus={() => props.setHoverCol(col)} onBlur={() => props.setHoverCol(null)} onClick={() => props.selectColumn(col, 'pointer')} className={clsx('h-full rounded-xl border border-transparent transition focus:outline-none focus:ring-2', disabled ? 'opacity-40 cursor-not-allowed' : 'hover:border-cyan-300/60 focus:ring-cyan-400', isSelected && 'border-cyan-300', props.highContrast && 'focus:ring-4')} style={props.assists ? getHintStyle(score, props.palette, props.highContrast) : undefined}>
              <span className="sr-only">Drop in column {col + 1}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
