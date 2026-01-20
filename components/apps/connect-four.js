import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import GameLayout from './GameLayout';
import usePersistentState from '../../hooks/usePersistentState';
import usePrefersReducedMotion from '../../hooks/usePrefersReducedMotion';
import { SettingsProvider, useSettings } from './GameSettingsContext';
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

const CELL_SIZE = 40; // Tailwind w-10 / h-10
const GAP = 4; // gap-1
const SLOT = CELL_SIZE + GAP;
const BOARD_WIDTH = COLS * SLOT - GAP;
const BOARD_HEIGHT = ROWS * SLOT - GAP;

const TOKEN_CLASS = {
  red: 'bg-blue-500',
  yellow: 'bg-orange-400',
};

const TOKEN_NAME = {
  red: 'Blue',
  yellow: 'Orange',
};

const opponentOf = (p) => (p === 'red' ? 'yellow' : 'red');

const cloneBoard = (board) => board.map((row) => row.slice());

const depthForDifficulty = (difficulty) => {
  if (difficulty === 'easy') return 2;
  if (difficulty === 'hard') return 6;
  return 4;
};

const isMode = (v) => v === 'cpu' || v === 'local';
const isToken = (v) => v === 'red' || v === 'yellow';
const isBool = (v) => typeof v === 'boolean';

const hintStyle = (score) => {
  if (typeof score !== 'number') return undefined;
  const mag = Math.min(1, Math.abs(score) / 12);
  const alpha = 0.06 + mag * 0.22;
  const color = score >= 0 ? `rgba(34, 197, 94, ${alpha})` : `rgba(239, 68, 68, ${alpha})`;
  return { backgroundColor: color };
};

function ConnectFourInner() {
  const prefersReducedMotion = usePrefersReducedMotion();
  const { difficulty, assists, setDifficulty, setAssists } = useSettings();

  const [mode, setMode] = usePersistentState('connect_four:mode', 'cpu', isMode);
  const [humanToken, setHumanToken] = usePersistentState(
    'connect_four:human_token',
    'yellow',
    isToken,
  );
  const [humanStarts, setHumanStarts] = usePersistentState(
    'connect_four:human_starts',
    true,
    isBool,
  );

  const aiToken = useMemo(() => opponentOf(humanToken), [humanToken]);

  const initialPlayer = useCallback(() => {
    if (mode === 'local') return 'red';
    return humanStarts ? humanToken : aiToken;
  }, [aiToken, humanStarts, humanToken, mode]);

  const [board, setBoard] = useState(() => createEmptyBoard());
  const [currentPlayer, setCurrentPlayer] = useState(() => initialPlayer());
  const [winner, setWinner] = useState(null);
  const [winningCells, setWinningCells] = useState([]);
  const [history, setHistory] = useState([]);

  const [selectedCol, setSelectedCol] = useState(3);
  const [hoverCol, setHoverCol] = useState(null);
  const [hintScores, setHintScores] = useState(() => Array(COLS).fill(null));

  const [animDisc, setAnimDisc] = useState(null);

  const boardRef = useRef(board);
  const currentPlayerRef = useRef(currentPlayer);
  const winnerRef = useRef(winner);
  const winningCellsRef = useRef(winningCells);
  const aiTaskIdRef = useRef(0);

  const animRef = useRef(null);
  const rafRef = useRef(0);
  const lastTimeRef = useRef(null);

  useEffect(() => {
    boardRef.current = board;
  }, [board]);

  useEffect(() => {
    currentPlayerRef.current = currentPlayer;
  }, [currentPlayer]);

  useEffect(() => {
    winnerRef.current = winner;
  }, [winner]);

  useEffect(() => {
    winningCellsRef.current = winningCells;
  }, [winningCells]);

  const cancelAnimation = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    animRef.current = null;
    lastTimeRef.current = null;
    setAnimDisc(null);
  }, []);

  const hardReset = useCallback(() => {
    aiTaskIdRef.current += 1;
    cancelAnimation();
    setBoard(createEmptyBoard());
    setCurrentPlayer(initialPlayer());
    setWinner(null);
    setWinningCells([]);
    setHistory([]);
    setSelectedCol(3);
    setHoverCol(null);
  }, [cancelAnimation, initialPlayer]);

  useEffect(() => {
    // Keep game state consistent when mode or sides are changed.
    hardReset();
  }, [mode, humanToken, humanStarts, hardReset]);

  const commitMove = useCallback((col, row, token) => {
    const prev = boardRef.current;
    const next = cloneBoard(prev);
    next[row][col] = token;

    setBoard(next);

    const win = getWinningCells(next, token);
    if (win) {
      setWinner(token);
      setWinningCells(win);
      return;
    }
    if (isBoardFull(next)) {
      setWinner('draw');
      setWinningCells([]);
      return;
    }

    setWinningCells([]);
    setCurrentPlayer(opponentOf(token));
  }, []);

  const step = useCallback(
    (timestamp) => {
      const anim = animRef.current;
      if (!anim) {
        rafRef.current = 0;
        lastTimeRef.current = null;
        return;
      }

      const last = lastTimeRef.current ?? timestamp;
      const dt = Math.min(0.032, (timestamp - last) / 1000);
      lastTimeRef.current = timestamp;

      const GRAVITY = 5200; // px / s^2
      anim.vy += GRAVITY * dt;
      anim.y += anim.vy * dt;

      if (anim.y >= anim.target) {
        commitMove(anim.col, anim.row, anim.token);
        animRef.current = null;
        setAnimDisc(null);
        rafRef.current = 0;
        lastTimeRef.current = null;
        return;
      }

      setAnimDisc({ col: anim.col, token: anim.token, y: anim.y });
      rafRef.current = requestAnimationFrame(step);
    },
    [commitMove],
  );

  const startDrop = useCallback(
    (col, token) => {
      if (winnerRef.current) return;
      if (animRef.current) return;

      const row = getValidRow(boardRef.current, col);
      if (row === -1) return;

      setHistory((h) => [
        ...h,
        {
          board: cloneBoard(boardRef.current),
          currentPlayer: currentPlayerRef.current,
          winner: winnerRef.current,
          winningCells: winningCellsRef.current,
        },
      ]);

      if (prefersReducedMotion) {
        commitMove(col, row, token);
        return;
      }

      animRef.current = {
        col,
        row,
        token,
        y: -SLOT,
        vy: 0,
        target: row * SLOT,
      };
      setAnimDisc({ col, token, y: -SLOT });
      lastTimeRef.current = null;
      rafRef.current = requestAnimationFrame(step);
    },
    [commitMove, prefersReducedMotion, step],
  );

  const undo = useCallback(() => {
    if (animRef.current) return;

    aiTaskIdRef.current += 1;

    setHistory((h) => {
      if (h.length === 0) return h;

      const popOne = (arr) => {
        const nextArr = arr.slice(0, -1);
        const state = arr[arr.length - 1];
        return { nextArr, state };
      };

      let nextHistory = h;
      let state;

      ({ nextArr: nextHistory, state } = popOne(nextHistory));

      if (mode === 'cpu') {
        while (state && state.currentPlayer !== humanToken && nextHistory.length) {
          ({ nextArr: nextHistory, state } = popOne(nextHistory));
        }
      }

      if (!state) return h;

      cancelAnimation();
      setBoard(state.board);
      setCurrentPlayer(state.currentPlayer);
      setWinner(state.winner);
      setWinningCells(state.winningCells || []);

      return nextHistory;
    });
  }, [cancelAnimation, humanToken, mode]);

  const canInteract =
    !winner &&
    !animDisc &&
    (mode === 'local' || currentPlayer === humanToken);

  const effectiveCol = hoverCol ?? selectedCol;

  const onKeyDown = useCallback(
    (e) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setSelectedCol((c) => (c + COLS - 1) % COLS);
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setSelectedCol((c) => (c + 1) % COLS);
        return;
      }
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (!canInteract) return;
        startDrop(effectiveCol, currentPlayer);
        return;
      }
      if (e.key.toLowerCase() === 'u') {
        e.preventDefault();
        undo();
        return;
      }
      if (e.key.toLowerCase() === 'r') {
        e.preventDefault();
        hardReset();
      }
    },
    [canInteract, currentPlayer, effectiveCol, hardReset, startDrop, undo],
  );

  useEffect(() => {
    if (!assists) {
      setHintScores(Array(COLS).fill(null));
      return;
    }
    setHintScores(evaluateColumns(board, currentPlayer));
  }, [assists, board, currentPlayer]);

  useEffect(() => {
    if (mode !== 'cpu') return;
    if (winner) return;
    if (animRef.current) return;
    if (currentPlayer !== aiToken) return;

    const taskId = aiTaskIdRef.current + 1;
    aiTaskIdRef.current = taskId;

    const depth = depthForDifficulty(difficulty);

    const timer = setTimeout(() => {
      const current = boardRef.current;
      const { column } = getBestMove(current, depth, aiToken);

      if (aiTaskIdRef.current !== taskId) return;
      if (winnerRef.current) return;
      if (animRef.current) return;
      if (currentPlayerRef.current !== aiToken) return;

      startDrop(column, aiToken);
    }, 50);

    return () => clearTimeout(timer);
  }, [aiToken, currentPlayer, difficulty, mode, startDrop, winner]);

  useEffect(() => () => cancelAnimation(), [cancelAnimation]);

  const statusText = useMemo(() => {
    if (winner === 'draw') return 'Draw.';
    if (winner === 'red' || winner === 'yellow') return `${TOKEN_NAME[winner]} wins.`;
    if (mode === 'cpu' && currentPlayer === aiToken) return `${TOKEN_NAME[aiToken]} is thinking...`;
    return `Turn: ${TOKEN_NAME[currentPlayer]}.`;
  }, [aiToken, currentPlayer, mode, winner]);

  const settingsPanel = (
    <div className="space-y-4 text-sm">
      <div>
        <div className="text-xs uppercase tracking-wider text-gray-400">Mode</div>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            className={`px-3 py-1 rounded border ${
              mode === 'cpu' ? 'border-gray-200 text-white' : 'border-gray-600 text-gray-300'
            }`}
            onClick={() => setMode('cpu')}
          >
            vs CPU
          </button>
          <button
            type="button"
            className={`px-3 py-1 rounded border ${
              mode === 'local' ? 'border-gray-200 text-white' : 'border-gray-600 text-gray-300'
            }`}
            onClick={() => setMode('local')}
          >
            2 Players
          </button>
        </div>
      </div>

      <div>
        <div className="text-xs uppercase tracking-wider text-gray-400">Difficulty</div>
        <div className="mt-2 flex gap-2">
          {['easy', 'normal', 'hard'].map((d) => (
            <button
              key={d}
              type="button"
              className={`px-3 py-1 rounded border ${
                difficulty === d ? 'border-gray-200 text-white' : 'border-gray-600 text-gray-300'
              }`}
              onClick={() => setDifficulty(d)}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="text-xs uppercase tracking-wider text-gray-400">Assists</div>
        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            className={`px-3 py-1 rounded border ${
              assists ? 'border-gray-200 text-white' : 'border-gray-600 text-gray-300'
            }`}
            onClick={() => setAssists(!assists)}
          >
            {assists ? 'On' : 'Off'}
          </button>
          <span className="text-xs text-gray-400">Shows column hints.</span>
        </div>
      </div>

      {mode === 'cpu' && (
        <div className="space-y-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-gray-400">You play as</div>
            <div className="mt-2 flex gap-2">
              {['red', 'yellow'].map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`px-3 py-1 rounded border ${
                    humanToken === t
                      ? 'border-gray-200 text-white'
                      : 'border-gray-600 text-gray-300'
                  }`}
                  onClick={() => setHumanToken(t)}
                >
                  {TOKEN_NAME[t]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs uppercase tracking-wider text-gray-400">First move</div>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                className={`px-3 py-1 rounded border ${
                  humanStarts ? 'border-gray-200 text-white' : 'border-gray-600 text-gray-300'
                }`}
                onClick={() => setHumanStarts(true)}
              >
                You
              </button>
              <button
                type="button"
                className={`px-3 py-1 rounded border ${
                  !humanStarts ? 'border-gray-200 text-white' : 'border-gray-600 text-gray-300'
                }`}
                onClick={() => setHumanStarts(false)}
              >
                CPU
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="pt-2 border-t border-gray-700">
        <button type="button" className="px-3 py-1 rounded border border-gray-600" onClick={hardReset}>
          New Game
        </button>
      </div>
    </div>
  );

  const winningSet = useMemo(() => {
    const s = new Set();
    for (const c of winningCells) s.add(`${c.r}:${c.c}`);
    return s;
  }, [winningCells]);

  return (
    <GameLayout gameId="connect-four" onRestart={hardReset} settingsPanel={settingsPanel}>
      <div className="flex flex-col items-center gap-4 p-4 text-white">
        <div className="w-full max-w-lg">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm text-gray-200">{statusText}</div>
              <div className="text-xs text-gray-400">
                {mode === 'cpu' ? `You: ${TOKEN_NAME[humanToken]} | CPU: ${TOKEN_NAME[aiToken]}` : 'Local match'}
              </div>
            </div>
            <div className="text-right text-xs text-gray-400">
              <div>Arrows: select column</div>
              <div>Enter/Space: drop</div>
              <div>U: undo, R: restart</div>
            </div>
          </div>
        </div>

        <div className="sr-only" aria-live="polite">
          {statusText}
        </div>

        <div
          className="outline-none"
          tabIndex={0}
          onKeyDown={onKeyDown}
          aria-label="Connect Four board"
        >
          <div
            className="grid grid-cols-7 gap-1 mb-2"
            style={{ width: BOARD_WIDTH }}
          >
            {Array.from({ length: COLS }, (_, col) => {
              const colFull = getValidRow(board, col) === -1;
              const isSelected = effectiveCol === col;
              const score = hintScores[col];
              const disabled = colFull || !canInteract;

              const labelParts = [`Column ${col + 1}`];
              if (colFull) labelParts.push('Full');
              if (assists && typeof score === 'number') labelParts.push(`Hint score ${Math.round(score)}`);
              const ariaLabel = labelParts.join('. ');

              return (
                <button
                  key={col}
                  type="button"
                  aria-label={ariaLabel}
                  aria-pressed={isSelected}
                  disabled={disabled}
                  onMouseEnter={() => setHoverCol(col)}
                  onMouseLeave={() => setHoverCol(null)}
                  onFocus={() => setHoverCol(col)}
                  onBlur={() => setHoverCol(null)}
                  onClick={() => startDrop(col, currentPlayer)}
                  className={
                    `h-9 w-10 rounded border transition ${
                      disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-gray-200'
                    } ${isSelected ? 'border-cyan-300' : 'border-gray-600'} focus:ring-2 focus:ring-cyan-400`
                  }
                  style={assists ? hintStyle(score) : undefined}
                >
                  <span className="sr-only">Drop</span>
                </button>
              );
            })}
          </div>

          <div
            className="relative bg-ub-cool-grey rounded-xl border border-gray-700 p-2"
            style={{ width: BOARD_WIDTH + 16 }}
          >
            <div
              className="relative grid grid-rows-6 grid-cols-7 gap-1"
              style={{ width: BOARD_WIDTH, height: BOARD_HEIGHT }}
              role="grid"
              aria-rowcount={ROWS}
              aria-colcount={COLS}
            >
              {board.map((row, r) =>
                row.map((cell, c) => {
                  const isWin = winningSet.has(`${r}:${c}`);
                  return (
                    <div
                      key={`${r}-${c}`}
                      className={
                        `w-10 h-10 rounded-full border border-gray-700 flex items-center justify-center ` +
                        `${isWin ? 'ring-2 ring-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.35)]' : ''}`
                      }
                      aria-label={`Row ${r + 1} column ${c + 1}. ${cell ? TOKEN_NAME[cell] : 'Empty'}.`}
                      role="gridcell"
                    >
                      {cell && <div className={`w-8 h-8 rounded-full ${TOKEN_CLASS[cell]}`} />}
                    </div>
                  );
                }),
              )}

              {animDisc && (
                <div
                  className={`absolute w-10 h-10 rounded-full ${TOKEN_CLASS[animDisc.token]} shadow-lg`}
                  style={{
                    left: animDisc.col * SLOT,
                    top: animDisc.y,
                    pointerEvents: 'none',
                  }}
                />
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={undo}
            disabled={history.length === 0 || Boolean(animDisc)}
          >
            Undo
          </button>
          <button
            type="button"
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
            onClick={hardReset}
          >
            Restart
          </button>
        </div>
      </div>
    </GameLayout>
  );
}

export default function ConnectFour() {
  return (
    <SettingsProvider>
      <ConnectFourInner />
    </SettingsProvider>
  );
}
