import React, { useEffect, useMemo, useState } from 'react';
import Draggable from 'react-draggable';
import BoardGrid from './components/BoardGrid';
import GameLayout from './GameLayout';
import { BOARD_SIZE } from '../../../apps/games/battleship/ai';
import useGameControls from '../useGameControls';
import usePrefersReducedMotion from '../../../hooks/usePrefersReducedMotion';
import { consumeGameKey, shouldHandleGameKey } from '../../../utils/gameInput';
import { useBattleshipGame } from './hooks/useBattleshipGame';

const CELL = 32;

const Confetti = ({ reduced }: { reduced: boolean }) => {
  if (reduced) return null;
  return (
    <div className="confetti-field" aria-hidden="true">
      {Array.from({ length: 24 }).map((_, idx) => (
        <span
          key={idx}
          className="confetti-piece"
          style={
            {
              '--offset': `${(idx % 12) * 8}px`,
              '--delay': `${(idx % 6) * 0.12}s`,
              '--duration': `${2 + (idx % 5) * 0.3}s`,
              background: idx % 2 ? '#38bdf8' : '#fbbf24',
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
};

const ResultModal = ({
  type,
  onClose,
  onRestart,
  stats,
  reduced,
}: {
  type: 'victory' | 'defeat';
  onClose: () => void;
  onRestart: () => void;
  stats: any;
  reduced: boolean;
}) => (
  <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
    <div
      role="dialog"
      aria-modal="true"
      className="relative w-full max-w-md overflow-hidden rounded-3xl border border-cyan-400/40 bg-slate-950/95 p-6 shadow-[0_40px_80px_rgba(0,0,0,0.6)]"
    >
      {type === 'victory' ? <Confetti reduced={reduced} /> : null}
      <div className="relative space-y-4 text-center">
        <h2 className="text-3xl font-bold text-white">
          {type === 'victory' ? 'Victory Achieved!' : 'Defeat Recorded'}
        </h2>
        <p className="text-sm text-white/70">
          {type === 'victory'
            ? 'All enemy vessels have been destroyed. Bask in the glory of the fleet!'
            : 'Our hulls are breached. Regroup, rethink, and return fire next time.'}
        </p>
        {stats ? (
          <div className="flex flex-wrap items-center justify-center gap-4 text-white/80">
            <span>
              Wins: <strong className="text-white">{stats.wins}</strong>
            </span>
            <span>
              Losses: <strong className="text-white">{stats.losses}</strong>
            </span>
            <span>
              Shots: <strong className="text-white">{stats.shotsFired}</strong>
            </span>
          </div>
        ) : null}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            className="rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 px-5 py-2 text-sm font-semibold uppercase tracking-wide text-white shadow-lg transition hover:from-emerald-400 hover:to-cyan-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200"
            onClick={() => {
              onRestart();
              onClose();
            }}
          >
            Deploy Again
          </button>
          <button
            type="button"
            className="rounded-full border border-white/20 bg-slate-900/80 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-white/80 transition hover:bg-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
            onClick={onClose}
          >
            Close Briefing
          </button>
        </div>
      </div>
    </div>
  </div>
);

const BattleshipApp = () => {
  const prefersReduced = usePrefersReducedMotion();
  const [isFocused, setIsFocused] = useState(false);
  const {
    settings,
    setDifficulty,
    setNoTouch,
    setSalvo,
    setFog,
    setColorblind,
    setShowGuessHeat,
    setShowAiHeat,
    setMode,
    stats,
    resetStats,
    toast,
    message,
    dismissToast,
    phase,
    battleLog,
    players,
    activePlayer,
    placementPlayer,
    passScreen,
    selectedTargets,
    cursor,
    placementCursor,
    dragHint,
    hoverPreview,
    selectedShipId,
    modal,
    shotEffects,
    guessHeat,
    aiHeat,
    sunkEnemyCells,
    sunkPlayerCells,
    activePlayerState,
    opponentState,
    activeShotLimit,
    placementShipsReady,
    helpStats,
    fleetStatus,
    opponentFleetStatus,
    setSelectedShipId,
    setActiveShipId,
    setHoverPreview,
    setModal,
    setSelectedTargets,
    restart,
    startBattle,
    rotateShip,
    rotateSelectedShip,
    randomize,
    handleDragStart,
    handleDrag,
    handleDragStop,
    placementHover,
    placeSelectedShip,
    toggleTarget,
    fireSelected,
    handlePassScreenReady,
    placeCursorMove,
    battleCursorMove,
    placeAtCursor,
    selectTargetAtCursor,
  } = useBattleshipGame();

  const isHotseat = settings.mode === 'hotseat';
  const turnLabel = isHotseat ? `Player ${activePlayer + 1}` : 'Commander';
  const playerFleetRemaining = fleetStatus.filter((ship) => !ship.sunk).length;
  const opponentFleetRemaining = opponentFleetStatus.filter((ship) => !ship.sunk).length;
  const letters = Array.from({ length: BOARD_SIZE }, (_, idx) => String.fromCharCode(65 + idx));
  const toCoord = (idx: number) => {
    const x = idx % BOARD_SIZE;
    const y = Math.floor(idx / BOARD_SIZE);
    return `${letters[x]}${y + 1}`;
  };
  const formatShots = (shots: number[], board: Array<'ship' | 'hit' | 'miss' | null>) =>
    shots.map((idx) => ({
      idx,
      coord: toCoord(idx),
      outcome: board[idx] === 'hit' ? 'Hit' : 'Miss',
    }));

  useGameControls(
    ({ x, y }: { x: number; y: number }) => {
      if (phase === 'placement') placeCursorMove(x, y);
      if (phase === 'battle') battleCursorMove(x, y);
    },
    'battleship',
    { enabled: isFocused, preventDefault: true, isFocused },
  );

  useEffect(() => {
    if (phase !== 'placement') return;
    const x = placementCursor % BOARD_SIZE;
    const y = Math.floor(placementCursor / BOARD_SIZE);
    placementHover(x, y);
  }, [phase, placementCursor, placementHover]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (!shouldHandleGameKey(event, { isFocused })) return;
      if (phase === 'placement') {
        if (event.key === 'r' || event.key === 'R') {
          consumeGameKey(event);
          rotateSelectedShip();
        }
        if (event.key === 'Enter') {
          consumeGameKey(event);
          placeAtCursor();
        }
        if (event.key === 'Escape') {
          consumeGameKey(event);
          setSelectedShipId(null);
          setActiveShipId(null);
          setHoverPreview(null);
        }
      }
      if (phase === 'battle') {
        if (event.key === 'Enter' || event.key === ' ') {
          consumeGameKey(event);
          selectTargetAtCursor(activeShotLimit);
        }
        if (event.key === 'f' || event.key === 'F') {
          consumeGameKey(event);
          fireSelected();
        }
        if (event.key === 'Escape') {
          consumeGameKey(event);
          setSelectedTargets([]);
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [
    activeShotLimit,
    fireSelected,
    isFocused,
    phase,
    placeAtCursor,
    rotateSelectedShip,
    selectTargetAtCursor,
    setActiveShipId,
    setHoverPreview,
    setSelectedShipId,
    setSelectedTargets,
  ]);

  const effectsByBoard = useMemo(() => {
    const map = { player: new Map<number, { id: number; outcome: 'hit' | 'miss' }[]>(), enemy: new Map() };
    shotEffects.forEach((effect) => {
      const boardKey = map[effect.board];
      if (!boardKey.has(effect.idx)) boardKey.set(effect.idx, []);
      boardKey.get(effect.idx)?.push(effect);
    });
    return map;
  }, [shotEffects]);

  const handleModeChange = (value: string) => {
    setMode(value);
    restart({ modeOverride: value as any });
  };

  const handleResetStats = () => {
    if (typeof window === 'undefined') return;
    const confirmed = window.confirm('Reset all Battleship stats? This cannot be undone.');
    if (confirmed) resetStats();
  };

  const handleFocusCapture = () => setIsFocused(true);

  const handleBlurCapture = (event: React.FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node)) {
      setIsFocused(false);
    }
  };

  return (
    <div
      className="h-full w-full"
      onFocusCapture={handleFocusCapture}
      onBlurCapture={handleBlurCapture}
      tabIndex={0}
    >
      <GameLayout
        difficulty={settings.difficulty}
        onDifficultyChange={(value: string) => {
          setDifficulty(value);
          restart({ diff: value });
        }}
        mode={settings.mode}
        onModeChange={handleModeChange}
        onRestart={() => restart()}
        stats={stats}
        showGuessHeat={settings.showGuessHeat}
        onToggleGuessHeat={(value: boolean) => setShowGuessHeat(value)}
        showAiHeat={settings.showAiHeat}
        onToggleAiHeat={(value: boolean) => setShowAiHeat(value)}
        salvo={settings.salvo}
        onSalvoChange={(value: boolean) => {
          setSalvo(value);
          restart({ salvoMode: value });
        }}
        fog={settings.fog}
        onFogChange={(value: boolean) => setFog(value)}
        noTouch={settings.noTouch}
        onNoTouchChange={(value: boolean) => {
          setNoTouch(value);
          restart({ salvoMode: settings.salvo });
        }}
        colorblind={settings.colorblind}
        onColorblindChange={(value: boolean) => setColorblind(value)}
        toast={toast}
        onDismissToast={dismissToast}
        ships={players[placementPlayer].ships}
        onRotateShip={rotateShip}
        onSelectShip={(id: number) => setSelectedShipId((current) => (current === id ? null : id))}
        selectedShipId={selectedShipId}
        phase={phase}
        battleLog={battleLog}
        onResetStats={handleResetStats}
        helpStats={helpStats}
      >
        <div className="sr-only" role="status" aria-live="polite">
          {message}
        </div>
        {phase === 'done' && (
          <button
            type="button"
            className="rounded-lg bg-cyan-600 px-3 py-2 text-sm font-semibold uppercase tracking-wide shadow-lg transition hover:bg-cyan-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
            onClick={() => restart()}
          >
            Play Again
          </button>
        )}
        {phase === 'placement' && (
          <div className="flex flex-col items-center gap-6 lg:flex-row">
            <div
              className="relative rounded-[1.5rem] border border-cyan-500/30 bg-slate-950/70 p-4 shadow-[0_20px_45px_rgba(0,0,0,0.45)]"
              style={{ width: BOARD_SIZE * CELL + 32, height: BOARD_SIZE * CELL + 32 }}
            >
              <div className="absolute left-4 top-4">
                <span className="rounded-full bg-cyan-500/30 px-3 py-1 text-xs uppercase tracking-wide text-cyan-100">
                  Deployment Grid — Player {placementPlayer + 1}
                </span>
              </div>
              <div className="absolute inset-4">
                <BoardGrid
                  board={players[placementPlayer].board}
                  cellSize={CELL}
                  label="Deployment grid"
                  hideInfo={false}
                  preview={dragHint || hoverPreview}
                  effects={effectsByBoard.player}
                  colorblind={settings.colorblind}
                  reducedMotion={prefersReduced}
                  onPlacementHover={(x, y) => placementHover(x, y)}
                  onPlacementLeave={() => setHoverPreview(null)}
                  onPlacementClick={(x, y) => placeSelectedShip(x, y)}
                  placementCursor={placementCursor}
                  showPlacementCursor
                />
                {players[placementPlayer].ships.map((ship) => (
                  <Draggable
                    key={ship.id}
                    grid={[CELL, CELL]}
                    position={{ x: ship.x * CELL, y: ship.y * CELL }}
                    onStart={(e, data) => {
                      handleDragStart(ship.id);
                      handleDrag(ship.id, Math.round(data.x / CELL), Math.round(data.y / CELL));
                    }}
                    onDrag={(e, data) => handleDrag(ship.id, Math.round(data.x / CELL), Math.round(data.y / CELL))}
                    onStop={(e, data) => handleDragStop(ship.id, Math.round(data.x / CELL), Math.round(data.y / CELL))}
                    disabled={phase !== 'placement'}
                  >
                    <div
                      className={`ship-draggable ${selectedShipId === ship.id ? 'ship-selected' : ''}`}
                      aria-hidden="true"
                      style={{
                        width: (ship.dir === 0 ? ship.len : 1) * CELL,
                        height: (ship.dir === 1 ? ship.len : 1) * CELL,
                        background: 'linear-gradient(135deg, rgba(14,165,233,0.85), rgba(29,78,216,0.7))',
                        borderRadius: '12px',
                        boxShadow: '0 20px 35px rgba(14,165,233,0.35)',
                        transition: 'transform 0.25s ease, box-shadow 0.25s ease',
                        outline: selectedShipId === ship.id ? '2px solid rgba(165,243,252,0.9)' : 'none',
                      }}
                      onDoubleClick={() => rotateShip(ship.id)}
                    />
                  </Draggable>
                ))}
              </div>
            </div>
            <div className="flex w-full max-w-xs flex-col gap-3 rounded-2xl border border-cyan-400/20 bg-slate-950/60 p-4 shadow-[0_20px_45px_rgba(0,0,0,0.45)]">
              <button
                type="button"
                className="w-full rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 px-4 py-2 text-sm font-semibold uppercase tracking-wide shadow-lg transition hover:from-cyan-400 hover:to-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
                onClick={randomize}
              >
                Randomize Fleet
              </button>
              <button
                type="button"
                className="w-full rounded-xl border border-cyan-300/40 bg-slate-900/80 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-cyan-200 transition hover:bg-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                onClick={startBattle}
                disabled={!placementShipsReady}
              >
                Begin Battle
              </button>
              <button
                type="button"
                className="w-full rounded-xl border border-white/20 bg-slate-900/60 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white/70 transition hover:bg-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
                onClick={rotateSelectedShip}
              >
                Rotate Selected Ship (R)
              </button>
              <p className="text-xs text-white/60">
                Tap a ship to select it, then tap the grid to place. Drag-and-drop still works on desktop.
              </p>
            </div>
          </div>
        )}
        {phase !== 'placement' && (
          <div className="flex flex-col items-center gap-6">
            <div className="w-full max-w-5xl rounded-2xl border border-cyan-400/20 bg-slate-950/70 p-4 text-xs text-white/80">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-cyan-200/80">Turn</p>
                  <p className="text-sm font-semibold text-white">{turnLabel}</p>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-white/60">Your fleet</p>
                    <p className="text-sm font-semibold text-white">{playerFleetRemaining} ships remaining</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-white/60">Enemy fleet</p>
                    <p className="text-sm font-semibold text-white">{opponentFleetRemaining} ships remaining</p>
                  </div>
                </div>
              </div>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-cyan-200/80">Your ships</p>
                  <ul className="mt-1 flex flex-wrap gap-2">
                    {fleetStatus.map((ship) => (
                      <li
                        key={ship.id}
                        className={`rounded-full px-2 py-1 text-[10px] uppercase tracking-wide ${
                          ship.sunk ? 'bg-rose-500/30 text-rose-100 line-through' : 'bg-emerald-500/20 text-emerald-200'
                        }`}
                      >
                        {ship.name}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-cyan-200/80">Enemy ships</p>
                  <ul className="mt-1 flex flex-wrap gap-2">
                    {opponentFleetStatus.map((ship) => (
                      <li
                        key={ship.id}
                        className={`rounded-full px-2 py-1 text-[10px] uppercase tracking-wide ${
                          ship.sunk ? 'bg-amber-500/30 text-amber-100' : 'bg-white/10 text-white/70'
                        }`}
                      >
                        {ship.sunk ? `${ship.name} sunk` : `${ship.name} unknown`}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-cyan-200/80">Your last salvo</p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {opponentState.lastShots.length ? (
                      formatShots(opponentState.lastShots, opponentState.board).map((shot) => (
                        <span
                          key={`shot-${shot.idx}`}
                          className={`rounded-full px-2 py-1 text-[10px] uppercase tracking-wide ${
                            shot.outcome === 'Hit'
                              ? 'bg-rose-500/30 text-rose-100'
                              : 'bg-sky-500/20 text-sky-100'
                          }`}
                        >
                          {shot.coord} {shot.outcome}
                        </span>
                      ))
                    ) : (
                      <span className="text-[10px] text-white/60">No shots yet.</span>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-cyan-200/80">
                    Incoming fire
                  </p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {activePlayerState.lastShots.length ? (
                      formatShots(activePlayerState.lastShots, activePlayerState.board).map((shot) => (
                        <span
                          key={`incoming-${shot.idx}`}
                          className={`rounded-full px-2 py-1 text-[10px] uppercase tracking-wide ${
                            shot.outcome === 'Hit'
                              ? 'bg-amber-500/30 text-amber-100'
                              : 'bg-white/10 text-white/70'
                          }`}
                        >
                          {shot.coord} {shot.outcome}
                        </span>
                      ))
                    ) : (
                      <span className="text-[10px] text-white/60">No shots yet.</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-6 lg:flex-row">
              <div className="rounded-[1.5rem] border border-cyan-500/30 bg-slate-950/70 p-4 shadow-[0_20px_45px_rgba(0,0,0,0.45)]">
                <div className="mb-3 flex items-center justify-between text-xs uppercase tracking-wide text-cyan-200/80">
                  <span>Your Fleet</span>
                  {isHotseat ? <span>Player {activePlayer + 1}</span> : null}
                </div>
                <BoardGrid
                  board={activePlayerState.board}
                  cellSize={CELL}
                  label="Your fleet"
                  hideInfo={settings.fog && phase === 'battle'}
                  showHeatmap={settings.showAiHeat && settings.mode === 'ai'}
                  heatmap={aiHeat}
                  heatmapTone="warm"
                  effects={effectsByBoard.player}
                  lastShots={activePlayerState.lastShots}
                  sunkCells={sunkPlayerCells}
                  colorblind={settings.colorblind}
                  reducedMotion={prefersReduced}
                />
              </div>
              <div className="rounded-[1.5rem] border border-cyan-500/30 bg-slate-950/70 p-4 shadow-[0_20px_45px_rgba(0,0,0,0.45)]">
                <div className="mb-3 text-xs uppercase tracking-wide text-cyan-200/80">Enemy Waters</div>
                <BoardGrid
                  board={opponentState.board}
                  cellSize={CELL}
                  label="Enemy waters"
                  isEnemy
                  showHeatmap={settings.showGuessHeat && settings.mode === 'ai'}
                  heatmap={guessHeat}
                  heatmapTone="cool"
                  selectedTargets={selectedTargets}
                  cursorIndex={cursor}
                  onTargetSelect={(idx) => toggleTarget(idx, activeShotLimit)}
                  effects={effectsByBoard.enemy}
                  lastShots={opponentState.lastShots}
                  sunkCells={sunkEnemyCells}
                  colorblind={settings.colorblind}
                  reducedMotion={prefersReduced}
                />
              </div>
            </div>
            {phase === 'battle' && (
              <div className="flex flex-col items-center gap-2">
                <div className="text-sm text-white/80">
                  Selected {selectedTargets.length}/{activeShotLimit}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className="rounded-xl bg-gradient-to-br from-rose-500 to-orange-500 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-white shadow-lg transition hover:from-rose-400 hover:to-orange-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-200 disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={fireSelected}
                    disabled={!selectedTargets.length}
                  >
                    Fire Salvo (F)
                  </button>
                  <button
                    type="button"
                    className="rounded-xl border border-white/20 bg-slate-900/70 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-white/70 transition hover:bg-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={() => setSelectedTargets([])}
                    disabled={!selectedTargets.length}
                  >
                    Clear Selection (Esc)
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </GameLayout>

      {passScreen && isHotseat ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-6 text-center">
          <div className="max-w-md rounded-3xl border border-cyan-400/40 bg-slate-950/90 p-6 text-white shadow-[0_30px_60px_rgba(0,0,0,0.6)]">
            <h2 className="text-2xl font-semibold">Pass the device</h2>
            <p className="mt-2 text-sm text-white/70">
              Player {phase === 'placement' ? placementPlayer + 1 : activePlayer + 1}, take control when ready.
            </p>
            <button
              type="button"
              className="mt-4 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 px-6 py-2 text-sm font-semibold uppercase tracking-wide shadow-lg transition hover:from-cyan-400 hover:to-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
              onClick={handlePassScreenReady}
            >
              Ready
            </button>
          </div>
        </div>
      ) : null}

      {modal ? (
        <ResultModal
          type={modal}
          onClose={() => setModal(null)}
          onRestart={() => restart()}
          stats={stats}
          reduced={prefersReduced}
        />
      ) : null}

      <style jsx global>{`
        .ship-draggable {
          transition: transform 0.25s cubic-bezier(0.22, 0.61, 0.36, 1);
          will-change: transform;
        }
        .ship-draggable.ship-selected {
          z-index: 10;
        }
        .ship-draggable:active {
          cursor: grabbing;
        }
        .shot-trail {
          position: absolute;
          width: 6px;
          height: 120%;
          background: linear-gradient(to bottom, rgba(255,255,255,0.9), rgba(59,130,246,0));
          border-radius: 9999px;
          animation: shotTrail 0.35s ease forwards;
        }
        .shot-impact {
          position: absolute;
          width: 48px;
          height: 48px;
          border-radius: 9999px;
          opacity: 0;
          transform: scale(0.4);
        }
        .shot-impact-hit {
          background: radial-gradient(circle, rgba(248,113,113,0.95), rgba(127,29,29,0.1));
          animation: shotImpactHit 0.6s ease forwards;
        }
        .shot-impact-miss {
          background: radial-gradient(circle, rgba(96,165,250,0.9), rgba(2,132,199,0.1));
          animation: shotImpactMiss 0.6s ease forwards;
        }
        .shot-particles {
          position: absolute;
          inset: 0;
          display: block;
        }
        .shot-particles .particle {
          position: absolute;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          opacity: 0;
          animation: particleBurst 0.7s ease forwards;
        }
        .shot-particles .particle-0 { top: 50%; left: 50%; }
        .shot-particles .particle-1 { top: 35%; left: 60%; }
        .shot-particles .particle-2 { top: 65%; left: 40%; }
        .shot-particles .particle-3 { top: 30%; left: 40%; }
        .shot-particles .particle-4 { top: 70%; left: 60%; }
        .shot-particles .particle-5 { top: 50%; left: 30%; }
        .confetti-field {
          pointer-events: none;
          position: absolute;
          inset: 0;
        }
        .confetti-piece {
          position: absolute;
          top: -20px;
          left: var(--offset);
          width: 6px;
          height: 16px;
          border-radius: 2px;
          animation: confettiFall var(--duration) linear var(--delay) infinite;
        }
        @keyframes shotTrail {
          0% { transform: translateY(-120%) scaleY(0.3); opacity: 0.8; }
          100% { transform: translateY(0) scaleY(1); opacity: 0; }
        }
        @keyframes shotImpactHit {
          0% { transform: scale(0.4); opacity: 0; }
          40% { transform: scale(1); opacity: 1; }
          100% { transform: scale(1.2); opacity: 0; }
        }
        @keyframes shotImpactMiss {
          0% { transform: scale(0.3); opacity: 0; }
          60% { transform: scale(0.9); opacity: 0.8; }
          100% { transform: scale(1); opacity: 0; }
        }
        @keyframes particleBurst {
          0% { transform: translate3d(0,0,0) scale(0.5); opacity: 1; }
          100% { transform: translate3d(var(--dx, 12px), var(--dy, -18px), 0) scale(0.1); opacity: 0; }
        }
        .shot-particles .particle-0 { --dx: 12px; --dy: -20px; }
        .shot-particles .particle-1 { --dx: -10px; --dy: -14px; }
        .shot-particles .particle-2 { --dx: 14px; --dy: -4px; }
        .shot-particles .particle-3 { --dx: -14px; --dy: -6px; }
        .shot-particles .particle-4 { --dx: 8px; --dy: -18px; }
        .shot-particles .particle-5 { --dx: -6px; --dy: -16px; }
        @keyframes confettiFall {
          0% { transform: translate3d(0, -10px, 0) rotate(0deg); opacity: 1; }
          100% { transform: translate3d(0, 160px, 0) rotate(540deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default BattleshipApp;
