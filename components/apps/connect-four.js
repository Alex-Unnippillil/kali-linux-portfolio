import React, { useEffect, useState, useCallback, useRef } from 'react';
import GameLayout from './GameLayout';
import { useGameLoop } from './Games/common';
import {
  ROWS,
  COLS,
  createEmptyBoard,
  getValidRow,
  evaluateColumns,
  minimax,
  findWinningCells,
  isBoardFull,
} from '../../games/connect-four/solver';
import { loadStats, recordOutcome, saveStats } from '../../games/connect-four/stats';

const CELL_SIZE = 40; // tailwind h-10 w-10
const GAP = 4; // gap-1 => 4px
const SLOT = CELL_SIZE + GAP;
const BOARD_HEIGHT = ROWS * SLOT - GAP;
const GRAVITY_PER_FRAME = 1.5;
const MUTE_STORAGE_KEY = 'connect-four:muted';

const COLORS = {
  red: 'bg-blue-500',
  yellow: 'bg-orange-400',
};
const COLOR_NAMES = {
  red: 'Blue',
  yellow: 'Orange',
};

const getInitialMuted = () => {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(MUTE_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
};

const ConnectFour = () => {
  const [board, setBoard] = useState(createEmptyBoard);
  const [player, setPlayer] = useState('yellow');
  const [winner, setWinner] = useState(null);
  const [game, setGame] = useState({ history: [] });
  const [hoverCol, setHoverCol] = useState(null);
  const [animDisc, setAnimDisc] = useState(null);
  const [winningCells, setWinningCells] = useState([]);
  const [scores, setScores] = useState(Array(COLS).fill(null));
  const [paused, setPaused] = useState(false);
  const [stats, setStats] = useState(() => loadStats());
  const [muted, setMuted] = useState(getInitialMuted);

  const boardRef = useRef(board);
  useEffect(() => {
    boardRef.current = board;
  }, [board]);

  useEffect(() => {
    saveStats(stats);
  }, [stats]);

  useEffect(() => {
    try {
      window.localStorage.setItem(MUTE_STORAGE_KEY, muted ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [muted]);

  const audioRef = useRef(null);
  const ensureAudio = useCallback(() => {
    if (audioRef.current) return audioRef.current;
    if (typeof window === 'undefined') return null;
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    try {
      const ctx = new Ctor();
      audioRef.current = ctx;
      return ctx;
    } catch {
      return null;
    }
  }, []);

  const playTone = useCallback(
    (frequency, duration = 0.2) => {
      if (muted) return;
      const ctx = ensureAudio();
      if (!ctx) return;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = frequency;
        gain.gain.value = 0;
        osc.connect(gain);
        gain.connect(ctx.destination);
        const now = ctx.currentTime;
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.2, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
        osc.start(now);
        osc.stop(now + duration);
      } catch {
        /* ignore audio errors */
      }
    },
    [ensureAudio, muted],
  );

  const playDropSound = useCallback(() => playTone(520, 0.12), [playTone]);
  const playPlayerWin = useCallback(() => playTone(680, 0.35), [playTone]);
  const playCpuWin = useCallback(() => playTone(260, 0.35), [playTone]);
  const playDrawSound = useCallback(() => playTone(360, 0.3), [playTone]);

  const updateStats = useCallback((outcome) => {
    setStats((prev) => recordOutcome(prev, outcome));
  }, []);

  const finalizeMove = useCallback(
    (newBoard, color) => {
      const winCells = findWinningCells(newBoard, color);
      if (winCells) {
        setWinner(color);
        setWinningCells(winCells.map(({ row, col }) => ({ r: row, c: col })));
        if (color === 'yellow') {
          updateStats('player');
          playPlayerWin();
        } else {
          updateStats('cpu');
          playCpuWin();
        }
      } else if (isBoardFull(newBoard)) {
        setWinner('draw');
        setWinningCells([]);
        updateStats('draw');
        playDrawSound();
      } else {
        setPlayer(color === 'red' ? 'yellow' : 'red');
        playDropSound();
      }
    },
    [playCpuWin, playDrawSound, playDropSound, playPlayerWin, updateStats],
  );

  const dropDisc = useCallback(
    (col, color) => {
      if (winner || animDisc || paused) return;
      const row = getValidRow(boardRef.current, col);
      if (row === -1) return;
      setAnimDisc({ col, row, color, y: -SLOT, vy: 0, target: row * SLOT });
    },
    [winner, animDisc, paused],
  );

  const handleClick = useCallback(
    (col) => {
      if (player !== 'yellow' || winner || animDisc || paused) return;
      setGame((g) => ({ history: [...g.history, board.map((r) => [...r])] }));
      dropDisc(col, 'yellow');
    },
    [animDisc, board, dropDisc, paused, player, winner],
  );

  const undo = useCallback(() => {
    setGame((g) => {
      if (!g.history.length || animDisc || paused || winner) return g;
      const prev = g.history[g.history.length - 1];
      setBoard(prev);
      setPlayer('yellow');
      setWinner(null);
      setWinningCells([]);
      return { history: g.history.slice(0, -1) };
    });
  }, [animDisc, paused, winner]);

  const reset = useCallback(() => {
    setBoard(createEmptyBoard());
    setPlayer('yellow');
    setWinner(null);
    setGame({ history: [] });
    setWinningCells([]);
    setHoverCol(null);
    setAnimDisc(null);
    setPaused(false);
  }, []);

  const togglePause = useCallback(() => {
    setPaused((p) => !p);
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((m) => !m);
  }, []);

  useEffect(() => {
    setScores(evaluateColumns(board, player));
  }, [board, player]);

  useGameLoop(
    (delta) => {
      setAnimDisc((d) => {
        if (!d) return d;
        const frameScale = delta * 60;
        let { y, vy, target } = d;
        vy += GRAVITY_PER_FRAME * frameScale;
        y += vy * frameScale;
        if (y >= target) {
          y = target;
          if (Math.abs(vy) < GRAVITY_PER_FRAME * frameScale) {
            const newBoard = boardRef.current.map((r) => [...r]);
            newBoard[d.row][d.col] = d.color;
            setBoard(newBoard);
            finalizeMove(newBoard, d.color);
            return null;
          }
          vy = -vy * 0.5;
        }
        return { ...d, y, vy };
      });
    },
    Boolean(animDisc) && !paused,
  );

  useEffect(() => {
    if (paused || player !== 'red' || winner || animDisc) return;
    const { column } = minimax(board, 4, -Infinity, Infinity, true);
    if (column !== undefined) dropDisc(column, 'red');
  }, [animDisc, board, dropDisc, paused, player, winner]);

  const validScores = scores.filter((s) => s !== null);
  const minScore = validScores.length ? Math.min(...validScores) : 0;
  const maxScore = validScores.length ? Math.max(...validScores) : 0;
  const getColor = useCallback(
    (s) => {
      if (s == null || maxScore === minScore) return undefined;
      const t = (s - minScore) / (maxScore - minScore);
      const r = Math.round(255 * (1 - t));
      const g = Math.round(255 * t);
      return `rgba(${r}, ${g}, 0, 0.5)`;
    },
    [minScore, maxScore],
  );

  const boardWidth = COLS * SLOT - GAP;

  return (
    <GameLayout
      gameId="connect-four"
      score={stats.playerWins}
      highScore={stats.playerWins}
    >
      <div className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white p-4 relative">
        <div className="absolute top-2 right-2 flex gap-2">
          <button
            type="button"
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded"
            onClick={togglePause}
          >
            {paused ? 'Resume' : 'Pause'}
          </button>
          <button
            type="button"
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded"
            onClick={reset}
          >
            Reset
          </button>
          <button
            type="button"
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded"
            onClick={toggleMute}
          >
            {muted ? 'Sound Off' : 'Sound On'}
          </button>
        </div>
        {winner && (
          <div className="mb-2 capitalize">
            {winner === 'draw' ? 'Draw!' : `${COLOR_NAMES[winner]} wins!`}
          </div>
        )}
        <div
          className="relative"
          style={{ width: boardWidth, height: BOARD_HEIGHT }}
          onMouseLeave={() => setHoverCol(null)}
        >
          <div className="grid grid-cols-7 gap-1">
            {board.map((row, rIdx) =>
              row.map((cell, cIdx) => (
                <button
                  key={`${rIdx}-${cIdx}`}
                  aria-label={`cell-${rIdx}-${cIdx}`}
                  className="w-10 h-10 rounded-full flex items-center justify-center focus:outline-none bg-gray-700"
                  style={
                    hoverCol === cIdx && !winner
                      ? { backgroundColor: getColor(scores[cIdx]) }
                      : undefined
                  }
                  onClick={() => handleClick(cIdx)}
                  onMouseEnter={() => setHoverCol(cIdx)}
                  disabled={paused || Boolean(winner)}
                >
                  {cell && (
                    <div
                      className={`w-8 h-8 rounded-full ${COLORS[cell]}`}
                    />
                  )}
                </button>
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
                strokeWidth="0.2"
                strokeLinecap="round"
              />
            </svg>
          )}
          {animDisc && (
            <div
              className="absolute"
              style={{
                transform: `translateX(${animDisc.col * SLOT}px) translateY(${animDisc.y}px)`,
              }}
            >
              <div
                className={`w-8 h-8 rounded-full ${COLORS[animDisc.color]}`}
              />
            </div>
          )}
        </div>
        <div className="mt-4 flex gap-2">
          <button
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
            onClick={undo}
            disabled={
              game.history.length === 0 || animDisc || paused || Boolean(winner)
            }
          >
            Undo
          </button>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-6 text-center text-sm">
          <div>
            <div className="font-semibold">Player</div>
            <div>{stats.playerWins}</div>
          </div>
          <div>
            <div className="font-semibold">AI</div>
            <div>{stats.cpuWins}</div>
          </div>
          <div>
            <div className="font-semibold">Draws</div>
            <div>{stats.draws}</div>
          </div>
        </div>
      </div>
    </GameLayout>
  );
};

export default ConnectFour;
