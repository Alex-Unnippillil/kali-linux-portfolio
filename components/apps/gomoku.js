import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import GameLayout from './GameLayout';
import usePersistentState from '../../hooks/usePersistentState';
import {
  BOARD_SIZE,
  createEmptyBoard,
  cloneBoard,
  checkWinner,
  isBoardFull,
  chooseAiMove,
  createDefaultStats,
  isGomokuStats,
  migrateGomokuStats,
  applyResultToStats,
  oppositePlayer,
  DIFFICULTIES,
  DEFAULT_RULES,
} from '../../apps/games/gomoku/logic';

const PLAYER_LABELS = {
  black: 'Black',
  white: 'White',
};

const DIFFICULTY_LABELS = {
  casual: 'Casual',
  balanced: 'Balanced',
  advanced: 'Advanced',
};

const MODE_OPTIONS = [
  { id: 'ai', label: 'AI Match' },
  { id: 'local', label: 'Local (2 players)' },
];

const HUMAN_COLOR_OPTIONS = [
  { id: 'black', label: 'Play First (Black)' },
  { id: 'white', label: 'Play Second (White)' },
];

const buildKey = (row, col) => `${row}-${col}`;

const Gomoku = () => {
  const [stats, setStats] = usePersistentState(
    'gomoku:stats',
    createDefaultStats,
    isGomokuStats,
    migrateGomokuStats,
  );
  const [mode, setMode] = usePersistentState(
    'gomoku:mode',
    'ai',
    (value) => value === 'ai' || value === 'local',
  );
  const [difficulty, setDifficulty] = usePersistentState(
    'gomoku:difficulty',
    'balanced',
    (value) => DIFFICULTIES.includes(value),
  );
  const [humanColor, setHumanColor] = usePersistentState(
    'gomoku:human',
    'black',
    (value) => value === 'black' || value === 'white',
  );
  const [soundEnabled, setSoundEnabled] = usePersistentState(
    'gomoku:sound',
    true,
    (value) => typeof value === 'boolean',
  );
  const [ruleSet, setRuleSet] = usePersistentState(
    'gomoku:ruleset',
    DEFAULT_RULES.ruleSet,
    (value) => value === 'freestyle' || value === 'exactFive',
  );

  const [board, setBoard] = useState(() => createEmptyBoard());
  const [currentPlayer, setCurrentPlayer] = useState('black');
  const [winner, setWinner] = useState(null);
  const [winningLine, setWinningLine] = useState([]);
  const [message, setMessage] = useState('Black to move');
  const [aiThinking, setAiThinking] = useState(false);
  const [lastMove, setLastMove] = useState(null);

  const aiColor = mode === 'ai' ? oppositePlayer(humanColor) : null;
  const audioRef = useRef(null);
  const aiTimeout = useRef(null);

  const winningCells = useMemo(() => {
    if (!winningLine || winningLine.length === 0) return new Set();
    return new Set(winningLine.map((cell) => buildKey(cell.row, cell.col)));
  }, [winningLine]);

  const layoutScore = mode === 'ai' ? stats.ai.streak : undefined;
  const layoutHighScore = stats.ai.bestStreak;

  const rules = useMemo(() => ({ ruleSet, winLength: 5 }), [ruleSet]);

  const clearAiTimeout = useCallback(() => {
    if (aiTimeout.current) {
      clearTimeout(aiTimeout.current);
      aiTimeout.current = null;
    }
  }, []);

  const playStoneSound = useCallback(() => {
    if (!soundEnabled || typeof window === 'undefined') return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = audioRef.current || new Ctx();
    audioRef.current = ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  }, [soundEnabled]);

  const resetBoard = useCallback(
    (nextPlayer = 'black') => {
      clearAiTimeout();
      setBoard(createEmptyBoard());
      setCurrentPlayer(nextPlayer);
      setWinner(null);
      setWinningLine([]);
      setMessage(`${PLAYER_LABELS[nextPlayer]} to move`);
      setAiThinking(false);
      setLastMove(null);
    },
    [clearAiTimeout],
  );

  useEffect(
    () => resetBoard('black'),
    [mode, humanColor, difficulty, ruleSet, resetBoard],
  );

  useEffect(() => () => clearAiTimeout(), [clearAiTimeout]);

  const finishRound = useCallback(
    (result) => {
      setWinner(result);
      if (result === 'draw') {
        setMessage('Draw game');
      } else {
        setMessage(`${PLAYER_LABELS[result]} wins!`);
      }
      setStats((prev) => applyResultToStats(prev, mode, result, humanColor));
      setAiThinking(false);
    },
    [humanColor, mode, setStats],
  );

  const handleMove = useCallback(
    (row, col, player) => {
      if (winner || board[row][col] !== null || player !== currentPlayer) return;
      if (mode === 'ai' && aiColor && player !== humanColor && player !== aiColor) return;
      const nextBoard = cloneBoard(board);
      nextBoard[row][col] = player;
      setBoard(nextBoard);
      setLastMove({ row, col, player });
      playStoneSound();
      const winResult = checkWinner(nextBoard, row, col, player, rules);
      if (winResult) {
        setWinningLine(winResult.line);
        finishRound(player);
        return;
      }
      if (isBoardFull(nextBoard)) {
        finishRound('draw');
        return;
      }
      const nextPlayer = oppositePlayer(player);
      setCurrentPlayer(nextPlayer);
      setMessage(`${PLAYER_LABELS[nextPlayer]} to move`);
    },
    [aiColor, board, finishRound, humanColor, mode, playStoneSound, winner],
  );

  const isHumanTurn =
    mode === 'ai' ? currentPlayer === humanColor && !winner : !winner;

  const handleClick = (row, col) => {
    if (!isHumanTurn || aiThinking) return;
    handleMove(row, col, currentPlayer);
  };

  useEffect(() => {
    if (mode !== 'ai' || !aiColor || winner) return;
    if (currentPlayer !== aiColor) return;
    if (aiThinking) return;
    setAiThinking(true);
    aiTimeout.current = setTimeout(() => {
      const move = chooseAiMove(board, aiColor, humanColor, difficulty, rules);
      if (move) {
        handleMove(move.row, move.col, aiColor);
      }
      setAiThinking(false);
    }, 350);
    return () => clearAiTimeout();
  }, [aiThinking, aiColor, board, clearAiTimeout, currentPlayer, difficulty, handleMove, humanColor, mode, rules, winner]);

  const boardStyle = useMemo(
    () => ({ gridTemplateColumns: `repeat(${BOARD_SIZE}, minmax(1.75rem, 1fr))` }),
    [],
  );

  const renderCell = (cell, row, col) => {
    const key = buildKey(row, col);
    const isWinning = winningCells.has(key);
    const isLastMove = lastMove && lastMove.row === row && lastMove.col === col;
    return (
      <button
        key={key}
        type="button"
        className={`relative h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 border border-black/30 flex items-center justify-center rounded-sm focus:outline-none focus:ring-2 focus:ring-yellow-300/70 transition-colors ${
          isWinning
            ? 'bg-yellow-500/40'
            : 'bg-amber-800/70 hover:bg-amber-700/80'
        }`}
        aria-label={`Place stone at row ${row + 1}, column ${col + 1}`}
        onClick={() => handleClick(row, col)}
        disabled={Boolean(cell) || !isHumanTurn || aiThinking || Boolean(winner)}
      >
        {cell && (
          <div
            className={`h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 rounded-full shadow-inner ${
              cell === 'black' ? 'bg-black' : 'bg-white'
            } ${isLastMove ? 'ring-2 ring-cyan-400' : ''}`}
          />
        )}
      </button>
    );
  };

  const resetStats = () => {
    setStats(createDefaultStats());
  };

  const aiSummary = `You (${PLAYER_LABELS[humanColor]}) vs AI (${PLAYER_LABELS[aiColor || 'white']})`;

  return (
    <GameLayout gameId="gomoku" score={layoutScore} highScore={layoutHighScore}>
      <div className="h-full w-full flex flex-col bg-ub-cool-grey text-white p-4 overflow-auto">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <span className="uppercase tracking-wide text-gray-300">Mode</span>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                className="rounded bg-gray-800 px-2 py-1 text-white"
              >
                {MODE_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            {mode === 'ai' && (
              <label className="flex items-center gap-2 text-sm">
                <span className="uppercase tracking-wide text-gray-300">Difficulty</span>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="rounded bg-gray-800 px-2 py-1 text-white"
                >
                  {DIFFICULTIES.map((id) => (
                    <option key={id} value={id}>
                      {DIFFICULTY_LABELS[id]}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {mode === 'ai' && (
              <label className="flex items-center gap-2 text-sm">
                <span className="uppercase tracking-wide text-gray-300">Side</span>
                <select
                  value={humanColor}
                  onChange={(e) => setHumanColor(e.target.value)}
                  className="rounded bg-gray-800 px-2 py-1 text-white"
                >
                  {HUMAN_COLOR_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="flex items-center gap-2 text-sm">
              <span className="uppercase tracking-wide text-gray-300">Rules</span>
              <select
                value={ruleSet}
                onChange={(e) => setRuleSet(e.target.value)}
                className="rounded bg-gray-800 px-2 py-1 text-white"
              >
                <option value="freestyle">Freestyle (5+ wins)</option>
                <option value="exactFive">Exact Five</option>
              </select>
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="rounded bg-gray-800 px-3 py-1 text-sm hover:bg-gray-700"
              onClick={() => resetBoard('black')}
            >
              Reset Board
            </button>
            <button
              type="button"
              className="rounded bg-gray-800 px-3 py-1 text-sm hover:bg-gray-700"
              onClick={() => setSoundEnabled((value) => !value)}
            >
              Sound {soundEnabled ? 'On' : 'Off'}
            </button>
            <button
              type="button"
              className="rounded bg-gray-800 px-3 py-1 text-sm hover:bg-gray-700"
              onClick={resetStats}
            >
              Clear Stats
            </button>
          </div>
        </div>
        <div className="mt-4 flex flex-col items-center gap-4">
          <div className="text-lg font-semibold" role="status">
            {message}
          </div>
          {mode === 'ai' && (
            <div className="text-sm text-gray-300">{aiSummary}</div>
          )}
          {aiThinking && (
            <div className="text-sm text-yellow-300">AI is thinking…</div>
          )}
          <div
            className="rounded-lg border border-black/40 bg-gradient-to-br from-amber-700 to-amber-900 p-3 shadow-inner"
          >
            <div className="grid gap-[3px]" style={boardStyle}>
              {board.map((row, rIdx) =>
                row.map((cell, cIdx) => renderCell(cell, rIdx, cIdx)),
              )}
            </div>
          </div>
          <div className="grid w-full max-w-xl gap-3 rounded-lg bg-gray-900/40 p-3 text-sm">
            {mode === 'ai' ? (
              <>
                <div className="flex justify-between">
                  <span>You</span>
                  <span>{stats.ai.playerWins}</span>
                </div>
                <div className="flex justify-between">
                  <span>AI</span>
                  <span>{stats.ai.aiWins}</span>
                </div>
                <div className="flex justify-between">
                  <span>Draws</span>
                  <span>{stats.ai.draws}</span>
                </div>
                <div className="flex justify-between">
                  <span>Current Streak</span>
                  <span>{stats.ai.streak}</span>
                </div>
                <div className="flex justify-between">
                  <span>Best Streak</span>
                  <span>{stats.ai.bestStreak}</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between">
                  <span>Black Wins</span>
                  <span>{stats.local.blackWins}</span>
                </div>
                <div className="flex justify-between">
                  <span>White Wins</span>
                  <span>{stats.local.whiteWins}</span>
                </div>
                <div className="flex justify-between">
                  <span>Draws</span>
                  <span>{stats.local.draws}</span>
                </div>
              </>
            )}
            <div className="flex justify-between text-gray-300">
              <span>Total Games</span>
              <span>{stats.totalGames}</span>
            </div>
          </div>
        </div>
      </div>
    </GameLayout>
  );
};

export default Gomoku;
