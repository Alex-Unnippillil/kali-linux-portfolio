
import React, {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'framer-motion';
import { Overlay, useGameLoop } from './Games/common';
import {
  BOARD_WIDTH,
  GEM_IDS,
  type GemId,
  type CandyCell,
  computeCellSize,
  createPlayableBoard,
  detonateColorBomb,
  findFirstPossibleMove,
  findMatches,
  hasPossibleMoves,
  initialBoosters,
  isAdjacent,
  resolveBoard,
  scoreCascade,
  shuffleBoard,
  swapCandies,
  useCandyCrushStats,
} from './candy-crush-logic';
import usePersistentState from '../../hooks/usePersistentState';
import { getAudioContext } from '../../utils/audio';

const DEFAULT_CELL_SIZE = 48;
const MIN_CELL_SIZE = 34;
const MAX_CELL_SIZE = 56;
const gridGap = 8;
const MOVES_PER_LEVEL = 24;

const computeTargetScore = (level: number): number => 750 + (Math.max(1, level) - 1) * 320;

const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean';

type BoosterState = typeof initialBoosters;

interface ComboBanner {
  id: string;
  chain: number;
  points: number;
}

interface ParticleBurst {
  id: string;
  positions: number[];
  colors: GemId[];
}

interface CascadeSummary {
  chain: number;
  cleared: number;
  points: number;
  positions: number[];
}

type HintMove = [number, number] | null;

interface GemVisual {
  label: string;
  base: string;
  mid: string;
  glow: string;
  shadow: string;
  highlight: string;
  accent: string;
  symbol: string;
  pattern: string;
}

const GEM_LIBRARY: Record<string, GemVisual> = {
  aurora: {
    label: 'Aurora Prism',
    base: '#38bdf8',
    mid: '#2563eb',
    glow: '#bae6fd',
    shadow: '#0f172a',
    highlight: '#f8fafc',
    accent: '#22d3ee',
    symbol: '◆',
    pattern: '#1e3a8a',
  },
  solstice: {
    label: 'Solstice Ember',
    base: '#f97316',
    mid: '#ea580c',
    glow: '#fed7aa',
    shadow: '#7c2d12',
    highlight: '#fff7ed',
    accent: '#fb923c',
    symbol: '⬢',
    pattern: '#7c2d12',
  },
  abyss: {
    label: 'Abyss Crystal',
    base: '#6366f1',
    mid: '#4338ca',
    glow: '#c7d2fe',
    shadow: '#1e1b4b',
    highlight: '#eef2ff',
    accent: '#818cf8',
    symbol: '⬣',
    pattern: '#312e81',
  },
  ion: {
    label: 'Ion Spark',
    base: '#22d3ee',
    mid: '#0ea5e9',
    glow: '#a5f3fc',
    shadow: '#083344',
    highlight: '#ecfeff',
    accent: '#67e8f9',
    symbol: '⬡',
    pattern: '#134e4a',
  },
  pulse: {
    label: 'Pulse Bloom',
    base: '#f472b6',
    mid: '#ec4899',
    glow: '#fbcfe8',
    shadow: '#831843',
    highlight: '#fdf2f8',
    accent: '#f9a8d4',
    symbol: '✶',
    pattern: '#701a75',
  },
};

const fallbackGem: GemVisual = {
  label: 'Unknown Gem',
  base: '#94a3b8',
  mid: '#64748b',
  glow: '#cbd5f5',
  shadow: '#0f172a',
  highlight: '#f8fafc',
  accent: '#e2e8f0',
  symbol: '?',
  pattern: '#475569',
};

const getGem = (id: string): GemVisual => GEM_LIBRARY[id] ?? fallbackGem;

interface GemSpriteProps {
  cell: CandyCell;
  gem: GemVisual;
  streak: number;
  colorblindMode: boolean;
  reducedMotion: boolean;
}

const GemSprite = React.memo(({ cell, gem, streak, colorblindMode, reducedMotion }: GemSpriteProps) => {
  const gradientId = useMemo(() => `gem-gradient-${cell.id}`, [cell.id]);
  const glowId = useMemo(() => `gem-glow-${cell.id}`, [cell.id]);
  const patternId = useMemo(() => `gem-pattern-${cell.id}`, [cell.id]);
  const shimmerDelay = useMemo(() => (parseInt(cell.id.replace(/\D/g, ''), 10) % 5) * 0.15, [cell.id]);
  const shimmerStrength = streak >= 3 ? 1 : 0;

  return (
    <motion.svg
      viewBox="0 0 100 100"
      width="100%"
      height="100%"
      aria-hidden
      initial={{ scale: 0.85, opacity: 0 }}
      animate={
        reducedMotion
          ? { scale: 1, opacity: 1 }
          : {
              scale: 1,
              opacity: 1,
              filter: [
                'drop-shadow(0px 0px 0px rgba(255,255,255,0.25))',
                `drop-shadow(0px 0px ${6 + shimmerStrength * 6}px ${gem.glow}66)`,
              ],
            }
      }
      transition={reducedMotion ? { duration: 0 } : { duration: 0.35, ease: 'easeOut' }}
      className="overflow-visible"
    >
      <defs>
        <radialGradient id={gradientId} cx="30%" cy="30%" r="80%">
          <stop offset="0%" stopColor={gem.highlight} />
          <stop offset="35%" stopColor={gem.base} />
          <stop offset="75%" stopColor={gem.mid} />
          <stop offset="100%" stopColor={gem.shadow} />
        </radialGradient>
        <linearGradient id={glowId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={`${gem.accent}aa`} />
          <stop offset="100%" stopColor={`${gem.highlight}55`} />
        </linearGradient>
        {colorblindMode && (
          <pattern
            id={patternId}
            width="6"
            height="6"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <rect x="0" y="0" width="6" height="6" fill="transparent" />
            <rect x="0" y="0" width="3" height="6" fill={gem.pattern} opacity="0.4" />
          </pattern>
        )}
      </defs>
      <motion.polygon
        points="50,6 92,32 92,68 50,94 8,68 8,32"
        fill={`url(#${gradientId})`}
        stroke={gem.glow}
        strokeWidth="2"
        animate={
          reducedMotion
            ? { rotate: 0 }
            : {
                rotate: [0, shimmerStrength ? 0.8 : 0, 0],
              }
        }
        transition={
          reducedMotion
            ? { duration: 0 }
            : { duration: 2.8, repeat: Infinity, ease: 'easeInOut', delay: shimmerDelay }
        }
      />
      <motion.polygon
        points="50,16 82,36 82,64 50,84 18,64 18,36"
        fill={`url(#${glowId})`}
        opacity={0.65}
        animate={reducedMotion ? { opacity: 0.65 } : { opacity: [0.35, 0.75, 0.35] }}
        transition={
          reducedMotion ? { duration: 0 } : { duration: 3.2, repeat: Infinity, ease: 'easeInOut', delay: shimmerDelay / 2 }
        }
      />
      {colorblindMode && (
        <polygon points="50,6 92,32 92,68 50,94 8,68 8,32" fill={`url(#${patternId})`} opacity="0.65" />
      )}
      <motion.circle
        cx="34"
        cy="30"
        r="14"
        fill={gem.highlight}
        opacity={0.5}
        animate={
          reducedMotion
            ? { opacity: 0.5, x: 0, y: 0 }
            : {
                opacity: [0.25, 0.65, 0.25],
                x: [-4, 0, -4],
                y: [-4, 0, -4],
              }
        }
        transition={
          reducedMotion ? { duration: 0 } : { duration: 3.6, repeat: Infinity, ease: 'easeInOut', delay: shimmerDelay }
        }
      />
      <motion.text
        x="50"
        y="58"
        fill={colorblindMode ? gem.highlight : `${gem.highlight}cc`}
        fontSize="26"
        fontWeight="700"
        textAnchor="middle"
        dominantBaseline="middle"
        animate={reducedMotion ? { opacity: 0.7 } : { opacity: [0.4, 0.8, 0.4] }}
        transition={
          reducedMotion ? { duration: 0 } : { duration: 4.2, repeat: Infinity, ease: 'easeInOut', delay: shimmerDelay }
        }
      >
        {gem.symbol}
      </motion.text>
    </motion.svg>
  );
});
GemSprite.displayName = 'GemSprite';

interface HudPanelProps {
  statusLabel: string;
  statusTheme: string;
  stats: Array<{ label: string; value: number }>;
  message: string;
  lastCascade: CascadeSummary | null;
  scoreProgress: number;
  movesProgress: number;
  reducedMotion: boolean;
  showCoachmark: boolean;
  onDismissCoachmark: () => void;
}

const HudPanel = React.memo(
  ({
    statusLabel,
    statusTheme,
    stats,
    message,
    lastCascade,
    scoreProgress,
    movesProgress,
    reducedMotion,
    showCoachmark,
    onDismissCoachmark,
  }: HudPanelProps) => (
    <>
      {showCoachmark && (
        <div className="rounded-2xl border border-cyan-400/40 bg-slate-950/70 p-4 text-sm text-cyan-100 shadow-[0_0_24px_rgba(14,165,233,0.25)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.32em] text-cyan-300/80">Quick start</div>
              <p className="mt-2 text-sm text-cyan-100/90">
                Swipe, drag, or tap to swap gems. Build streaks, then use H for a hint or 1/2 for boosters when you get stuck.
              </p>
            </div>
            <button
              type="button"
              onClick={onDismissCoachmark}
              className="rounded-full border border-cyan-400/40 px-2 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-cyan-100 transition hover:border-cyan-200/70"
            >
              Got it
            </button>
          </div>
        </div>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold uppercase tracking-[0.35em] text-cyan-200 sm:text-xl">Kali Crush</h2>
          <p className="text-xs text-cyan-300/70 sm:text-sm">Match neon gems to keep the breach streak alive.</p>
        </div>
        <span
          className={`inline-flex items-center justify-center rounded-full border px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.3em] transition ${statusTheme}`}
        >
          {statusLabel}
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {stats.map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-cyan-500/15 bg-slate-950/60 px-4 py-3 shadow-[0_6px_22px_rgba(8,145,178,0.18)] backdrop-blur"
          >
            <div className="text-[0.65rem] font-semibold uppercase tracking-[0.4em] text-cyan-400/80">{item.label}</div>
            <div className="mt-2 text-2xl font-semibold tabular-nums text-cyan-50">{item.value}</div>
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-cyan-500/15 bg-slate-950/60 px-4 py-4 shadow-[0_8px_28px_rgba(8,145,178,0.2)] backdrop-blur">
        <div className="text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-cyan-400/80">Mission Feed</div>
        <p className="mt-2 text-sm leading-snug text-cyan-100" aria-live="polite" aria-atomic="true">
          {message}
        </p>
        {lastCascade && (
          <p className="mt-2 text-xs text-cyan-300/80">
            Last chain cleared {lastCascade.cleared} gems for {lastCascade.points} points
            {lastCascade.chain > 1 ? ` (x${lastCascade.chain})` : ''}.
          </p>
        )}
        <div className="mt-4 space-y-3">
          <div>
            <div className="flex items-center justify-between text-[0.6rem] uppercase tracking-[0.3em] text-cyan-400/70">
              <span>Score Progress</span>
              <span>{Math.round(scoreProgress)}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-900/80">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-sky-500 via-cyan-400 to-sky-300"
                animate={{ width: `${scoreProgress}%` }}
                transition={reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 120, damping: 20 }}
              />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between text-[0.6rem] uppercase tracking-[0.3em] text-cyan-400/70">
              <span>Move Usage</span>
              <span>{Math.round(movesProgress)}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-900/80">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-amber-500 via-orange-400 to-rose-400"
                animate={{ width: `${movesProgress}%` }}
                transition={reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 120, damping: 20 }}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  ),
);
HudPanel.displayName = 'HudPanel';

interface BoostersBarProps {
  boosters: BoosterState;
  isInteractionDisabled: boolean;
  colorblindMode: boolean;
  onReset: () => void;
  onHint: () => void;
  onShuffle: () => void;
  onColorBomb: () => void;
  onToggleColorblind: () => void;
}

const BoostersBar = React.memo(
  ({ boosters, isInteractionDisabled, colorblindMode, onReset, onHint, onShuffle, onColorBomb, onToggleColorblind }: BoostersBarProps) => (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={onReset}
        className="group relative overflow-hidden rounded-lg border border-cyan-500/30 bg-slate-950/70 px-4 py-2 font-semibold text-cyan-100 shadow-[0_0_18px_rgba(8,47,73,0.45)] transition hover:border-cyan-300/60 hover:text-white hover:shadow-[0_0_24px_rgba(14,165,233,0.3)] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
      >
        Reset Grid
      </button>
      <button
        type="button"
        onClick={onHint}
        disabled={isInteractionDisabled}
        className="group relative overflow-hidden rounded-lg border border-amber-400/50 bg-gradient-to-r from-amber-600/80 via-yellow-500/80 to-amber-400/80 px-4 py-2 font-semibold text-amber-50 shadow-[0_0_20px_rgba(251,191,36,0.35)] transition hover:from-amber-500/90 hover:to-yellow-400/90 disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
      >
        Hint (H)
      </button>
      <div className="group relative">
        <button
          type="button"
          onClick={onShuffle}
          disabled={boosters.shuffle === 0 || isInteractionDisabled}
          aria-describedby="shuffle-tooltip"
          className="relative overflow-hidden rounded-lg border border-cyan-500/40 bg-gradient-to-r from-sky-700/80 via-cyan-600/80 to-sky-500/80 px-4 py-2 font-semibold text-cyan-50 shadow-[0_0_24px_rgba(14,165,233,0.35)] transition hover:from-sky-600/90 hover:to-sky-400/90 disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
        >
          Shuffle (1) ({boosters.shuffle})
          <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-cyan-900/70">
            <span
              className="block h-full bg-gradient-to-r from-cyan-400 to-sky-300"
              style={{ width: `${(boosters.shuffle / initialBoosters.shuffle) * 100}%` }}
            />
          </span>
        </button>
        <div
          id="shuffle-tooltip"
          role="tooltip"
          className="pointer-events-none absolute z-10 mt-2 w-48 rounded-lg border border-cyan-500/40 bg-slate-900/95 px-3 py-2 text-xs text-cyan-100 opacity-0 shadow-[0_0_18px_rgba(8,47,73,0.45)] transition group-hover:opacity-100 group-focus-within:opacity-100"
        >
          Rearranges the grid. Charges are limited per level.
        </div>
      </div>
      <div className="group relative">
        <button
          type="button"
          onClick={onColorBomb}
          disabled={boosters.colorBomb === 0 || isInteractionDisabled}
          aria-describedby="bomb-tooltip"
          className="relative overflow-hidden rounded-lg border border-fuchsia-500/50 bg-gradient-to-r from-fuchsia-700/80 via-pink-600/80 to-rose-500/80 px-4 py-2 font-semibold text-fuchsia-50 shadow-[0_0_24px_rgba(217,70,239,0.35)] transition hover:from-fuchsia-600/90 hover:to-rose-400/90 disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
        >
          Color Bomb (2) ({boosters.colorBomb})
          <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-rose-900/70">
            <span
              className="block h-full bg-gradient-to-r from-fuchsia-400 to-rose-300"
              style={{ width: `${(boosters.colorBomb / initialBoosters.colorBomb) * 100}%` }}
            />
          </span>
        </button>
        <div
          id="bomb-tooltip"
          role="tooltip"
          className="pointer-events-none absolute z-10 mt-2 w-52 rounded-lg border border-fuchsia-500/40 bg-slate-900/95 px-3 py-2 text-xs text-fuchsia-100 opacity-0 shadow-[0_0_22px_rgba(190,24,93,0.45)] transition group-hover:opacity-100 group-focus-within:opacity-100"
        >
          Detonates the most common gem color. Use wisely—charges are scarce.
        </div>
      </div>
      <button
        type="button"
        onClick={onToggleColorblind}
        aria-pressed={colorblindMode}
        className={`rounded-lg border px-4 py-2 font-semibold shadow-[0_0_18px_rgba(15,118,110,0.35)] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
          colorblindMode
            ? 'border-emerald-400/60 bg-emerald-500/20 text-emerald-100'
            : 'border-emerald-500/40 bg-slate-950/60 text-emerald-100/80 hover:text-emerald-100'
        }`}
      >
        {colorblindMode ? 'Disable Colorblind Mode' : 'Enable Colorblind Mode'}
      </button>
    </div>
  ),
);
BoostersBar.displayName = 'BoostersBar';

interface CandyGridProps {
  board: CandyCell[];
  activeIndex: number;
  selected: number | null;
  hintMove: HintMove;
  streak: number;
  colorblindMode: boolean;
  reducedMotion: boolean;
  isInteractionDisabled: boolean;
  gridStyle: React.CSSProperties;
  cellSize: number;
  containerRef: React.RefObject<HTMLDivElement>;
  gridCellRefs: React.MutableRefObject<Array<HTMLButtonElement | null>>;
  onFocusCell: (index: number) => void;
  onDragStart: (index: number, event: React.DragEvent<HTMLButtonElement>) => void;
  onDrop: (index: number) => void;
  onDragEnd: () => void;
  onPointerDown: (index: number, event: React.PointerEvent<HTMLButtonElement>) => void;
  onPointerMove: (event: React.PointerEvent<HTMLButtonElement>) => void;
  onPointerUp: (event: React.PointerEvent<HTMLButtonElement>) => void;
  onClickCell: (index: number) => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => void;
  comboBanner: ComboBanner | null;
  particleBursts: ParticleBurst[];
}

const CandyGrid = React.memo(
  ({
    board,
    activeIndex,
    selected,
    hintMove,
    streak,
    colorblindMode,
    reducedMotion,
    isInteractionDisabled,
    gridStyle,
    cellSize,
    containerRef,
    gridCellRefs,
    onFocusCell,
    onDragStart,
    onDrop,
    onDragEnd,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onClickCell,
    onKeyDown,
    comboBanner,
    particleBursts,
  }: CandyGridProps) => (
    <div className="flex flex-1 flex-col items-center gap-4">
      <div
        ref={containerRef}
        className="relative rounded-3xl border border-cyan-500/20 bg-slate-950/60 p-4 shadow-[0_0_40px_rgba(8,145,178,0.35)] backdrop-blur-lg"
      >
        <LayoutGroup>
          <div className="relative">
            <div
              className="grid gap-2"
              style={gridStyle}
              role="grid"
              aria-label="Kali Crush grid"
              aria-rowcount={BOARD_WIDTH}
              aria-colcount={BOARD_WIDTH}
              aria-describedby="candy-crush-instructions"
              onKeyDown={onKeyDown}
            >
              {board.map((cell, index) => {
                const gem = getGem(cell.gem);
                const row = Math.floor(index / BOARD_WIDTH) + 1;
                const col = (index % BOARD_WIDTH) + 1;
                const hinted = Boolean(hintMove && (hintMove[0] === index || hintMove[1] === index));
                const isActive = activeIndex === index;
                return (
                  <motion.button
                    ref={(el) => {
                      gridCellRefs.current[index] = el;
                    }}
                    key={cell.id}
                    type="button"
                    layout
                    role="gridcell"
                    aria-selected={selected === index}
                    tabIndex={isActive ? 0 : -1}
                    draggable={!isInteractionDisabled}
                    disabled={isInteractionDisabled}
                    onFocus={() => onFocusCell(index)}
                    onDragStart={(event) => onDragStart(index, event)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      onDrop(index);
                    }}
                    onDragEnd={onDragEnd}
                    onPointerDown={(event) => onPointerDown(index, event)}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerCancel={onPointerUp}
                    onClick={() => onClickCell(index)}
                    aria-label={`${gem.label} gem at row ${row}, column ${col}`}
                    whileHover={{ scale: isInteractionDisabled || reducedMotion ? 1 : 1.05 }}
                    whileTap={{ scale: isInteractionDisabled || reducedMotion ? 1 : 0.92 }}
                    className={`relative flex items-center justify-center overflow-hidden rounded-xl border bg-slate-900/60 transition duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
                      selected === index
                        ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-slate-950'
                        : hinted
                        ? 'ring-2 ring-amber-300/70 ring-offset-2 ring-offset-slate-950'
                        : isActive
                        ? 'border-cyan-300/60'
                        : 'hover:shadow-[0_0_14px_rgba(56,189,248,0.35)]'
                    }`}
                    style={{ width: cellSize, height: cellSize }}
                  >
                    <GemSprite
                      cell={cell}
                      gem={gem}
                      streak={streak}
                      colorblindMode={colorblindMode}
                      reducedMotion={reducedMotion}
                    />
                  </motion.button>
                );
              })}
            </div>
            <AnimatePresence>
              {comboBanner && (
                <motion.div
                  key={comboBanner.id}
                  initial={{ opacity: 0, y: -24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -24 }}
                  transition={reducedMotion ? { duration: 0 } : { duration: 0.35, ease: 'easeOut' }}
                  className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 rounded-full border border-cyan-400/60 bg-slate-900/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-cyan-100 shadow-[0_0_18px_rgba(14,165,233,0.35)]"
                >
                  Combo x{comboBanner.chain}! +{comboBanner.points}
                </motion.div>
              )}
            </AnimatePresence>
            <div className="pointer-events-none absolute inset-0">
              {particleBursts.map((burst) => (
                <Fragment key={burst.id}>
                  {burst.positions.map((index, particleIndex) => {
                    const row = Math.floor(index / BOARD_WIDTH);
                    const col = index % BOARD_WIDTH;
                    const gem = getGem(burst.colors[particleIndex] ?? GEM_IDS[0]);
                    const left = col * (cellSize + gridGap) + cellSize / 2;
                    const top = row * (cellSize + gridGap) + cellSize / 2;
                    return (
                      <motion.span
                        key={`${burst.id}-${index}`}
                        initial={{ scale: 0, opacity: 0.8 }}
                        animate={
                          reducedMotion ? { scale: 1, opacity: 0 } : { scale: [0, 1, 0.4], opacity: [0.8, 0.6, 0] }
                        }
                        transition={
                          reducedMotion ? { duration: 0.3 } : { duration: 0.9, ease: 'easeOut', times: [0, 0.4, 1] }
                        }
                        className="absolute h-3 w-3 rounded-full"
                        style={{
                          left,
                          top,
                          transform: 'translate(-50%, -50%)',
                          background: `radial-gradient(circle, ${gem.highlight} 0%, ${gem.accent} 60%, transparent 100%)`,
                          boxShadow: `0 0 12px ${gem.glow}aa`,
                        }}
                      />
                    );
                  })}
                </Fragment>
              ))}
            </div>
          </div>
        </LayoutGroup>
      </div>
      <p id="candy-crush-instructions" className="sr-only">
        Use arrow keys to move around the grid. Press Enter or Space to select a gem, then press Enter on an adjacent gem to
        swap. Swipe on touch devices to swap. Press Escape to clear selection. Press H for a hint, 1 for Shuffle, 2 for Color
        Bomb, P to pause, M to mute, and R to restart the level.
      </p>
      <p className="text-xs text-cyan-300/70">
        Drag, tap, or swipe adjacent gems to swap. Keyboard: arrows, Enter, Esc, H hint, 1 shuffle, 2 color bomb, P pause, M
        mute, R restart.
      </p>
    </div>
  ),
);
CandyGrid.displayName = 'CandyGrid';

interface EndScreenProps {
  showEndScreen: boolean;
  levelComplete: boolean;
  onNextLevel: () => void;
  onRetry: () => void;
}

const EndScreen = React.memo(({ showEndScreen, levelComplete, onNextLevel, onRetry }: EndScreenProps) => (
  <AnimatePresence>
    {showEndScreen && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="pointer-events-auto absolute inset-0 z-20 flex items-center justify-center rounded-3xl bg-slate-950/85 backdrop-blur-xl"
        role="dialog"
        aria-modal="true"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.92, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 160, damping: 18 }}
          className="w-full max-w-md rounded-3xl border border-cyan-500/30 bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 p-6 text-center text-cyan-100 shadow-[0_0_32px_rgba(8,47,73,0.55)]"
        >
          <h3 className="text-xl font-semibold uppercase tracking-[0.35em] text-cyan-200">
            {levelComplete ? 'Level Secured' : 'Mission Failed'}
          </h3>
          <p className="mt-3 text-sm text-cyan-200/80">
            {levelComplete
              ? 'Your breach streak paid off. Advance to the next objective?'
              : 'The defense grid held. Recharge boosters and strike again.'}
          </p>
          <div className="mt-6 flex flex-col gap-3">
            {levelComplete ? (
              <button
                type="button"
                onClick={onNextLevel}
                className="rounded-lg border border-emerald-500/40 bg-emerald-500/20 px-4 py-2 font-semibold text-emerald-100 shadow-[0_0_18px_rgba(16,185,129,0.45)] transition hover:bg-emerald-500/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              >
                Advance Level
              </button>
            ) : (
              <button
                type="button"
                onClick={onRetry}
                className="rounded-lg border border-rose-500/40 bg-rose-500/20 px-4 py-2 font-semibold text-rose-100 shadow-[0_0_18px_rgba(244,63,94,0.45)] transition hover:bg-rose-500/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              >
                Retry Level
              </button>
            )}
            <button
              type="button"
              onClick={onRetry}
              className="rounded-lg border border-cyan-500/40 bg-slate-900/70 px-4 py-2 font-semibold text-cyan-100 shadow-[0_0_18px_rgba(8,47,73,0.45)] transition hover:border-cyan-300/60 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
              Reset Level
            </button>
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
));
EndScreen.displayName = 'EndScreen';

const CandyCrush = () => {
  const reducedMotion = useReducedMotion();
  const rngRef = useRef(() => Math.random());
  const [board, setBoard] = useState<CandyCell[]>(() =>
    createPlayableBoard(BOARD_WIDTH, GEM_IDS, rngRef.current),
  );
  const [cellSize, setCellSize] = useState(DEFAULT_CELL_SIZE);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [moves, setMoves] = useState(0);
  const [movesLeft, setMovesLeft] = useState(MOVES_PER_LEVEL);
  const [level, setLevel] = useState(1);
  const [targetScore, setTargetScore] = useState(() => computeTargetScore(1));
  const [message, setMessage] = useState('Match three gems to ignite the cascade.');
  const [selected, setSelected] = useState<number | null>(null);
  const [boosters, setBoosters] = useState<BoosterState>(() => ({ ...initialBoosters }));
  const [paused, setPaused] = useState(false);
  const [lastCascade, setLastCascade] = useState<CascadeSummary | null>(null);
  const [comboBanner, setComboBanner] = useState<ComboBanner | null>(null);
  const [particleBursts, setParticleBursts] = useState<ParticleBurst[]>([]);
  const [levelComplete, setLevelComplete] = useState(false);
  const [levelFailed, setLevelFailed] = useState(false);
  const [showEndScreen, setShowEndScreen] = useState(false);
  const [colorblindMode, setColorblindMode] = usePersistentState(
    'candy-crush:colorblind',
    false,
    isBoolean,
  );
  const [showCoachmark, setShowCoachmark] = usePersistentState(
    'candy-crush:coachmark-v1',
    true,
    isBoolean,
  );
  const dragSource = useRef<number | null>(null);
  const cascadeSource = useRef<'auto' | 'player'>('auto');
  const started = useRef(false);
  const needsResolve = useRef(false);
  const burstTimers = useRef<number[]>([]);
  const gridContainerRef = useRef<HTMLDivElement | null>(null);
  const pointerStart = useRef<{ index: number; x: number; y: number; pointerId: number } | null>(null);
  const gridCellRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const hintTimeout = useRef<number | null>(null);
  const { bestScore, bestStreak, updateStats } = useCandyCrushStats();
  const [muted, setMuted] = usePersistentState('candy-crush:muted', false, isBoolean);
  const [activeIndex, setActiveIndex] = useState(0);
  const [hintMove, setHintMove] = useState<HintMove>(null);

  const playTone = useCallback(
    (frequency: number, duration = 0.35) => {
      if (muted || typeof window === 'undefined') return;
      try {
        const ctx = getAudioContext();
        const now = ctx.currentTime;
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(frequency, now);
        oscillator.connect(gain);
        gain.connect(ctx.destination);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.22, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
        oscillator.start(now);
        oscillator.stop(now + duration + 0.05);
      } catch (error) {
        // Ignore AudioContext errors in environments without audio support.
      }
    },
    [muted],
  );

  const playMatchSound = useCallback(() => playTone(760, 0.3), [playTone]);
  const playFailSound = useCallback(() => playTone(220, 0.25), [playTone]);

  const queueBurst = useCallback((burst: ParticleBurst) => {
    setParticleBursts((prev) => [...prev, burst]);
    if (typeof window !== 'undefined') {
      const timer = window.setTimeout(() => {
        setParticleBursts((prev) => prev.filter((item) => item.id !== burst.id));
        burstTimers.current = burstTimers.current.filter((value) => value !== timer);
      }, 900);
      burstTimers.current.push(timer);
    }
  }, []);

  useEffect(
    () => () => {
      if (typeof window === 'undefined') return;
      burstTimers.current.forEach((timer) => window.clearTimeout(timer));
      burstTimers.current = [];
    },
    [],
  );

  useEffect(
    () => () => {
      if (typeof window === 'undefined') return;
      if (hintTimeout.current) {
        window.clearTimeout(hintTimeout.current);
        hintTimeout.current = null;
      }
    },
    [],
  );

  const stats = useMemo(
    () => [
      { label: 'Level', value: level },
      { label: 'Score', value: score },
      { label: 'Target', value: targetScore },
      { label: 'Moves Used', value: moves },
      { label: 'Moves Left', value: Math.max(movesLeft, 0) },
      { label: 'Streak', value: streak },
      { label: 'Best Score', value: bestScore },
      { label: 'Best Streak', value: bestStreak },
    ],
    [bestScore, bestStreak, level, moves, movesLeft, score, streak, targetScore],
  );

  useEffect(() => {
    updateStats(score, streak);
  }, [score, streak, updateStats]);

  useEffect(() => {
    const target = gridCellRefs.current[activeIndex];
    if (target && target !== document.activeElement) {
      target.focus();
    }
  }, [activeIndex]);

  useEffect(() => {
    const container = gridContainerRef.current;
    if (!container || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      const padding = 32;
      const next = computeCellSize(
        Math.max(0, width - padding * 2),
        Math.max(0, height - padding * 2),
        BOARD_WIDTH,
        gridGap,
        MIN_CELL_SIZE,
        MAX_CELL_SIZE,
      );
      setCellSize((prev) => (prev === next ? prev : next));
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!comboBanner) return;
    const timer = setTimeout(() => setComboBanner(null), 1600);
    return () => clearTimeout(timer);
  }, [comboBanner]);

  useEffect(() => {
    if ((levelComplete && showEndScreen) || levelFailed) return;
    if (score >= targetScore && started.current) {
      setLevelComplete(true);
      setShowEndScreen(true);
      setPaused(true);
      setMessage('Objective complete. Celebrate the breach!');
    }
  }, [score, targetScore, levelComplete, showEndScreen, levelFailed]);

  useEffect(() => {
    if (movesLeft > 0 || levelComplete || levelFailed) return;
    if (score < targetScore) {
      setLevelFailed(true);
      setShowEndScreen(true);
      setPaused(true);
      setMessage('Out of moves. Deploy boosters or try again.');
    }
  }, [movesLeft, levelComplete, levelFailed, score, targetScore]);

  const step = useCallback(() => {
    if (!needsResolve.current) return;
    needsResolve.current = false;

    let cascadeDetails: {
      totalPoints: number;
      cleared: number;
      chain: number;
      positions: number[];
      colors: GemId[];
      triggeredByPlayer: boolean;
    } | null = null;

    setBoard((current) => {
      const result = resolveBoard(current, BOARD_WIDTH, GEM_IDS, rngRef.current);
      if (result.cascades.length === 0) {
        return current;
      }
      const totalPoints = result.cascades.reduce(
        (total, cascade, index) => total + scoreCascade(cascade, index + 1),
        0,
      );
      const uniquePositions = Array.from(
        new Set(result.cascades.flatMap((cascade) => cascade.matches.flat())),
      );
      cascadeDetails = {
        totalPoints,
        cleared: result.cleared,
        chain: result.cascades.length,
        positions: uniquePositions,
        colors: uniquePositions.map((index) => current[index]?.gem ?? GEM_IDS[0]),
        triggeredByPlayer: cascadeSource.current === 'player',
      };
      return result.board;
    });

    if (!cascadeDetails) {
      return;
    }

    const { chain, cleared, totalPoints, positions, colors, triggeredByPlayer } = cascadeDetails;

    const shouldAnnounce = triggeredByPlayer || started.current;

    if (totalPoints > 0 && shouldAnnounce) {
      setScore((prev) => prev + totalPoints);
      setLastCascade({ chain, cleared, points: totalPoints, positions });
      setMessage(
        chain > 1
          ? `Chain x${chain}! Cleared ${cleared} gems (+${totalPoints}).`
          : `Cleared ${cleared} gems (+${totalPoints}).`,
      );
      setComboBanner({ id: `${Date.now()}-${chain}`, chain, points: totalPoints });
      queueBurst({ id: `${Date.now()}-${Math.random()}`, positions, colors });
      playMatchSound();
    }

    if (triggeredByPlayer && totalPoints > 0) {
      setStreak((prev) => prev + 1);
    }

    cascadeSource.current = 'auto';
  }, [playMatchSound, queueBurst]);

  useGameLoop(step, !paused);

  const isInteractionDisabled = paused || levelComplete || levelFailed || showEndScreen;

  const clearHint = useCallback(() => {
    if (typeof window !== 'undefined' && hintTimeout.current) {
      window.clearTimeout(hintTimeout.current);
      hintTimeout.current = null;
    }
    setHintMove(null);
  }, []);

  const regenerateBoard = useCallback(
    (nextMessage: string) => {
      setBoard(createPlayableBoard(BOARD_WIDTH, GEM_IDS, rngRef.current));
      setSelected(null);
      setActiveIndex(0);
      clearHint();
      setLastCascade(null);
      setComboBanner(null);
      setParticleBursts([]);
      setMessage(nextMessage);
    },
    [clearHint],
  );

  const attemptSwap = useCallback(
    (from: number, to: number) => {
      if (isInteractionDisabled) return;
      if (!isAdjacent(from, to, BOARD_WIDTH)) {
        setSelected(to);
        setMessage('Choose an adjacent gem to swap.');
        return;
      }

      let matched = false;
      let shouldBuzz = false;

      setBoard((current) => {
        const next = swapCandies(current, from, to);
        const matches = findMatches(next, BOARD_WIDTH);
        if (matches.length === 0) {
          shouldBuzz = true;
          return current;
        }
        matched = true;
        cascadeSource.current = 'player';
        needsResolve.current = true;
        return next;
      });

      setSelected(null);

      if (!matched) {
        setStreak(0);
        setMessage('No match. Streak reset.');
        if (shouldBuzz) playFailSound();
        return;
      }

      started.current = true;
      setMoves((prev) => prev + 1);
      setMovesLeft((prev) => Math.max(0, prev - 1));
      setMessage('Match found! Cascade incoming.');
    },
    [isInteractionDisabled, playFailSound],
  );

  const handleCellClick = useCallback(
    (index: number) => {
      if (isInteractionDisabled) return;
      clearHint();
      if (selected === null) {
        setSelected(index);
        setMessage('Select an adjacent gem to swap.');
        return;
      }
      if (selected === index) {
        setSelected(null);
        return;
      }
      attemptSwap(selected, index);
    },
    [attemptSwap, clearHint, isInteractionDisabled, selected],
  );

  const handleDragStart = useCallback(
    (index: number, event?: React.DragEvent<HTMLButtonElement>) => {
      if (isInteractionDisabled) return;
      dragSource.current = index;
      setActiveIndex(index);
      clearHint();
      setSelected(index);
      if (event?.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move';
      }
    },
    [clearHint, isInteractionDisabled],
  );

  const handleDrop = useCallback(
    (index: number) => {
      if (isInteractionDisabled) return;
      if (dragSource.current === null) return;
      attemptSwap(dragSource.current, index);
      dragSource.current = null;
    },
    [attemptSwap, isInteractionDisabled],
  );

  const handleDragEnd = useCallback(() => {
    dragSource.current = null;
    setSelected(null);
  }, []);

  const handlePointerDown = useCallback(
    (index: number, event: React.PointerEvent<HTMLButtonElement>) => {
      if (event.pointerType === 'mouse' || isInteractionDisabled) return;
      pointerStart.current = { index, x: event.clientX, y: event.clientY, pointerId: event.pointerId };
      event.currentTarget.setPointerCapture(event.pointerId);
      setActiveIndex(index);
      clearHint();
      setSelected(index);
    },
    [clearHint, isInteractionDisabled],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      const start = pointerStart.current;
      if (!start || start.pointerId !== event.pointerId || isInteractionDisabled) return;

      const dx = event.clientX - start.x;
      const dy = event.clientY - start.y;
      const threshold = 18;
      if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return;

      const dir =
        Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : -1) : dy > 0 ? BOARD_WIDTH : -BOARD_WIDTH;
      const target = start.index + dir;

      pointerStart.current = null;
      event.currentTarget.releasePointerCapture(event.pointerId);

      if (target < 0 || target >= board.length) return;
      attemptSwap(start.index, target);
    },
    [attemptSwap, board.length, isInteractionDisabled],
  );

  const handlePointerUp = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    const start = pointerStart.current;
    if (!start || start.pointerId !== event.pointerId) return;
    pointerStart.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  }, []);

  const handleShuffle = useCallback(() => {
    if (isInteractionDisabled) return;
    let allowed = false;
    setBoosters((prev) => {
      if (prev.shuffle === 0) return prev;
      allowed = true;
      return { ...prev, shuffle: prev.shuffle - 1 };
    });
    if (!allowed) {
      setMessage('No shuffle boosters remaining.');
      return;
    }
    started.current = true;
    cascadeSource.current = 'player';
    setBoard((current) => shuffleBoard(current, rngRef.current));
    needsResolve.current = true;
    setMoves((prev) => prev + 1);
    setMovesLeft((prev) => Math.max(0, prev - 1));
    clearHint();
    setMessage('Grid reconfigured. Seek new breaches.');
  }, [clearHint, isInteractionDisabled]);

  const handleColorBomb = useCallback(() => {
    if (isInteractionDisabled) return;
    let allowed = false;
    setBoosters((prev) => {
      if (prev.colorBomb === 0) return prev;
      allowed = true;
      return { ...prev, colorBomb: prev.colorBomb - 1 };
    });
    if (!allowed) {
      setMessage('No color bombs available.');
      return;
    }

    let removed = 0;
    let cascadePositions: number[] = [];
    let detonatedColor: GemId | null = null;
    setBoard((current) => {
      const result = detonateColorBomb(current, BOARD_WIDTH, GEM_IDS, rngRef.current);
      removed = result.removed;
      detonatedColor = result.color;
      if (removed > 0) {
        cascadePositions = current
          .map((cell, index) => (cell?.gem === result.color ? index : null))
          .filter((index): index is number => index !== null);
      }
      if (removed > 0) {
        cascadeSource.current = 'player';
        started.current = true;
        needsResolve.current = true;
        return result.board;
      }
      return current;
    });

    if (removed === 0) {
      setMessage('Color bomb fizzled—no gems cleared.');
      return;
    }

    const bonus = removed * 12;
    setScore((prev) => prev + bonus);
    setMoves((prev) => prev + 1);
    setMovesLeft((prev) => Math.max(0, prev - 1));
    clearHint();
    setMessage(`Color bomb cleared ${removed} gems (+${bonus}).`);
    setLastCascade({ chain: 1, cleared: removed, points: bonus, positions: cascadePositions });
    queueBurst({
      id: `${Date.now()}-bomb`,
      positions: cascadePositions,
      colors: cascadePositions.map(() => detonatedColor ?? GEM_IDS[0]),
    });
    playMatchSound();
  }, [clearHint, isInteractionDisabled, playMatchSound, queueBurst]);

  const resetBoardState = useCallback(
    (nextLevel: boolean) => {
      setBoard(createPlayableBoard(BOARD_WIDTH, GEM_IDS, rngRef.current));
      setScore(0);
      setStreak(0);
      setMoves(0);
      setMovesLeft(MOVES_PER_LEVEL);
      setBoosters({ ...initialBoosters });
      setSelected(null);
      setActiveIndex(0);
      clearHint();
      setLastCascade(null);
      setComboBanner(null);
      setParticleBursts([]);
      setPaused(false);
      setShowEndScreen(false);
      setLevelFailed(false);
      setLevelComplete(false);
      cascadeSource.current = 'auto';
      started.current = false;
      setMessage(nextLevel ? 'New objective loaded. Chain the hacks!' : 'New grid ready. Match three gems!');
    },
    [clearHint],
  );

  const handleReset = useCallback(() => {
    setLevel(1);
    setTargetScore(computeTargetScore(1));
    resetBoardState(false);
  }, [resetBoardState]);

  const handleNextLevel = useCallback(() => {
    setLevel((prev) => {
      const nextLevel = prev + 1;
      setTargetScore(computeTargetScore(nextLevel));
      resetBoardState(true);
      return nextLevel;
    });
  }, [resetBoardState]);

  const handleRetryLevel = useCallback(() => {
    setTargetScore(computeTargetScore(level));
    resetBoardState(false);
  }, [level, resetBoardState]);

  const handlePause = useCallback(() => {
    if (levelComplete || levelFailed) return;
    setPaused(true);
    clearHint();
    setMessage('Game paused.');
  }, [clearHint, levelComplete, levelFailed]);

  const handleResume = useCallback(() => {
    if (showEndScreen) return;
    setPaused(false);
    setMessage('Game resumed.');
  }, [showEndScreen]);

  const handleToggleSound = useCallback(
    (nextMuted: boolean) => {
      setMuted(nextMuted);
      setMessage(nextMuted ? 'Sound muted.' : 'Sound on.');
    },
    [setMuted],
  );

  const toggleColorblind = useCallback(() => {
    setColorblindMode((prev) => !prev);
    setMessage(colorblindMode ? 'Standard palette enabled.' : 'Colorblind palette enabled.');
  }, [colorblindMode, setColorblindMode]);

  const handleHint = useCallback(() => {
    if (isInteractionDisabled) return;
    const hint = findFirstPossibleMove(board, BOARD_WIDTH);
    if (!hint) {
      regenerateBoard('No moves detected. Rebooting the grid.');
      return;
    }
    clearHint();
    setHintMove(hint);
    setActiveIndex(hint[0]);
    setMessage('Hint: swap the highlighted gems to start a cascade.');
    if (typeof window !== 'undefined') {
      hintTimeout.current = window.setTimeout(() => {
        setHintMove(null);
        hintTimeout.current = null;
      }, 1400);
    }
  }, [board, clearHint, isInteractionDisabled, regenerateBoard]);

  const handleGridKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const key = event.key;
      const size = board.length;
      if (size === 0) return;

      const row = Math.floor(activeIndex / BOARD_WIDTH);
      const col = activeIndex % BOARD_WIDTH;
      let nextIndex = activeIndex;

      if (key === 'ArrowRight') {
        event.preventDefault();
        nextIndex = Math.min(size - 1, row * BOARD_WIDTH + Math.min(BOARD_WIDTH - 1, col + 1));
      } else if (key === 'ArrowLeft') {
        event.preventDefault();
        nextIndex = Math.max(0, row * BOARD_WIDTH + Math.max(0, col - 1));
      } else if (key === 'ArrowUp') {
        event.preventDefault();
        nextIndex = Math.max(0, (row - 1) * BOARD_WIDTH + col);
      } else if (key === 'ArrowDown') {
        event.preventDefault();
        nextIndex = Math.min(size - 1, (row + 1) * BOARD_WIDTH + col);
      } else if (key === 'Enter' || key === ' ') {
        event.preventDefault();
        if (isInteractionDisabled) return;
        clearHint();
        handleCellClick(activeIndex);
        return;
      } else if (key === 'Escape') {
        event.preventDefault();
        setSelected(null);
        clearHint();
        return;
      } else if (key === 'h' || key === 'H') {
        event.preventDefault();
        handleHint();
        return;
      } else if (key === 'p' || key === 'P') {
        event.preventDefault();
        if (showEndScreen) return;
        paused ? handleResume() : handlePause();
        return;
      } else if (key === 'm' || key === 'M') {
        event.preventDefault();
        handleToggleSound(!muted);
        return;
      } else if (key === 'r' || key === 'R') {
        event.preventDefault();
        handleRetryLevel();
        return;
      } else if (key === '1') {
        event.preventDefault();
        handleShuffle();
        return;
      } else if (key === '2') {
        event.preventDefault();
        handleColorBomb();
        return;
      }

      if (nextIndex !== activeIndex) {
        setActiveIndex(nextIndex);
      }
    },
    [
      activeIndex,
      board.length,
      clearHint,
      handleCellClick,
      handleHint,
      handleShuffle,
      handleColorBomb,
      handlePause,
      handleResume,
      handleRetryLevel,
      handleToggleSound,
      isInteractionDisabled,
      muted,
      paused,
      showEndScreen,
    ],
  );

  useEffect(() => {
    if (isInteractionDisabled) return;
    if (!hasPossibleMoves(board, BOARD_WIDTH)) {
      regenerateBoard('No possible moves left. Shuffling to a safe grid.');
    }
  }, [board, isInteractionDisabled, regenerateBoard]);

  const gridStyle = useMemo(
    () => ({
      gridTemplateColumns: `repeat(${BOARD_WIDTH}, ${cellSize}px)`,
      gridAutoRows: `${cellSize}px`,
    }),
    [cellSize],
  );

  const scoreProgress = targetScore > 0 ? Math.min(1, score / targetScore) * 100 : 0;
  const movesProgress = Math.min(1, (MOVES_PER_LEVEL - movesLeft) / MOVES_PER_LEVEL) * 100;

  const statusLabel = levelFailed
    ? 'Level Failed'
    : levelComplete
    ? 'Level Clear'
    : paused
    ? 'Paused'
    : 'Active';

  const statusTheme = levelFailed
    ? 'border-rose-500/50 bg-rose-500/10 text-rose-200 shadow-[0_0_18px_rgba(244,63,94,0.35)]'
    : levelComplete
    ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-100 shadow-[0_0_18px_rgba(16,185,129,0.35)]'
    : paused
    ? 'border-amber-500/50 bg-amber-500/10 text-amber-100 shadow-[0_0_18px_rgba(251,191,36,0.35)]'
    : 'border-cyan-500/60 bg-cyan-500/10 text-cyan-100 shadow-[0_0_18px_rgba(14,165,233,0.35)]';

  return (
    <div className="relative flex flex-col gap-6 rounded-3xl border border-cyan-500/10 bg-gradient-to-br from-slate-950 via-slate-950/85 to-slate-900/90 p-6 text-sm text-cyan-100 shadow-[0_0_32px_rgba(8,47,73,0.45)] backdrop-blur-xl sm:text-base">
      <Overlay
        onPause={handlePause}
        onResume={handleResume}
        muted={muted}
        paused={paused}
        onToggleSound={handleToggleSound}
        onReset={handleRetryLevel}
      />
      <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
        <div className="flex w-full flex-col gap-6 xl:max-w-sm">
          <HudPanel
            statusLabel={statusLabel}
            statusTheme={statusTheme}
            stats={stats}
            message={message}
            lastCascade={lastCascade}
            scoreProgress={scoreProgress}
            movesProgress={movesProgress}
            reducedMotion={Boolean(reducedMotion)}
            showCoachmark={showCoachmark}
            onDismissCoachmark={() => setShowCoachmark(false)}
          />
          <BoostersBar
            boosters={boosters}
            isInteractionDisabled={isInteractionDisabled}
            colorblindMode={colorblindMode}
            onReset={handleReset}
            onHint={handleHint}
            onShuffle={handleShuffle}
            onColorBomb={handleColorBomb}
            onToggleColorblind={toggleColorblind}
          />
        </div>

        <CandyGrid
          board={board}
          activeIndex={activeIndex}
          selected={selected}
          hintMove={hintMove}
          streak={streak}
          colorblindMode={colorblindMode}
          reducedMotion={Boolean(reducedMotion)}
          isInteractionDisabled={isInteractionDisabled}
          gridStyle={gridStyle}
          cellSize={cellSize}
          containerRef={gridContainerRef}
          gridCellRefs={gridCellRefs}
          onFocusCell={setActiveIndex}
          onDragStart={handleDragStart}
          onDrop={handleDrop}
          onDragEnd={handleDragEnd}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onClickCell={(index) => {
            setActiveIndex(index);
            handleCellClick(index);
          }}
          onKeyDown={handleGridKeyDown}
          comboBanner={comboBanner}
          particleBursts={particleBursts}
        />
      </div>
      <EndScreen
        showEndScreen={showEndScreen}
        levelComplete={levelComplete}
        onNextLevel={handleNextLevel}
        onRetry={handleRetryLevel}
      />
    </div>
  );
};

export default CandyCrush;
