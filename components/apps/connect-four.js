import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import GameLayout from './GameLayout';
import usePrefersReducedMotion from '../../hooks/usePrefersReducedMotion';
import {
  COLS,
  ROWS,
  createEmptyBoard,
  evaluateColumns,
  getBestMove,
  getValidRow,
  getWinningCells,
  isBoardFull,
} from '../../games/connect-four/solver';

const CELL_SIZE = 48;
const GAP = 8;
const SLOT = CELL_SIZE + GAP;
const BOARD_HEIGHT = ROWS * CELL_SIZE + (ROWS - 1) * GAP;
const BOARD_WIDTH = COLS * CELL_SIZE + (COLS - 1) * GAP;
const DISC_SIZE = CELL_SIZE - 10;

const COLORS = {
  red: 'bg-red-500',
  yellow: 'bg-yellow-400',
};
const COLOR_NAMES = {
  red: 'Red',
  yellow: 'Yellow',
};

const STORAGE_SETTINGS = 'connect-four-settings';
const STORAGE_STATS = 'connect-four-stats';

const DEFAULT_SETTINGS = {
  mode: 'ai',
  difficulty: 'medium',
  humanColor: 'red',
  startPlayer: 'red',
  hint: true,
  heatmap: false,
  animation: true,
};

const DEFAULT_STATS = {
  ai: { wins: 0, losses: 0, draws: 0 },
  local: { redWins: 0, yellowWins: 0, draws: 0 },
};

const DIFFICULTY_DEPTH = {
  easy: 2,
  medium: 4,
  hard: 6,
};

const createSnapshot = (state) => ({
  board: state.board.map((row) => [...row]),
  player: state.player,
  winner: state.winner,
  winningCells: state.winningCells
    ? state.winningCells.map((cell) => ({ ...cell }))
    : [],
});

export default function ConnectFour() {
  const [board, setBoard] = useState(createEmptyBoard());
  const [player, setPlayer] = useState('red');
  const [winner, setWinner] = useState(null);
  const [winningCells, setWinningCells] = useState([]);
  const [hoverCol, setHoverCol] = useState(null);
  const [selectedCol, setSelectedCol] = useState(Math.floor(COLS / 2));
  const [animDisc, setAnimDisc] = useState(null);
  const [past, setPast] = useState([]);
  const [future, setFuture] = useState([]);
  const [columnScores, setColumnScores] = useState(Array(COLS).fill(null));
  const [paused, setPaused] = useState(false);
  const [aiThinking, setAiThinking] = useState(false);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [stats, setStats] = useState(DEFAULT_STATS);

  const boardRef = useRef(board);
  const playerRef = useRef(player);
  const winnerRef = useRef(winner);
  const animRef = useRef(animDisc);
  const pausedRef = useRef(paused);
  const pastRef = useRef(past);
  const futureRef = useRef(future);
  const aiTimeoutRef = useRef(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const previousWinnerRef = useRef(null);

  useEffect(() => {
    boardRef.current = board;
  }, [board]);

  useEffect(() => {
    playerRef.current = player;
  }, [player]);

  useEffect(() => {
    winnerRef.current = winner;
  }, [winner]);

  useEffect(() => {
    animRef.current = animDisc;
  }, [animDisc]);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    pastRef.current = past;
  }, [past]);

  useEffect(() => {
    futureRef.current = future;
  }, [future]);

  useEffect(() => {
    try {
      const storedSettings = window.localStorage.getItem(STORAGE_SETTINGS);
      const storedStats = window.localStorage.getItem(STORAGE_STATS);
      if (storedSettings) {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(storedSettings) });
      }
      if (storedStats) {
        setStats({ ...DEFAULT_STATS, ...JSON.parse(storedStats) });
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_SETTINGS, JSON.stringify(settings));
    } catch {
      // ignore storage errors
    }
  }, [settings]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_STATS, JSON.stringify(stats));
    } catch {
      // ignore storage errors
    }
  }, [stats]);

  useEffect(() => {
    if (!prefersReducedMotion) return;
    setSettings((prev) => ({ ...prev, animation: false }));
  }, [prefersReducedMotion]);

  const aiColor = settings.humanColor === 'red' ? 'yellow' : 'red';
  const isHumanTurn = settings.mode === 'local' || player === settings.humanColor;
  const animationEnabled = settings.animation && !prefersReducedMotion;

  const clearAiTimeout = useCallback(() => {
    if (aiTimeoutRef.current) {
      window.clearTimeout(aiTimeoutRef.current);
      aiTimeoutRef.current = null;
    }
  }, []);

  const updateStatusWinner = useCallback((newBoard, color) => {
    const winCells = getWinningCells(newBoard, color);
    if (winCells) {
      setWinner(color);
      setWinningCells(winCells);
      return;
    }
    if (isBoardFull(newBoard)) {
      setWinner('draw');
      setWinningCells([]);
      return;
    }
    setPlayer(color === 'red' ? 'yellow' : 'red');
  }, []);

  const applySnapshot = useCallback((snapshot) => {
    clearAiTimeout();
    setBoard(snapshot.board);
    setPlayer(snapshot.player);
    setWinner(snapshot.winner);
    setWinningCells(snapshot.winningCells);
    setAnimDisc(null);
    setHoverCol(null);
    setAiThinking(false);
  }, [clearAiTimeout]);

  const resetGame = useCallback(() => {
    clearAiTimeout();
    setBoard(createEmptyBoard());
    setPlayer(settings.startPlayer);
    setWinner(null);
    setWinningCells([]);
    setHoverCol(null);
    setSelectedCol(Math.floor(COLS / 2));
    setPast([]);
    setFuture([]);
    setAnimDisc(null);
    setAiThinking(false);
  }, [clearAiTimeout, settings.startPlayer]);

  const isBusy = paused || animDisc;
  const canDrop = (col) =>
    !winner &&
    !isBusy &&
    isHumanTurn &&
    getValidRow(boardRef.current, col) !== -1;

  const placeDisc = useCallback(
    (col, color) => {
      if (
        winnerRef.current ||
        pausedRef.current ||
        animRef.current ||
        getValidRow(boardRef.current, col) === -1
      )
        return;
      if (animationEnabled) {
        const row = getValidRow(boardRef.current, col);
        setAnimDisc({
          col,
          row,
          color,
          y: -SLOT,
          vy: 0,
          target: row * SLOT,
        });
      } else {
        const row = getValidRow(boardRef.current, col);
        if (row === -1) return;
        const newBoard = boardRef.current.map((r) => [...r]);
        newBoard[row][col] = color;
        setBoard(newBoard);
        updateStatusWinner(newBoard, color);
      }
    },
    [animationEnabled, updateStatusWinner],
  );

  const handleMove = useCallback(
    (col) => {
      if (!canDrop(col)) return;
      setPast((prev) => [...prev, createSnapshot({
        board: boardRef.current,
        player: playerRef.current,
        winner: winnerRef.current,
        winningCells,
      })]);
      setFuture([]);
      placeDisc(col, playerRef.current);
    },
    [canDrop, placeDisc, winningCells],
  );

  const undoSteps = useCallback(
    (steps) => {
      if (pausedRef.current || animRef.current) return;
      const currentState = createSnapshot({
        board: boardRef.current,
        player: playerRef.current,
        winner: winnerRef.current,
        winningCells,
      });
      const newPast = [...pastRef.current];
      const newFuture = [...futureRef.current];
      let nextState = currentState;
      let actualSteps = 0;
      while (actualSteps < steps && newPast.length > 0) {
        newFuture.unshift(nextState);
        nextState = newPast.pop();
        actualSteps += 1;
      }
      if (actualSteps === 0) return;
      setPast(newPast);
      setFuture(newFuture);
      applySnapshot(nextState);
    },
    [applySnapshot, winningCells],
  );

  const redoSteps = useCallback(
    (steps) => {
      if (pausedRef.current || animRef.current) return;
      const currentState = createSnapshot({
        board: boardRef.current,
        player: playerRef.current,
        winner: winnerRef.current,
        winningCells,
      });
      const newPast = [...pastRef.current];
      const newFuture = [...futureRef.current];
      let nextState = currentState;
      let actualSteps = 0;
      while (actualSteps < steps && newFuture.length > 0) {
        newPast.push(nextState);
        nextState = newFuture.shift();
        actualSteps += 1;
      }
      if (actualSteps === 0) return;
      setPast(newPast);
      setFuture(newFuture);
      applySnapshot(nextState);
    },
    [applySnapshot, winningCells],
  );

  useEffect(() => {
    if (!settings.heatmap) {
      setColumnScores(Array(COLS).fill(null));
      return;
    }
    setColumnScores(evaluateColumns(board, player));
  }, [board, player, settings.heatmap]);

  useEffect(() => {
    if (!animDisc || paused || !animationEnabled) return;
    let raf;
    const animate = () => {
      setAnimDisc((d) => {
        if (!d) return d;
        let { y, vy, target } = d;
        vy += 1.6;
        y += vy;
        if (y >= target) {
          y = target;
          if (Math.abs(vy) < 1.5) {
            const newBoard = boardRef.current.map((r) => [...r]);
            newBoard[d.row][d.col] = d.color;
            setBoard(newBoard);
            updateStatusWinner(newBoard, d.color);
            return null;
          }
          vy = -vy * 0.45;
        }
        return { ...d, y, vy };
      });
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [animDisc, animationEnabled, paused, updateStatusWinner]);

  useEffect(() => {
    if (!animDisc || animationEnabled || paused) return;
    const newBoard = boardRef.current.map((r) => [...r]);
    newBoard[animDisc.row][animDisc.col] = animDisc.color;
    setBoard(newBoard);
    updateStatusWinner(newBoard, animDisc.color);
    setAnimDisc(null);
  }, [animDisc, animationEnabled, paused, updateStatusWinner]);

  useEffect(() => {
    clearAiTimeout();
    if (
      settings.mode !== 'ai' ||
      winner ||
      animDisc ||
      paused ||
      player !== aiColor
    ) {
      setAiThinking(false);
      return;
    }
    const depth = DIFFICULTY_DEPTH[settings.difficulty] ?? 4;
    const { column } = getBestMove(boardRef.current, depth, aiColor);
    if (column === undefined || getValidRow(boardRef.current, column) === -1) {
      setAiThinking(false);
      return;
    }
    setAiThinking(true);
    aiTimeoutRef.current = window.setTimeout(() => {
      setAiThinking(false);
      placeDisc(column, aiColor);
    }, 350);
    return clearAiTimeout;
  }, [
    aiColor,
    animDisc,
    clearAiTimeout,
    paused,
    placeDisc,
    player,
    settings.difficulty,
    settings.mode,
    winner,
  ]);

  useEffect(() => {
    if (paused) {
      clearAiTimeout();
      setAiThinking(false);
    }
  }, [paused, clearAiTimeout]);

  useEffect(() => () => clearAiTimeout(), [clearAiTimeout]);

  useEffect(() => {
    const previousWinner = previousWinnerRef.current;
    if (winner && winner !== previousWinner) {
      setStats((prev) => {
        const next = { ...prev };
        if (settings.mode === 'ai') {
          if (winner === 'draw') next.ai.draws += 1;
          else if (winner === settings.humanColor) next.ai.wins += 1;
          else next.ai.losses += 1;
        } else if (settings.mode === 'local') {
          if (winner === 'draw') next.local.draws += 1;
          else if (winner === 'red') next.local.redWins += 1;
          else next.local.yellowWins += 1;
        }
        return next;
      });
    }
    previousWinnerRef.current = winner;
  }, [settings.humanColor, settings.mode, winner]);

  useEffect(() => {
    resetGame();
  }, [settings.mode, settings.humanColor, settings.startPlayer, resetGame]);

  const validScores = columnScores.filter((s) => s !== null);
  const minScore = validScores.length ? Math.min(...validScores) : 0;
  const maxScore = validScores.length ? Math.max(...validScores) : 0;
  const getHeatColor = useCallback(
    (score) => {
      if (score == null || maxScore === minScore) return undefined;
      const t = (score - minScore) / (maxScore - minScore);
      const r = Math.round(255 * (1 - t));
      const g = Math.round(255 * t);
      return `rgba(${r}, ${g}, 40, 0.4)`;
    },
    [maxScore, minScore],
  );

  const hintColumn = useMemo(() => {
    if (!settings.hint || winner || !isHumanTurn) return null;
    const depth = DIFFICULTY_DEPTH[settings.difficulty] ?? 4;
    const result = getBestMove(board, depth, player);
    return result.column;
  }, [
    board,
    isHumanTurn,
    player,
    settings.difficulty,
    settings.hint,
    winner,
  ]);

  const statusText = useMemo(() => {
    if (winner === 'draw') return 'Draw game.';
    if (winner) return `${COLOR_NAMES[winner]} wins.`;
    if (paused) return 'Paused.';
    if (settings.mode === 'ai' && player === aiColor) {
      return aiThinking ? 'AI is thinking.' : 'AI is ready.';
    }
    return `${COLOR_NAMES[player]} to move.`;
  }, [aiColor, aiThinking, paused, player, settings.mode, winner]);

  useEffect(() => {
    const handler = (event) => {
      const target = event.target;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        setSelectedCol((col) => (col + COLS - 1) % COLS);
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        setSelectedCol((col) => (col + 1) % COLS);
      }
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleMove(selectedCol);
      }
      if (event.key.toLowerCase() === 'u') {
        event.preventDefault();
        const steps =
          settings.mode === 'ai' && player === settings.humanColor ? 2 : 1;
        undoSteps(steps);
      }
      if (event.key.toLowerCase() === 'r') {
        event.preventDefault();
        resetGame();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [
    handleMove,
    player,
    resetGame,
    selectedCol,
    settings.humanColor,
    settings.mode,
    undoSteps,
  ]);

  const handleUndo = () => {
    const steps =
      settings.mode === 'ai' && player === settings.humanColor ? 2 : 1;
    undoSteps(steps);
  };

  const handleRedo = () => {
    const steps =
      settings.mode === 'ai' && player === settings.humanColor ? 2 : 1;
    redoSteps(steps);
  };

  const settingsPanel = (
    <div className="space-y-3 text-sm text-white">
      <div>
        <p className="text-xs uppercase tracking-wide text-slate-300">Mode</p>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            className={`px-2 py-1 rounded border ${
              settings.mode === 'ai'
                ? 'bg-slate-700 border-slate-500'
                : 'bg-slate-900 border-slate-700'
            }`}
            onClick={() => setSettings((s) => ({ ...s, mode: 'ai' }))}
          >
            vs AI
          </button>
          <button
            type="button"
            className={`px-2 py-1 rounded border ${
              settings.mode === 'local'
                ? 'bg-slate-700 border-slate-500'
                : 'bg-slate-900 border-slate-700'
            }`}
            onClick={() => setSettings((s) => ({ ...s, mode: 'local' }))}
          >
            Local 2P
          </button>
        </div>
      </div>
      {settings.mode === 'ai' && (
        <>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-300">
              Difficulty
            </p>
            <div className="mt-2 flex gap-2">
              {['easy', 'medium', 'hard'].map((level) => (
                <button
                  key={level}
                  type="button"
                  className={`px-2 py-1 rounded border capitalize ${
                    settings.difficulty === level
                      ? 'bg-slate-700 border-slate-500'
                      : 'bg-slate-900 border-slate-700'
                  }`}
                  onClick={() => setSettings((s) => ({ ...s, difficulty: level }))}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-300">
              You play
            </p>
            <div className="mt-2 flex gap-2">
              {['red', 'yellow'].map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`px-2 py-1 rounded border capitalize ${
                    settings.humanColor === color
                      ? 'bg-slate-700 border-slate-500'
                      : 'bg-slate-900 border-slate-700'
                  }`}
                  onClick={() => setSettings((s) => ({ ...s, humanColor: color }))}
                >
                  {COLOR_NAMES[color]}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
      <div>
        <p className="text-xs uppercase tracking-wide text-slate-300">
          Starting Disc
        </p>
        <div className="mt-2 flex gap-2">
          {['red', 'yellow'].map((color) => (
            <button
              key={color}
              type="button"
              className={`px-2 py-1 rounded border capitalize ${
                settings.startPlayer === color
                  ? 'bg-slate-700 border-slate-500'
                  : 'bg-slate-900 border-slate-700'
              }`}
              onClick={() => setSettings((s) => ({ ...s, startPlayer: color }))}
            >
              {COLOR_NAMES[color]}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={settings.hint}
            onChange={(e) => setSettings((s) => ({ ...s, hint: e.target.checked }))}
          />
          Hint column
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={settings.heatmap}
            onChange={(e) =>
              setSettings((s) => ({ ...s, heatmap: e.target.checked }))
            }
          />
          Heatmap
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={settings.animation}
            disabled={prefersReducedMotion}
            onChange={(e) =>
              setSettings((s) => ({ ...s, animation: e.target.checked }))
            }
          />
          Animation
        </label>
        {prefersReducedMotion && (
          <p className="text-xs text-slate-400">
            Animation disabled due to reduced motion preference.
          </p>
        )}
      </div>
      <div className="border-t border-slate-700/70 pt-2 text-xs text-slate-300">
        <p className="font-semibold text-white">Stats</p>
        {settings.mode === 'ai' ? (
          <div className="mt-1 space-y-1">
            <p>Wins: {stats.ai.wins}</p>
            <p>Losses: {stats.ai.losses}</p>
            <p>Draws: {stats.ai.draws}</p>
          </div>
        ) : (
          <div className="mt-1 space-y-1">
            <p>Red wins: {stats.local.redWins}</p>
            <p>Yellow wins: {stats.local.yellowWins}</p>
            <p>Draws: {stats.local.draws}</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <GameLayout
      gameId="connect-four"
      onRestart={resetGame}
      onPauseChange={setPaused}
      settingsPanel={settingsPanel}
    >
      <div className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white p-4 relative">
        <div className="flex flex-col items-center gap-2 mb-3 text-center">
          <p className="text-lg font-semibold">
            {winner === 'draw' && 'Draw!'}
            {winner && winner !== 'draw' && `${COLOR_NAMES[winner]} wins!`}
            {!winner && statusText}
          </p>
          <div className="text-sm text-slate-200">
            {settings.mode === 'ai'
              ? `You: ${COLOR_NAMES[settings.humanColor]} · AI: ${COLOR_NAMES[aiColor]}`
              : 'Local two-player mode'}
          </div>
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className="flex gap-2" role="group" aria-label="Column controls">
            {Array.from({ length: COLS }).map((_, col) => {
              const disabled = !canDrop(col);
              const isSelected = selectedCol === col;
              const isHovered = hoverCol === col;
              const showHint = hintColumn === col;
              return (
                <button
                  key={`col-${col}`}
                  type="button"
                  className={`relative h-10 w-10 rounded-full border transition ${
                    isSelected ? 'border-white' : 'border-slate-600'
                  } ${disabled ? 'opacity-40 cursor-not-allowed' : 'hover:border-white'}`}
                  aria-label={`Drop disc in column ${col + 1}`}
                  disabled={disabled}
                  onClick={() => {
                    setSelectedCol(col);
                    handleMove(col);
                  }}
                  onMouseEnter={() => {
                    setHoverCol(col);
                    setSelectedCol(col);
                  }}
                  onMouseLeave={() => setHoverCol(null)}
                  style={
                    settings.heatmap
                      ? { backgroundColor: getHeatColor(columnScores[col]) }
                      : undefined
                  }
                >
                  {(isHovered || isSelected || showHint) &&
                    !winner &&
                    !isBusy &&
                    isHumanTurn && (
                    <span
                      className={`absolute inset-1 rounded-full ${COLORS[player]} ${
                        showHint ? 'opacity-90' : 'opacity-60'
                      }`}
                    />
                  )}
                  {showHint && (
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-xs text-amber-300">
                      Hint
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <div
            className="relative bg-blue-700 rounded-2xl p-3 shadow-xl"
            onMouseLeave={() => setHoverCol(null)}
          >
            <div
              className="relative"
              role="grid"
              aria-label="Connect Four board"
              style={{ width: BOARD_WIDTH, height: BOARD_HEIGHT }}
            >
              <div
                className="grid"
                style={{
                  gridTemplateColumns: `repeat(${COLS}, ${CELL_SIZE}px)`,
                  gap: `${GAP}px`,
                }}
              >
                {board.map((row, rIdx) =>
                  row.map((cell, cIdx) => (
                    <div
                      key={`${rIdx}-${cIdx}`}
                      role="gridcell"
                      aria-label={`Row ${rIdx + 1} Column ${cIdx + 1}${
                        cell ? ` ${COLOR_NAMES[cell]} disc` : ' empty'
                      }`}
                      className="relative flex items-center justify-center rounded-full bg-blue-600 shadow-inner"
                      style={{
                        width: CELL_SIZE,
                        height: CELL_SIZE,
                        backgroundColor: settings.heatmap
                          ? getHeatColor(columnScores[cIdx])
                          : undefined,
                      }}
                    >
                      <span
                        className={`absolute inset-1 rounded-full ${
                          cell ? COLORS[cell] : 'bg-slate-900/80'
                        } shadow-inner`}
                        style={{ width: DISC_SIZE, height: DISC_SIZE }}
                      />
                    </div>
                  )),
                )}
              </div>
              {winningCells.length === 4 && (
                <svg
                  viewBox={`0 0 ${COLS} ${ROWS}`}
                  className="absolute top-0 left-0 w-full h-full pointer-events-none"
                >
                  <line
                    x1={winningCells[0].c + 0.5}
                    y1={winningCells[0].r + 0.5}
                    x2={winningCells[3].c + 0.5}
                    y2={winningCells[3].r + 0.5}
                    stroke="white"
                    strokeWidth="0.25"
                    strokeLinecap="round"
                  />
                </svg>
              )}
              {animDisc && (
                <div
                  className="absolute"
                  style={{
                    transform: `translateX(${animDisc.col * SLOT}px) translateY(${animDisc.y}px)`,
                    width: CELL_SIZE,
                    height: CELL_SIZE,
                  }}
                >
                  <div
                    className={`rounded-full ${COLORS[animDisc.color]} shadow-lg`}
                    style={{
                      width: DISC_SIZE,
                      height: DISC_SIZE,
                      margin: '4px',
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded disabled:opacity-40"
            onClick={handleUndo}
            disabled={past.length === 0 || isBusy}
          >
            Undo
          </button>
          <button
            type="button"
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded disabled:opacity-40"
            onClick={handleRedo}
            disabled={future.length === 0 || isBusy}
          >
            Redo
          </button>
        </div>
        <div className="sr-only" role="status" aria-live="polite">
          {statusText}
        </div>
      </div>
    </GameLayout>
  );
}
