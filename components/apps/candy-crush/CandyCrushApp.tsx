import React, { useEffect, useMemo, useState } from 'react';
import usePersistentState from '../../../hooks/usePersistentState';
import { BoardView } from './ui/BoardView';
import { Hud } from './ui/Hud';
import { LoseModal, RulesModal, WinModal } from './ui/Modals';
import { useInput } from './ui/useInput';
import { createInitialBoard, isAdjacent } from './engine/board';
import { canSwap } from './engine/swap';
import { resolveTurn } from './engine/resolve';
import { objectivesMet, updateObjectives } from './engine/objectives';
import { getLevelById, levels } from './levels/levels';
import type { Coord, GameState, PersistedSettings } from './engine/types';

const isSettings = (value: unknown): value is PersistedSettings =>
  !!value && typeof value === 'object' && 'mute' in (value as Record<string, unknown>);

const defaultSettings: PersistedSettings = {
  mute: false,
  reducedMotion: false,
  unlockedLevel: 1,
  bestScores: {},
};

const initState = (levelId: number): GameState => {
  const level = getLevelById(levelId);
  const seed = Date.now();
  const { board, rngState } = createInitialBoard(level, seed);
  return {
    levelId,
    board,
    movesLeft: level.moves,
    score: 0,
    objectives: level.objectives,
    status: 'idle',
    rngSeed: seed,
    rngState,
    stats: { matches: 0, specialsTriggered: 0, cascades: 0 },
    debugQueue: [],
  };
};

const DEBUG = process.env.NEXT_PUBLIC_DEBUG_CANDY_CRUSH === 'true';

const CandyCrushApp: React.FC = () => {
  const [settings, setSettings] = usePersistentState('kaliOS:candy-crush:settings', defaultSettings, isSettings);
  const [state, setState] = useState<GameState>(() => initState(1));
  const [showRules, setShowRules] = useState(false);

  const level = useMemo(() => getLevelById(state.levelId), [state.levelId]);

  const doReset = (levelId = state.levelId) => setState(initState(levelId));

  const runSwap = (from: Coord, to: Coord) => {
    setState((prev) => {
      if (prev.status === 'resolving' || prev.status === 'paused' || prev.status === 'win' || prev.status === 'lose') return prev;
      if (!isAdjacent(from, to) || !canSwap(prev.board, from, to) || prev.movesLeft <= 0) {
        return { ...prev, selected: to, status: 'selected', lastAction: 'invalid-swap' };
      }
      const outcome = resolveTurn(prev.board, from, to, level.colors, level.spawnWeights ?? {}, prev.rngState + 1);
      const objectives = updateObjectives(prev.objectives, {
        removed: [],
        removedColors: outcome.removedColors,
        scoreDelta: outcome.scoreDelta,
        jellyCleared: outcome.jellyCleared,
        iceCleared: outcome.iceCleared,
      });
      const movesLeft = prev.movesLeft - 1;
      const score = prev.score + outcome.scoreDelta;
      const win = objectivesMet(objectives);
      const lose = !win && movesLeft <= 0;
      return {
        ...prev,
        board: outcome.board,
        score,
        movesLeft,
        objectives,
        status: win ? 'win' : lose ? 'lose' : 'idle',
        selected: undefined,
        lastAction: 'swap-resolved',
        stats: { ...prev.stats, cascades: prev.stats.cascades + outcome.cascades },
        debugQueue: outcome.queue,
        rngState: prev.rngState + 17,
      };
    });
  };

  const { focus, onKeyDown, pointerStart, pointerEnd } = useInput(state.board, runSwap);

  const onCell = (coord: Coord) => {
    setState((prev) => {
      if (prev.status === 'resolving') return prev;
      if (!prev.selected) return { ...prev, selected: coord, status: 'selected' };
      if (prev.selected.r === coord.r && prev.selected.c === coord.c) return { ...prev, selected: undefined, status: 'idle' };
      if (isAdjacent(prev.selected, coord)) {
        runSwap(prev.selected, coord);
        return prev;
      }
      return { ...prev, selected: coord, status: 'selected' };
    });
  };

  useEffect(() => {
    if (state.status === 'win') {
      setSettings({
        ...settings,
        unlockedLevel: Math.max(settings.unlockedLevel, Math.min(levels.length, state.levelId + 1)),
        bestScores: { ...settings.bestScores, [state.levelId]: Math.max(settings.bestScores[state.levelId] ?? 0, state.score) },
      });
    }
  }, [setSettings, settings, state.levelId, state.score, state.status]);

  return (
    <div className="relative h-full w-full overflow-auto bg-gradient-to-b from-slate-800 to-slate-950 p-3 text-slate-100" onKeyDown={(event) => onKeyDown(event, state.selected)} tabIndex={0}>
      <Hud
        level={state.levelId}
        score={state.score}
        movesLeft={state.movesLeft}
        objectives={state.objectives}
        onPause={() => setState((prev) => ({ ...prev, status: prev.status === 'paused' ? 'idle' : 'paused' }))}
        paused={state.status === 'paused'}
        onReset={() => doReset()}
        onRules={() => setShowRules(true)}
      />
      <div className="flex flex-wrap items-start gap-4">
        <div onPointerDown={(e) => {
          const cell = (e.target as HTMLElement).closest('[data-cell]') as HTMLElement | null;
          if (!cell) return;
          const [r, c] = cell.dataset.cell!.split('-').map(Number);
          pointerStart({ r, c });
        }} onPointerUp={(e) => {
          const cell = (e.target as HTMLElement).closest('[data-cell]') as HTMLElement | null;
          if (!cell) return;
          const [r, c] = cell.dataset.cell!.split('-').map(Number);
          pointerEnd({ r, c });
        }}>
          <BoardView board={state.board} selected={state.selected} focused={focus} disabled={state.status === 'paused'} onCell={onCell} />
        </div>
        <div className="min-w-[220px] rounded-xl bg-slate-900/70 p-3 text-xs">
          <p className="font-semibold">Levels</p>
          <div className="mt-2 grid grid-cols-5 gap-1">
            {levels.map((entry) => {
              const locked = entry.id > settings.unlockedLevel;
              return (
                <button key={entry.id} type="button" disabled={locked} className={`rounded px-2 py-1 ${entry.id === state.levelId ? 'bg-cyan-700' : 'bg-slate-700'} disabled:opacity-40`} onClick={() => doReset(entry.id)}>
                  {entry.id}
                </button>
              );
            })}
          </div>
          <div className="mt-3 space-y-1">
            <label className="flex items-center gap-2"><input type="checkbox" aria-label="Mute audio" checked={settings.mute} onChange={(e) => setSettings({ ...settings, mute: e.target.checked })} />Mute</label>
            <label className="flex items-center gap-2"><input type="checkbox" aria-label="Reduced motion" checked={settings.reducedMotion} onChange={(e) => setSettings({ ...settings, reducedMotion: e.target.checked })} />Reduced motion</label>
          </div>
          <button type="button" onClick={() => doReset()} className="mt-3 rounded bg-slate-700 px-2 py-1">Reset board</button>
          {DEBUG && (
            <div className="mt-3 rounded border border-slate-700 p-2">
              <p>Seed: {state.rngSeed}</p>
              <p>Queue size: {state.debugQueue.length}</p>
              <p>Status: {state.status}</p>
            </div>
          )}
        </div>
      </div>
      {showRules && <RulesModal onClose={() => setShowRules(false)} />}
      {state.status === 'win' && <WinModal score={state.score} onNext={() => doReset(Math.min(levels.length, state.levelId + 1))} />}
      {state.status === 'lose' && <LoseModal onRetry={() => doReset()} />}
    </div>
  );
};

export default CandyCrushApp;
