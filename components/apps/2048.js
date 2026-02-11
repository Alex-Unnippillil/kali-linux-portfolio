import { useEffect, useCallback, useState, useRef, useMemo } from 'react';
import usePersistentState from '../../hooks/usePersistentState';
import useOPFS from '../../hooks/useOPFS.js';
import GameLayout, { useInputRecorder } from './GameLayout';
import useGameControls from './useGameControls';
import { vibrate } from './Games/common/haptics';
import {
  reset as resetRng,
  serialize as serializeRng,
  deserialize as deserializeRng,
} from '../../apps/games/rng';
import { step, canMove, getHighestTile } from '../../apps/games/_2048/logic';
import { useSettings } from '../../hooks/useSettings';
import usePrefersReducedMotion from '../../hooks/usePrefersReducedMotion';
import GameShell from '../games/GameShell';
import useIsTouchDevice from '../../hooks/useIsTouchDevice';
import { consumeGameKey, shouldHandleGameKey } from '../../utils/gameInput';

/**
 * 2048 desktop app architecture:
 * - Canonical engine: apps/games/_2048/logic.ts (move/merge/spawn + transition metadata).
 * - Persistence schema: keeps legacy keys and mirrors an aggregate snapshot at `2048-state:v2`.
 * - Animation phases: move(140ms) -> merge/spawn pop(120ms), reduced motion disables movement transitions.
 * - Hint/coach uses 2048.worker.js which calls apps/games/_2048/ai.ts; failures degrade gracefully.
 */

const SIZE = 4;
const UNDO_LIMIT = 5;
const STORAGE_V2 = '2048-state:v2';
const MOVE_MS = 140;
const POP_MS = 120;

export const setSeed = (seed) => resetRng(seed);

const validateBoard = (b) =>
  Array.isArray(b) && b.length === SIZE && b.every((row) => Array.isArray(row) && row.length === SIZE && row.every((n) => typeof n === 'number'));

const baseColors = {
  2: 'bg-gradient-to-br from-amber-100 via-amber-200 to-amber-300 text-slate-900', 4: 'bg-gradient-to-br from-amber-200 via-amber-300 to-amber-400 text-slate-900',
  8: 'bg-gradient-to-br from-orange-300 via-orange-400 to-orange-500 text-white', 16: 'bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600 text-white',
  32: 'bg-gradient-to-br from-rose-400 via-rose-500 to-rose-600 text-white', 64: 'bg-gradient-to-br from-rose-500 via-rose-600 to-rose-700 text-white',
  128: 'bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500 text-slate-900', 256: 'bg-gradient-to-br from-lime-300 via-lime-400 to-lime-500 text-slate-900',
  512: 'bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-600 text-white', 1024: 'bg-gradient-to-br from-teal-500 via-teal-600 to-teal-700 text-white',
  2048: 'bg-gradient-to-br from-cyan-500 via-blue-500 to-indigo-600 text-white',
};
const SKINS = { classic: baseColors, colorblind: baseColors, neon: baseColors };
const MILESTONES = [256, 512, 1024, 2048, 4096];

const boardKey = (r, c) => `${r}-${c}`;
const cloneBoard = (b) => b.map((row) => [...row]);

const initBoard = (hardMode = false) => {
  const board = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
  const spawned = step(board, 'ArrowLeft', { hardMode, spawnCount: 2 });
  return spawned.board;
};

const BoardBackground = () => (
  <div className="grid h-full w-full grid-cols-4 auto-rows-fr gap-2 sm:gap-3" aria-hidden="true">
    {Array.from({ length: 16 }, (_, i) => <div key={i} className="rounded-xl border border-slate-800/60 bg-slate-900/40" />)}
  </div>
);

const TileLayer = ({ board, hiddenCells, mergeCells, glowCells, colors, highContrast, symbols }) => (
  <div className="pointer-events-none absolute inset-4 grid grid-cols-4 auto-rows-fr gap-2 sm:gap-3" role="grid" aria-label="2048 board">
    {board.map((row, rIdx) => row.map((cell, cIdx) => {
      const key = boardKey(rIdx, cIdx);
      const isHidden = hiddenCells.has(key);
      return (
        <div key={key} role="gridcell" data-value={cell} className={`relative flex aspect-square items-center justify-center rounded-xl border border-white/5 text-2xl font-bold shadow-[0_18px_35px_rgba(15,23,42,0.55)] ${cell ? (colors[cell] || 'bg-slate-700/80 text-slate-100') : 'bg-transparent text-transparent shadow-none'} ${isHidden ? 'opacity-0' : ''} ${mergeCells.has(key) ? 'tile-merge' : ''} ${glowCells.has(key) ? 'tile-glow' : ''}`}>
          {highContrast && cell !== 0 && <span aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center text-4xl text-white/60">{symbols[cell] || ''}</span>}
          <span className="relative z-10">{cell || ''}</span>
          {mergeCells.has(key) && <span className="merge-ripple" />}
        </div>
      );
    }))}
  </div>
);

const MovingTiles = ({ tiles, phase, colors }) => (
  <div className="pointer-events-none absolute inset-4" aria-hidden="true">
    {tiles.map((tile, idx) => {
      const left = `${tile.from.c * 25}%`;
      const top = `${tile.from.r * 25}%`;
      const dx = (tile.to.c - tile.from.c) * 100;
      const dy = (tile.to.r - tile.from.r) * 100;
      return (
        <div
          key={`${tile.from.r}-${tile.from.c}-${idx}-${tile.value}`}
          className={`absolute w-1/4 p-1 sm:p-1.5 ${phase ? 'tile-moving-active' : 'tile-moving-idle'}`}
          style={{ left, top, transform: `translate(${phase ? dx : 0}%, ${phase ? dy : 0}%)`, transitionDuration: `${MOVE_MS}ms` }}
        >
          <div className={`flex aspect-square items-center justify-center rounded-xl border border-white/5 text-2xl font-bold shadow-[0_18px_35px_rgba(15,23,42,0.55)] ${colors[tile.value] || 'bg-slate-700/80 text-slate-100'}`}>{tile.value}</div>
        </div>
      );
    })}
  </div>
);

const Game2048 = ({ windowMeta } = {}) => {
  const isFocused = windowMeta?.isFocused ?? true;
  const isTouch = useIsTouchDevice();
  const prefersReducedMotion = usePrefersReducedMotion();
  const [seed, setSeedState] = usePersistentState('2048-seed', '', (v) => typeof v === 'string');
  const [board, setBoard] = usePersistentState('2048-board', initBoard, validateBoard);
  const [won, setWon] = usePersistentState('2048-won', false, (v) => typeof v === 'boolean');
  const [keepPlaying, setKeepPlaying] = usePersistentState('2048-keep-playing', false, (v) => typeof v === 'boolean');
  const [lost, setLost] = usePersistentState('2048-lost', false, (v) => typeof v === 'boolean');
  const [history, setHistory] = useState([]);
  const [moves, setMoves] = useState(0);
  const [hardMode, setHardMode] = usePersistentState('2048-hard', false, (v) => typeof v === 'boolean');
  const [skin, setSkin] = usePersistentState('2048-skin', 'classic', (v) => typeof v === 'string');
  const [score, setScore] = usePersistentState('2048-score', 0, (v) => typeof v === 'number');
  const [highScore, setHighScore] = usePersistentState('2048-best-score', 0, (v) => typeof v === 'number');
  const [animCells, setAnimCells] = useState(new Set());
  const [mergeCells, setMergeCells] = useState(new Set());
  const [glowCells, setGlowCells] = useState(new Set());
  const [milestoneValue, setMilestoneValue] = useState(0);
  const [hint, setHint] = useState(null);
  const [coach, setCoach] = usePersistentState('2048-coach', false, (v) => typeof v === 'boolean');
  const [moveScores, setMoveScores] = useState(null);
  const [hintAvailable, setHintAvailable] = useState(true);
  const [bestMap, setBestMap, bestReady] = useOPFS('2048-best.json', {});
  const [best, setBest] = useState(0);
  const [undosLeft, setUndosLeft] = useState(UNDO_LIMIT);
  const [paused, setPaused] = useState(false);
  const [movingTiles, setMovingTiles] = useState([]);
  const [motionPhase, setMotionPhase] = useState(false);
  const [renderBoard, setRenderBoard] = useState(board);
  const [hiddenCells, setHiddenCells] = useState(new Set());

  const workerRef = useRef(null);
  const timeoutRef = useRef([]);
  const animatingRef = useRef(false);
  const { highContrast } = useSettings();
  const { record } = useInputRecorder();

  const highestTile = useMemo(() => getHighestTile(board), [board]);
  const today = typeof window !== 'undefined' ? new Date().toISOString().slice(0, 10) : '';
  const colors = SKINS[skin] || baseColors;

  const clearTimers = useCallback(() => {
    timeoutRef.current.forEach((id) => clearTimeout(id));
    timeoutRef.current = [];
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_V2);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && validateBoard(parsed.board)) {
        setBoard(parsed.board);
        if (typeof parsed.score === 'number') setScore(parsed.score);
        if (typeof parsed.moves === 'number') setMoves(parsed.moves);
        if (typeof parsed.won === 'boolean') setWon(parsed.won);
        if (typeof parsed.keepPlaying === 'boolean') setKeepPlaying(parsed.keepPlaying);
      }
    } catch {
      // fall back to existing key-by-key storage
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_V2, JSON.stringify({ board, score, moves, won, keepPlaying, lost }));
    } catch {
      // no-op on storage failures
    }
  }, [board, score, moves, won, keepPlaying, lost]);

  useEffect(() => {
    if (typeof Worker !== 'function') {
      setHintAvailable(false);
      return;
    }
    try {
      workerRef.current = new Worker(new URL('./2048.worker.js', import.meta.url));
      workerRef.current.onmessage = (e) => {
        const data = e.data || {};
        if (data.type === 'hint') {
          setHint(data.move || null);
          setHintAvailable(true);
        } else if (data.type === 'score') {
          setMoveScores(data.scores || null);
          setHintAvailable(true);
        } else if (data.type === 'error') {
          setHintAvailable(false);
        }
      };
      workerRef.current.onerror = () => setHintAvailable(false);
    } catch {
      setHintAvailable(false);
    }
    return () => workerRef.current?.terminate();
  }, []);

  useEffect(() => {
    if (!workerRef.current || !hintAvailable) return;
    workerRef.current.postMessage({ type: 'hint', board });
    if (coach) workerRef.current.postMessage({ type: 'score', board });
    else setMoveScores(null);
  }, [board, coach, hintAvailable]);

  useEffect(() => {
    if (!bestReady) return;
    if (!seed) {
      setSeedState(today);
      resetRng(today);
      setBest(bestMap[today] || 0);
      return;
    }
    if (seed !== today) {
      resetRng(today);
      setSeedState(today);
      setBoard(initBoard(hardMode));
      setMoves(0);
      setWon(false);
      setKeepPlaying(false);
      setLost(false);
      setScore(0);
      setUndosLeft(UNDO_LIMIT);
      setBest(bestMap[today] || 0);
      setPaused(false);
    } else {
      resetRng(seed);
      setBest(bestMap[seed] || 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bestReady, seed, hardMode, bestMap]);

  useEffect(() => {
    if (!isFocused) setPaused(true);
  }, [isFocused]);

  const finalizeMove = useCallback((result, priorBoard, prevScore, prevMoves, rngState) => {
    setBoard(result.board);
    setRenderBoard(result.board);
    setHistory((h) => [...h, { board: priorBoard, score: prevScore, moves: prevMoves, rng: rngState }]);
    setScore((s) => s + result.score);
    setMoves((m) => m + 1);
    setAnimCells(new Set(result.spawns.map((s) => boardKey(s.at.r, s.at.c))));
    setMergeCells(new Set(result.merges.map((m) => boardKey(m.to.r, m.to.c))));

    const hi = getHighestTile(result.board);
    if (hi > best) {
      setBest(hi);
      if (bestReady && seed) setBestMap({ ...bestMap, [seed]: hi });
    }
    if (MILESTONES.includes(hi) && hi > milestoneValue) {
      const highlight = new Set();
      result.board.forEach((row, r) => row.forEach((val, c) => { if (val === hi) highlight.add(boardKey(r, c)); }));
      setGlowCells(highlight);
      setMilestoneValue(hi);
    }
    if (!won && hi >= 2048) setWon(true);
    if (!canMove(result.board)) setLost(true);
    if (result.score > 0) vibrate(40);
    if (result.score > 0) setHighScore((h) => Math.max(h, prevScore + result.score));
  }, [best, bestMap, bestReady, milestoneValue, seed, setBestMap, setBoard, setHighScore, setLost, setScore, setWon, won]);

  const handleDirection = useCallback(({ x, y }) => {
    if (!isFocused || paused || lost || (won && !keepPlaying) || animatingRef.current) return;
    record({ x, y });
    const direction = x === -1 ? 'ArrowLeft' : x === 1 ? 'ArrowRight' : y === -1 ? 'ArrowUp' : y === 1 ? 'ArrowDown' : null;
    if (!direction) return;

    const priorBoard = cloneBoard(board);
    const prevScore = score;
    const prevMoves = moves;
    const rngState = serializeRng();
    const result = step(cloneBoard(board), direction, { hardMode });
    if (!result.changed) return;

    clearTimers();
    if (prefersReducedMotion) {
      finalizeMove(result, priorBoard, prevScore, prevMoves, rngState);
      return;
    }

    animatingRef.current = true;
    setRenderBoard(priorBoard);
    setHiddenCells(new Set(result.movedTiles.map((m) => boardKey(m.from.r, m.from.c))));
    setMovingTiles(result.movedTiles);
    setMotionPhase(false);

    requestAnimationFrame(() => setMotionPhase(true));

    const moveDone = setTimeout(() => {
      setMovingTiles([]);
      setHiddenCells(new Set());
      finalizeMove(result, priorBoard, prevScore, prevMoves, rngState);
      const popDone = setTimeout(() => {
        setAnimCells(new Set());
        setMergeCells(new Set());
        animatingRef.current = false;
      }, POP_MS);
      timeoutRef.current.push(popDone);
    }, MOVE_MS);

    timeoutRef.current.push(moveDone);
  }, [board, clearTimers, finalizeMove, hardMode, isFocused, keepPlaying, lost, moves, paused, prefersReducedMotion, record, score, won]);

  useGameControls(handleDirection, '2048', { preventDefault: true, isFocused });

  const reset = useCallback(() => {
    clearTimers();
    animatingRef.current = false;
    resetRng(seed || today);
    const nextBoard = initBoard(hardMode);
    setBoard(nextBoard);
    setRenderBoard(nextBoard);
    setHistory([]);
    setMoves(0);
    setWon(false);
    setKeepPlaying(false);
    setLost(false);
    setScore(0);
    setUndosLeft(UNDO_LIMIT);
    setMovingTiles([]);
    setHiddenCells(new Set());
    setAnimCells(new Set());
    setMergeCells(new Set());
    setGlowCells(new Set());
  }, [clearTimers, hardMode, seed, setBoard, setKeepPlaying, setLost, setScore, setWon, today]);

  const undo = useCallback(() => {
    if (!history.length || undosLeft === 0 || animatingRef.current) return;
    const prev = history[history.length - 1];
    deserializeRng(prev.rng);
    setBoard(cloneBoard(prev.board));
    setRenderBoard(cloneBoard(prev.board));
    setScore(prev.score);
    setMoves(prev.moves);
    setWon(getHighestTile(prev.board) >= 2048);
    setLost(!canMove(prev.board));
    setHistory((h) => h.slice(0, -1));
    setUndosLeft((u) => u - 1);
    setKeepPlaying(false);
  }, [history, undosLeft, setBoard, setKeepPlaying, setScore, setWon, setLost]);

  useEffect(() => {
    const handler = (e) => {
      if (!shouldHandleGameKey(e, { isFocused })) return;
      if (e.key === 'u' || e.key === 'U' || e.key === 'Backspace') { consumeGameKey(e); undo(); }
      if (e.key === 'r' || e.key === 'R') { consumeGameKey(e); reset(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, reset, isFocused]);

  const hintLabel = hint ? hint.replace('Arrow', '') : '—';
  const tileSymbols = { 2: '●', 4: '■', 8: '▲', 16: '◆', 32: '✚', 64: '★', 128: '⬟', 256: '⬢', 512: '⬣', 1024: '⬡', 2048: '✦' };

  return (
    <GameLayout gameId="2048" score={score} highScore={highScore} isFocused={isFocused}>
      <GameShell game="2048" onPause={() => setPaused(true)} onResume={() => setPaused(false)} isFocused={isFocused}
        controls={<div className="flex gap-2"><button onClick={reset} className="rounded-xl bg-slate-800 px-3 py-2">Reset</button><button onClick={undo} disabled={!history.length || undosLeft === 0} className="rounded-xl bg-slate-800 px-3 py-2 disabled:opacity-40">Undo ({undosLeft})</button></div>}
        settings={<div className="space-y-2 text-sm"><label className="flex justify-between"><span>Hard mode</span><input type="checkbox" aria-label="Toggle hard mode" checked={hardMode} onChange={() => setHardMode(!hardMode)} /></label><label className="flex justify-between"><span>Coach overlay</span><input type="checkbox" aria-label="Toggle coach overlay" checked={coach} onChange={() => setCoach(!coach)} /></label><label className="flex justify-between"><span>Skin</span><select aria-label="Tile skin" value={skin} onChange={(e) => setSkin(e.target.value)}>{Object.keys(SKINS).map((k) => <option key={k}>{k}</option>)}</select></label></div>}
      >
        <div className="flex flex-col gap-4 text-slate-100">
          <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-4">
            <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
              <div><p className="text-xs text-slate-400">Score</p><p className="text-2xl font-bold">{score}</p></div>
              <div><p className="text-xs text-slate-400">High score</p><p className="text-2xl font-bold">{highScore}</p></div>
              <div><p className="text-xs text-slate-400">Best tile</p><p className="text-2xl font-bold">{highestTile}</p></div>
              <div><p className="text-xs text-slate-400">Moves</p><p className="text-2xl font-bold">{moves}</p></div>
              <div data-testid="hint-display"><p className="text-xs text-slate-400">Hint</p><p className="text-xl font-semibold">{hintAvailable ? hintLabel : 'Unavailable'}</p></div>
              <div><p className="text-xs text-slate-400">Daily record</p><p className="text-xl font-semibold">{best}</p></div>
            </div>
            {!hintAvailable && <p className="mt-2 text-xs text-amber-300">Hint unavailable.</p>}
          </div>

          <div className="mx-auto w-full max-w-[min(90vw,28rem)]">
            <div className="relative aspect-square rounded-3xl border border-white/5 bg-slate-950/80 p-4">
              <BoardBackground />
              <TileLayer board={renderBoard} hiddenCells={hiddenCells} mergeCells={mergeCells} glowCells={glowCells} colors={colors} highContrast={highContrast} symbols={tileSymbols} />
              {movingTiles.length > 0 && <MovingTiles tiles={movingTiles} phase={motionPhase} colors={colors} />}
              {coach && moveScores && (
                <div className="pointer-events-none absolute inset-0 text-xs font-semibold text-cyan-200">
                  <div className="absolute left-1/2 top-3 -translate-x-1/2">↑ {Math.round(moveScores.ArrowUp || 0)}</div>
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2">↓ {Math.round(moveScores.ArrowDown || 0)}</div>
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">← {Math.round(moveScores.ArrowLeft || 0)}</div>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">→ {Math.round(moveScores.ArrowRight || 0)}</div>
                </div>
              )}
              {(lost || (won && !keepPlaying)) && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-3xl bg-slate-950/85">
                  <p className="text-xl font-semibold">{lost ? 'Game over' : 'You reached 2048!'}</p>
                  {!lost && <button onClick={() => setKeepPlaying(true)} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold">Keep going</button>}
                  <button onClick={reset} className="rounded-lg bg-slate-700 px-3 py-2 text-sm font-semibold">New game</button>
                </div>
              )}
            </div>
          </div>

          {isTouch && (
            <div className="mx-auto grid w-44 grid-cols-3 gap-2">
              <div /><button aria-label="Move up" onPointerDown={() => handleDirection({ x: 0, y: -1 })}>↑</button><div />
              <button aria-label="Move left" onPointerDown={() => handleDirection({ x: -1, y: 0 })}>←</button><button aria-label="Move down" onPointerDown={() => handleDirection({ x: 0, y: 1 })}>↓</button><button aria-label="Move right" onPointerDown={() => handleDirection({ x: 1, y: 0 })}>→</button>
            </div>
          )}
        </div>
      </GameShell>
    </GameLayout>
  );
};

export default Game2048;
