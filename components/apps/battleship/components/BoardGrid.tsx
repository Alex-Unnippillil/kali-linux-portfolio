import React from 'react';
import { BOARD_SIZE } from '../../../../apps/games/battleship/ai';

const Splash = ({ color, reduced }: { color: string; reduced: boolean }) => {
  if (reduced) return null;
  return (
    <span
      className={`absolute inset-0 rounded-full pointer-events-none ${color}`}
      style={{ animation: 'ping 0.6s cubic-bezier(0,0,0.2,1) forwards', opacity: 0.5 }}
      aria-hidden="true"
    />
  );
};

const HitMarker = ({ colorblind, reduced }: { colorblind: boolean; reduced: boolean }) => (
  <div className="pointer-events-none absolute inset-0 z-10">
    <Splash color={colorblind ? 'bg-blue-500' : 'bg-red-500'} reduced={reduced} />
    <svg
      className="h-full w-full"
      viewBox="0 0 32 32"
      stroke={colorblind ? 'blue' : 'red'}
      strokeWidth="4"
      aria-hidden="true"
    >
      <line x1="4" y1="4" x2="28" y2="28">
        {!reduced && <animate attributeName="stroke-opacity" from="0" to="1" dur="0.2s" fill="freeze" />}
      </line>
      <line x1="28" y1="4" x2="4" y2="28">
        {!reduced && <animate attributeName="stroke-opacity" from="0" to="1" dur="0.2s" fill="freeze" />}
      </line>
    </svg>
  </div>
);

const MissMarker = ({ colorblind, reduced }: { colorblind: boolean; reduced: boolean }) => (
  <div className="pointer-events-none absolute inset-0 z-10">
    <Splash color={colorblind ? 'bg-orange-400' : 'bg-blue-300'} reduced={reduced} />
    <svg
      className="h-full w-full"
      viewBox="0 0 32 32"
      stroke={colorblind ? 'orange' : 'white'}
      strokeWidth="3"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="16" cy="16" r="10" opacity="1">
        {!reduced && <animate attributeName="r" from="0" to="10" dur="0.2s" fill="freeze" />}
        {!reduced && <animate attributeName="stroke-opacity" from="0" to="1" dur="0.2s" fill="freeze" />}
      </circle>
    </svg>
  </div>
);

const ExplosionParticles = ({ colorblind }: { colorblind: boolean }) => (
  <span className="shot-particles" aria-hidden="true">
    {Array.from({ length: 6 }).map((_, idx) => (
      <span
        key={idx}
        className={`particle particle-${idx}`}
        style={{
          background: colorblind ? '#60a5fa' : '#f87171',
        }}
      />
    ))}
  </span>
);

const WaterParticles = () => (
  <span className="shot-particles" aria-hidden="true">
    {Array.from({ length: 6 }).map((_, idx) => (
      <span key={idx} className={`particle particle-${idx}`} style={{ background: '#38bdf8' }} />
    ))}
  </span>
);

const ShotEffect = ({
  outcome,
  colorblind,
  reduced,
}: {
  outcome: 'hit' | 'miss';
  colorblind: boolean;
  reduced: boolean;
}) => {
  if (reduced) {
    return (
      <div
        className={`pointer-events-none absolute inset-0 rounded-lg border-2 ${
          outcome === 'hit' ? 'border-red-400' : 'border-cyan-200'
        } opacity-80`}
        aria-hidden="true"
      />
    );
  }
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <span className="shot-trail" aria-hidden="true" />
      <span className={`shot-impact ${outcome === 'hit' ? 'shot-impact-hit' : 'shot-impact-miss'}`} aria-hidden="true" />
      {outcome === 'hit' ? <ExplosionParticles colorblind={colorblind} /> : <WaterParticles />}
    </div>
  );
};

type ShotEffectItem = {
  id: number;
  outcome: 'hit' | 'miss';
};

type BoardGridProps = {
  board: Array<'ship' | 'hit' | 'miss' | null>;
  cellSize: number;
  label: string;
  isEnemy?: boolean;
  hideInfo?: boolean;
  showHeatmap?: boolean;
  heatmap?: number[];
  heatmapTone?: 'cool' | 'warm';
  selectedTargets?: number[];
  cursorIndex?: number | null;
  onTargetSelect?: (idx: number) => void;
  preview?: { cells: number[]; valid: boolean } | null;
  effects?: Map<number, ShotEffectItem[]>;
  lastShots?: number[];
  sunkCells?: Set<number>;
  colorblind?: boolean;
  reducedMotion?: boolean;
  onPlacementHover?: (x: number, y: number) => void;
  onPlacementLeave?: () => void;
  onPlacementClick?: (x: number, y: number) => void;
  placementCursor?: number | null;
  showPlacementCursor?: boolean;
  showCoordinates?: boolean;
};

const BoardGrid = ({
  board,
  cellSize,
  label,
  isEnemy = false,
  hideInfo = false,
  showHeatmap = false,
  heatmap,
  heatmapTone = 'cool',
  selectedTargets = [],
  cursorIndex,
  onTargetSelect,
  preview,
  effects,
  lastShots = [],
  sunkCells,
  colorblind = false,
  reducedMotion = false,
  onPlacementHover,
  onPlacementLeave,
  onPlacementClick,
  placementCursor,
  showPlacementCursor = false,
  showCoordinates = true,
}: BoardGridProps) => {
  const heatArr = heatmap ?? [];
  const maxHeat = heatArr.length ? Math.max(...heatArr) : 0;
  const letters = Array.from({ length: BOARD_SIZE }, (_, i) => String.fromCharCode(65 + i));

  return (
    <div className="battle-card">
      <div className="board-surface relative border border-cyan-500/20 bg-gradient-to-br from-slate-950/95 via-slate-900/80 to-slate-950/95 p-4">
        <div className="sr-only" aria-live="polite">{label}</div>
        <div className="flex items-start gap-2">
          {showCoordinates ? (
            <div className="flex flex-col gap-[2px] pt-[30px] text-[10px] font-semibold uppercase text-cyan-200/70">
              {Array.from({ length: BOARD_SIZE }, (_, idx) => (
                <div key={idx} style={{ height: cellSize }} className="flex items-center justify-center">
                  {idx + 1}
                </div>
              ))}
            </div>
          ) : null}
          <div>
            {showCoordinates ? (
              <div
                className="grid gap-[2px] pb-2 text-[10px] font-semibold uppercase text-cyan-200/70"
                style={{ gridTemplateColumns: `repeat(${BOARD_SIZE}, ${cellSize}px)` }}
              >
                {letters.map((letter) => (
                  <div key={letter} className="text-center">
                    {letter}
                  </div>
                ))}
              </div>
            ) : null}
            <div
              className="grid relative"
              style={{
                gridTemplateColumns: `repeat(${BOARD_SIZE}, ${cellSize}px)`,
                gridTemplateRows: `repeat(${BOARD_SIZE}, ${cellSize}px)`,
                background: 'linear-gradient(135deg, rgba(15,118,110,0.35), rgba(14,116,144,0.25))',
              }}
              onMouseMove={(event) => {
                if (!onPlacementHover) return;
                const rect = event.currentTarget.getBoundingClientRect();
                const offsetX = event.clientX - rect.left;
                const offsetY = event.clientY - rect.top;
                const x = Math.floor(offsetX / cellSize);
                const y = Math.floor(offsetY / cellSize);
                if (x < 0 || y < 0 || x >= BOARD_SIZE || y >= BOARD_SIZE) {
                  onPlacementLeave?.();
                  return;
                }
                onPlacementHover(x, y);
              }}
              onMouseLeave={onPlacementLeave}
            >
              {board.map((cell, idx) => {
                const heatVal = heatArr[idx];
                const norm = maxHeat ? heatVal / maxHeat : 0;
                const heatColor =
                  showHeatmap && heatVal
                    ? heatmapTone === 'warm'
                      ? `rgba(251,191,36,${norm * 0.7})`
                      : `rgba(56,189,248,${norm * 0.6})`
                    : 'transparent';
                const selectedMark = isEnemy && selectedTargets.includes(idx);
                const hint = preview?.cells?.includes(idx);
                const hintValid = hint && preview?.valid;
                const isSunk = sunkCells?.has(idx);
                const isLastShot = lastShots.includes(idx);
                const isPlacementCursor = showPlacementCursor && placementCursor === idx;
                const effectList = effects?.get(idx) ?? [];
                return (
                  <div
                    key={idx}
                    className="relative border border-ub-dark-grey/60"
                    style={{ width: cellSize, height: cellSize }}
                  >
                    {isEnemy && onTargetSelect && !['hit', 'miss'].includes(cell ?? '') ? (
                      <button
                        type="button"
                        className="h-full w-full"
                        onClick={() => onTargetSelect(idx)}
                        aria-label={`Select target at ${Math.floor(idx / BOARD_SIZE) + 1},${(idx % BOARD_SIZE) + 1}`}
                        aria-pressed={selectedMark}
                      />
                    ) : null}
                    {!isEnemy && onPlacementClick ? (
                      <button
                        type="button"
                        className="absolute inset-0"
                        onClick={() => onPlacementClick(idx % BOARD_SIZE, Math.floor(idx / BOARD_SIZE))}
                        aria-label={`Place ship at ${Math.floor(idx / BOARD_SIZE) + 1},${(idx % BOARD_SIZE) + 1}`}
                      />
                    ) : null}
                    {cell === 'hit' && !hideInfo && <HitMarker colorblind={colorblind} reduced={reducedMotion} />}
                    {cell === 'miss' && !hideInfo && <MissMarker colorblind={colorblind} reduced={reducedMotion} />}
                    <div
                      className="pointer-events-none absolute inset-0"
                      style={{ background: heatColor, zIndex: 0 }}
                      aria-hidden="true"
                    />
                    {hint && (
                      <div
                        className={`pointer-events-none absolute inset-0 ${
                          hintValid ? 'bg-emerald-400/35' : 'bg-rose-500/35'
                        }`}
                        style={{ transition: 'opacity 0.2s ease' }}
                      />
                    )}
                    {selectedMark && (
                      <div className="pointer-events-none absolute inset-0 rounded-md border-2 border-yellow-300/90 bg-yellow-200/30" />
                    )}
                    {isLastShot && (
                      <div className="pointer-events-none absolute inset-0 rounded-md border border-white/50 shadow-[0_0_12px_rgba(255,255,255,0.35)]" />
                    )}
                    {cell === 'hit' && isSunk && (
                      <div className="pointer-events-none absolute inset-0 rounded-md border-2 border-amber-300/80 bg-amber-200/10" />
                    )}
                    {hideInfo && (
                      <div className="absolute inset-0 bg-slate-900" aria-hidden="true" />
                    )}
                    {isEnemy && cursorIndex === idx && (
                      <div className="pointer-events-none absolute inset-0 rounded-md border-2 border-cyan-300/80" />
                    )}
                    {isPlacementCursor && (
                      <div className="pointer-events-none absolute inset-0 rounded-md border border-emerald-200/70 shadow-[0_0_10px_rgba(16,185,129,0.45)]" />
                    )}
                    {effectList.map((effect) => (
                      <ShotEffect
                        key={effect.id}
                        outcome={effect.outcome}
                        colorblind={colorblind}
                        reduced={reducedMotion}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BoardGrid;
