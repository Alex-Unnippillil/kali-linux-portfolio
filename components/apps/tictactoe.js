'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import GameLayout from './GameLayout';
import { useGameLoop } from './Games/common';
import useCanvasResize from '../../hooks/useCanvasResize';
import { useGameSettings, useGamePersistence } from './useGameControls';
import { checkWinner, minimax, createBoard } from '../../apps/games/tictactoe/logic';
import {
  loadStats,
  saveStats,
  applyResult,
  createVariantKey,
  defaultVariantStats,
  computeGlobalBestStreak,
  resetVariantStats,
} from '../../apps/games/tictactoe/storage';

const SKINS = {
  classic: { X: 'X', O: 'O' },
  emoji: { X: '❌', O: '⭕' },
  animals: { X: '🐱', O: '🐶' },
  fruits: { X: '🍎', O: '🍌' },
};

const CELL_SIZE = 96;
const BOARD_BG = '#111827';
const GRID_COLOR = '#374151';
const WIN_COLOR = '#f87171';
const LAST_MOVE_COLOR = '#38bdf8';

const clampIndex = (index, boardLength) =>
  Number.isFinite(index) && index >= 0 && index < boardLength;

const pickRandom = (options) =>
  options[Math.floor(Math.random() * options.length)] ?? -1;

const TicTacToe = () => {
  const [size, setSize] = useState(3);
  const [mode, setMode] = useState('classic');
  const [skin, setSkin] = useState('classic');
  const [level, setLevel] = useState('hard');
  const [board, setBoard] = useState(() => createBoard(3));
  const [playerSymbol, setPlayerSymbol] = useState(null);
  const [aiSymbol, setAiSymbol] = useState(null);
  const [winLine, setWinLine] = useState(null);
  const [lastMove, setLastMove] = useState(null);
  const [status, setStatus] = useState('Choose X or O');
  const [lineProgress, setLineProgress] = useState(1);
  const [stats, setStats] = useState(() => loadStats());
  const canvasRef = useCanvasResize(size * CELL_SIZE, size * CELL_SIZE);
  const audioRef = useRef(null);

  const { paused, togglePause, muted, toggleMute } = useGameSettings('tictactoe');
  const { getHighScore, setHighScore } = useGamePersistence('tictactoe');
  const [highScore, setHighScoreState] = useState(0);

  const variantKey = useMemo(() => createVariantKey(mode, size), [mode, size]);
  const variantStats = stats[variantKey] ?? defaultVariantStats();
  const bestStreak = useMemo(() => computeGlobalBestStreak(stats), [stats]);
  const hasActiveGame = playerSymbol !== null;

  useEffect(() => {
    setStats(loadStats());
  }, []);

  useEffect(() => {
    setHighScoreState(getHighScore());
  }, [getHighScore]);

  useEffect(() => {
    if (bestStreak > highScore) {
      setHighScore(bestStreak);
      setHighScoreState(bestStreak);
    }
  }, [bestStreak, highScore, setHighScore]);

  useEffect(() => {
    setBoard(createBoard(size));
    setPlayerSymbol(null);
    setAiSymbol(null);
    setWinLine(null);
    setLastMove(null);
    setStatus('Choose X or O');
    setLineProgress(1);
    if (paused) togglePause();
  }, [size, mode, paused, togglePause]);

  const playTone = useCallback(
    (frequency) => {
      if (muted) return;
      try {
        const ctx =
          audioRef.current ||
          new (window.AudioContext || window.webkitAudioContext)();
        audioRef.current = ctx;
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        oscillator.frequency.value = frequency;
        oscillator.connect(gain);
        gain.connect(ctx.destination);
        const now = ctx.currentTime;
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        oscillator.start(now);
        oscillator.stop(now + 0.18);
      } catch {
        // ignore audio errors
      }
    },
    [muted],
  );

  useEffect(
    () => () => {
      audioRef.current?.close?.();
    },
    [],
  );

  const handleResult = useCallback(
    (outcome) => {
      setStats((prev) => {
        const next = applyResult(prev, variantKey, outcome);
        saveStats(next);
        return next;
      });
    },
    [variantKey],
  );

  const clearVariantStats = useCallback(() => {
    setStats((prev) => {
      const next = resetVariantStats(prev, variantKey);
      saveStats(next);
      return next;
    });
  }, [variantKey]);

  const startGame = useCallback(
    (symbol) => {
      setPlayerSymbol(symbol);
      setAiSymbol(symbol === 'X' ? 'O' : 'X');
      setBoard(createBoard(size));
      setWinLine(null);
      setLastMove(null);
      setLineProgress(1);
      if (paused) togglePause();
    },
    [paused, size, togglePause],
  );

  const resetMatch = useCallback(() => {
    setBoard(createBoard(size));
    setWinLine(null);
    setLastMove(null);
    setLineProgress(1);
  }, [size]);

  const backToSetup = useCallback(() => {
    setPlayerSymbol(null);
    setAiSymbol(null);
    setBoard(createBoard(size));
    setWinLine(null);
    setLastMove(null);
    setLineProgress(1);
    setStatus('Choose X or O');
    if (paused) togglePause();
  }, [paused, size, togglePause]);

  const pickAiMove = useCallback(
    (state) => {
      const empties = state
        .map((cell, idx) => (cell ? -1 : idx))
        .filter((idx) => idx >= 0);
      if (empties.length === 0) return -1;
      if (level === 'easy') return pickRandom(empties);
      if (level === 'medium' && Math.random() < 0.5) return pickRandom(empties);
      const { index } = minimax(state.slice(), aiSymbol, size, mode === 'misere');
      return typeof index === 'number' ? index : -1;
    },
    [aiSymbol, level, mode, size],
  );

  const handleCellSelection = useCallback(
    (index) => {
      if (!hasActiveGame || paused || !clampIndex(index, board.length)) return;
      if (board[index]) return;
      if (winLine) return;
      const filled = board.filter(Boolean).length;
      const playerTurn =
        (playerSymbol === 'X' && filled % 2 === 0) ||
        (playerSymbol === 'O' && filled % 2 === 1);
      if (!playerTurn) return;
      setBoard((prev) => {
        if (prev[index]) return prev;
        const next = prev.slice();
        next[index] = playerSymbol;
        return next;
      });
      setLastMove(index);
      setWinLine(null);
      setLineProgress(1);
      playTone(540);
    },
    [board, hasActiveGame, paused, playerSymbol, playTone, winLine],
  );

  const handlePointerDown = useCallback(
    (event) => {
      event.preventDefault();
      if (!hasActiveGame || paused) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * size;
      const y = ((event.clientY - rect.top) / rect.height) * size;
      const col = Math.floor(x);
      const row = Math.floor(y);
      const index = row * size + col;
      if (clampIndex(index, board.length)) handleCellSelection(index);
    },
    [board.length, canvasRef, handleCellSelection, hasActiveGame, paused, size],
  );

  useEffect(() => {
    if (!playerSymbol || !aiSymbol) return undefined;
    const { winner, line } = checkWinner(board, size, mode === 'misere');
    if (!winner && winLine) {
      setWinLine(null);
      setLineProgress(1);
    }
    if (winner) {
      if (winner === 'draw') {
        setStatus('Draw');
        setWinLine(null);
        setLineProgress(1);
        handleResult('draw');
        return undefined;
      }
      setWinLine(line && line.length ? line : null);
      if (line && line.length) setLineProgress(0);
      const playerWon = winner === playerSymbol;
      setStatus(playerWon ? 'You win!' : 'AI wins');
      handleResult(playerWon ? 'win' : 'loss');
      if (playerWon) playTone(880);
      return undefined;
    }
    const filled = board.filter(Boolean).length;
    const playerTurn =
      (playerSymbol === 'X' && filled % 2 === 0) ||
      (playerSymbol === 'O' && filled % 2 === 1);
    if (paused) {
      setStatus('Paused');
      return undefined;
    }
    if (playerTurn) {
      setStatus(`${SKINS[skin][playerSymbol]}'s turn`);
      return undefined;
    }
    setStatus(`${SKINS[skin][aiSymbol]}'s turn`);
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      const move = pickAiMove(board.slice());
      if (!clampIndex(move, board.length)) return;
      setBoard((prev) => {
        if (prev[move]) return prev;
        const next = prev.slice();
        next[move] = aiSymbol;
        return next;
      });
      setLastMove(move);
      setWinLine(null);
      setLineProgress(1);
      playTone(392);
    }, level === 'hard' ? 180 : 260);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    aiSymbol,
    board,
    handleResult,
    level,
    mode,
    paused,
    pickAiMove,
    playerSymbol,
    playTone,
    size,
    skin,
    winLine,
  ]);

  const drawBoard = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const boardSize = size * CELL_SIZE;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = BOARD_BG;
    ctx.fillRect(0, 0, boardSize, boardSize);

    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 4;
    for (let i = 1; i < size; i += 1) {
      const offset = i * CELL_SIZE;
      ctx.beginPath();
      ctx.moveTo(offset, 0);
      ctx.lineTo(offset, boardSize);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, offset);
      ctx.lineTo(boardSize, offset);
      ctx.stroke();
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#f9fafb';
    ctx.font = `${CELL_SIZE * 0.6}px 'Inter', system-ui, sans-serif`;
    board.forEach((cell, idx) => {
      if (!cell) return;
      const col = idx % size;
      const row = Math.floor(idx / size);
      const x = col * CELL_SIZE + CELL_SIZE / 2;
      const y = row * CELL_SIZE + CELL_SIZE / 2;
      const glyph = SKINS[skin][cell];
      ctx.fillText(glyph, x, y + (glyph.length > 1 ? 4 : 0));
    });

    if (lastMove !== null) {
      const col = lastMove % size;
      const row = Math.floor(lastMove / size);
      ctx.strokeStyle = LAST_MOVE_COLOR;
      ctx.lineWidth = 4;
      ctx.strokeRect(
        col * CELL_SIZE + 4,
        row * CELL_SIZE + 4,
        CELL_SIZE - 8,
        CELL_SIZE - 8,
      );
    }

    if (winLine && winLine.length > 1) {
      const start = winLine[0];
      const end = winLine[winLine.length - 1];
      const sx = (start % size) * CELL_SIZE + CELL_SIZE / 2;
      const sy = Math.floor(start / size) * CELL_SIZE + CELL_SIZE / 2;
      const ex = (end % size) * CELL_SIZE + CELL_SIZE / 2;
      const ey = Math.floor(end / size) * CELL_SIZE + CELL_SIZE / 2;
      const progress = Math.max(0, Math.min(1, lineProgress));
      ctx.strokeStyle = WIN_COLOR;
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + (ex - sx) * progress, sy + (ey - sy) * progress);
      ctx.stroke();
    }
  }, [board, canvasRef, lastMove, lineProgress, size, skin, winLine]);

  useEffect(() => {
    drawBoard();
  }, [drawBoard]);

  useGameLoop(
    (delta) => {
      setLineProgress((prev) => Math.min(1, prev + delta * 3));
    },
    !paused && Boolean(winLine) && lineProgress < 1,
  );

  const statsSummary = (
    <div className="text-sm text-gray-200 space-y-1">
      <div>
        Wins: {variantStats.wins} · Losses: {variantStats.losses} · Draws:{' '}
        {variantStats.draws}
      </div>
      <div>Current streak: {variantStats.streak}</div>
      <div>Best streak: {bestStreak}</div>
    </div>
  );

  const controlBar = (
    <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
      <button
        type="button"
        className="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-50"
        onClick={togglePause}
        disabled={!hasActiveGame}
      >
        {paused ? 'Resume' : 'Pause'}
      </button>
      <button
        type="button"
        className="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600"
        onClick={toggleMute}
      >
        {muted ? 'Sound On' : 'Mute'}
      </button>
      <button
        type="button"
        className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-50"
        onClick={resetMatch}
        disabled={!hasActiveGame}
      >
        Restart Match
      </button>
      <button
        type="button"
        className="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-50"
        onClick={backToSetup}
        disabled={!hasActiveGame}
      >
        Change Options
      </button>
      <button
        type="button"
        className="px-3 py-1 rounded bg-red-600 hover:bg-red-500"
        onClick={clearVariantStats}
      >
        Reset Stats
      </button>
    </div>
  );

  return (
    <GameLayout
      gameId="tictactoe"
      score={variantStats.streak}
      highScore={highScore}
    >
      <div className="h-full w-full bg-ub-cool-grey text-white flex flex-col">
        <div className="px-4 py-3 border-b border-gray-700 bg-gray-900/60">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {controlBar}
            {statsSummary}
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-4 gap-6">
          {hasActiveGame ? (
            <>
              <div className="text-lg" aria-live="polite">
                {status}
              </div>
              <div className="w-full max-w-md">
                <canvas
                  ref={canvasRef}
                  className="w-full h-auto bg-gray-900 rounded-lg shadow-lg border border-gray-700"
                  onPointerDown={handlePointerDown}
                  role="presentation"
                />
              </div>
            </>
          ) : (
            <div className="w-full max-w-xl bg-gray-900/70 border border-gray-700 rounded-lg p-6 space-y-4 shadow-lg">
              <h2 className="text-xl font-semibold text-center">Configure Match</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="flex flex-col text-sm">
                  <span className="mb-1 text-gray-200">Board Size</span>
                  <select
                    value={size}
                    onChange={(e) => setSize(parseInt(e.target.value, 10))}
                    className="bg-gray-800 border border-gray-700 rounded px-2 py-1"
                  >
                    <option value={3}>3 × 3</option>
                    <option value={4}>4 × 4</option>
                  </select>
                </label>
                <label className="flex flex-col text-sm">
                  <span className="mb-1 text-gray-200">Mode</span>
                  <select
                    value={mode}
                    onChange={(e) => setMode(e.target.value)}
                    className="bg-gray-800 border border-gray-700 rounded px-2 py-1"
                  >
                    <option value="classic">Classic</option>
                    <option value="misere">Misère (three in a row loses)</option>
                  </select>
                </label>
                <label className="flex flex-col text-sm">
                  <span className="mb-1 text-gray-200">AI Level</span>
                  <select
                    value={level}
                    onChange={(e) => setLevel(e.target.value)}
                    className="bg-gray-800 border border-gray-700 rounded px-2 py-1"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </label>
                <label className="flex flex-col text-sm">
                  <span className="mb-1 text-gray-200">Skin</span>
                  <select
                    value={skin}
                    onChange={(e) => setSkin(e.target.value)}
                    className="bg-gray-800 border border-gray-700 rounded px-2 py-1"
                  >
                    {Object.keys(SKINS).map((key) => (
                      <option key={key} value={key}>
                        {key.charAt(0).toUpperCase() + key.slice(1)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="text-center text-sm text-gray-300">
                Choose your mark to begin.
              </div>
              <div className="flex justify-center gap-4">
                <button
                  type="button"
                  className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500"
                  onClick={() => startGame('X')}
                >
                  {SKINS[skin].X}
                </button>
                <button
                  type="button"
                  className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500"
                  onClick={() => startGame('O')}
                >
                  {SKINS[skin].O}
                </button>
              </div>
              <div className="text-sm text-gray-300 text-center">
                {status}
              </div>
              <div className="pt-2 border-t border-gray-700">
                {statsSummary}
              </div>
            </div>
          )}
          <div className="text-sm text-gray-300">
            High score (best streak): {highScore}
          </div>
        </div>
      </div>
    </GameLayout>
  );
};

export { checkWinner, minimax } from '../../apps/games/tictactoe/logic';

export default TicTacToe;
