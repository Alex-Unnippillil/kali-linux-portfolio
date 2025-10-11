import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import clsx from 'clsx';
import GameLayout from './GameLayout';
import { checkWinner, minimax, createBoard } from '../../apps/games/tictactoe/logic';

const SKINS = {
  classic: { X: 'X', O: 'O' },
  emoji: { X: '❌', O: '⭕' },
  animals: { X: '🐱', O: '🐶' },
  fruits: { X: '🍎', O: '🍌' },
};

const TicTacToe = () => {
  const [size, setSize] = useState(3);
  const [mode, setMode] = useState('classic');
  const [skin, setSkin] = useState('classic');
  const [level, setLevel] = useState('hard');
  const [board, setBoard] = useState(createBoard(3));
  const [player, setPlayer] = useState(null);
  const [ai, setAi] = useState(null);
  const [status, setStatus] = useState('Select your side to begin');
  const [winLine, setWinLine] = useState(null);
  const [lastMoveIndex, setLastMoveIndex] = useState(null);
  const [stats, setStats] = useState(() => {
    if (typeof window === 'undefined') return {};
    try {
      return JSON.parse(localStorage.getItem('tictactoeStats') || '{}');
    } catch {
      return {};
    }
  });

  const lineRef = useRef(null);
  const aiMoveTimeout = useRef(null);

  const variantKey = `${mode}-${size}`;
  const recordResult = useCallback(
    (res) => {
      setStats((prev) => {
        const cur = prev[variantKey] || { wins: 0, losses: 0, draws: 0 };
        const updated = {
          ...prev,
          [variantKey]: {
            wins: res === 'win' ? cur.wins + 1 : cur.wins,
            losses: res === 'loss' ? cur.losses + 1 : cur.losses,
            draws: res === 'draw' ? cur.draws + 1 : cur.draws,
          },
        };
        if (typeof window !== 'undefined') {
          localStorage.setItem('tictactoeStats', JSON.stringify(updated));
        }
        return updated;
      });
    },
    [variantKey]
  );

  const isMisere = mode === 'misere';
  const currentSkin = useMemo(() => SKINS[skin], [skin]);
  const currentResult = useMemo(
    () => checkWinner(board, size, isMisere),
    [board, size, isMisere]
  );
  const hasWinner = Boolean(currentResult.winner);

  const variantStats = useMemo(
    () => stats[variantKey] || { wins: 0, losses: 0, draws: 0 },
    [stats, variantKey]
  );
  const totalGames = variantStats.wins + variantStats.losses + variantStats.draws;
  const winRate = totalGames ? Math.round((variantStats.wins / totalGames) * 100) : 0;

  const boardPixels = size === 4 ? 320 : 288;
  const cellFontSize = size === 3 ? 'text-5xl' : 'text-3xl';
  const waitingForStart = player === null;
  const winGradientId = useMemo(() => `ttt-win-${size}-${mode}`, [size, mode]);

  useEffect(() => {
    setBoard(createBoard(size));
    setPlayer(null);
    setAi(null);
    setStatus('Select your side to begin');
    setWinLine(null);
    setLastMoveIndex(null);
    if (aiMoveTimeout.current) {
      clearTimeout(aiMoveTimeout.current);
      aiMoveTimeout.current = null;
    }
  }, [size, mode]);

  useEffect(() => () => {
    if (aiMoveTimeout.current) {
      clearTimeout(aiMoveTimeout.current);
    }
  }, []);

  const startGame = (p) => {
    const a = p === 'X' ? 'O' : 'X';
    setPlayer(p);
    setAi(a);
    setBoard(createBoard(size));
    setStatus(`${currentSkin[p]}'s turn`);
    setWinLine(null);
    setLastMoveIndex(null);
    if (aiMoveTimeout.current) {
      clearTimeout(aiMoveTimeout.current);
      aiMoveTimeout.current = null;
    }
  };

  const handleClick = (idx) => {
    if (player === null) return;
    if (board[idx] || hasWinner) return;
    const newBoard = board.slice();
    newBoard[idx] = player;
    setBoard(newBoard);
    setLastMoveIndex(idx);
  };

  useEffect(() => {
    if (player === null || ai === null) return;
    const { winner, line } = currentResult;
    if (winner) {
      setStatus(winner === 'draw' ? 'Draw' : `${currentSkin[winner]} wins`);
      setWinLine(line);
      if (winner === 'draw') recordResult('draw');
      else if (winner === player) recordResult('win');
      else recordResult('loss');
      return;
    }
    const filled = board.filter(Boolean).length;
    const isPlayerTurn =
      (player === 'X' && filled % 2 === 0) || (player === 'O' && filled % 2 === 1);
    if (!isPlayerTurn) {
      setStatus(`${currentSkin[ai]} is thinking…`);
      const getRandomMove = (b) => {
        const options = b
          .map((c, i) => (c ? null : i))
          .filter((v) => v !== null);
        return options[Math.floor(Math.random() * options.length)] ?? -1;
      };
      let move = -1;
      if (level === 'easy') {
        move = getRandomMove(board.slice());
      } else if (level === 'medium') {
        move = Math.random() < 0.5
          ? getRandomMove(board.slice())
          : minimax(board.slice(), ai, size, isMisere).index;
      } else {
        move = minimax(board.slice(), ai, size, isMisere).index;
      }
      if (move >= 0) {
        const newBoard = board.slice();
        newBoard[move] = ai;
        if (aiMoveTimeout.current) {
          clearTimeout(aiMoveTimeout.current);
        }
        aiMoveTimeout.current = setTimeout(() => {
          setBoard(newBoard);
          setLastMoveIndex(move);
          aiMoveTimeout.current = null;
        }, level === 'hard' ? 260 : 180);
      }
    } else {
      setStatus(`${currentSkin[player]}'s turn`);
    }
  }, [
    ai,
    board,
    currentResult,
    currentSkin,
    isMisere,
    level,
    player,
    recordResult,
    size,
  ]);

  useEffect(() => {
    if (winLine && lineRef.current) {
      const line = lineRef.current;
      const length = line.getTotalLength();
      line.style.transition = 'none';
      line.style.strokeDasharray = String(length);
      line.style.strokeDashoffset = String(length);
      requestAnimationFrame(() => {
        line.style.transition = 'stroke-dashoffset 0.5s ease';
        line.style.strokeDashoffset = '0';
      });
    }
  }, [winLine]);

  return (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 text-slate-100">
      <div className="grid w-full max-w-5xl gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/30 backdrop-blur">
          <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Match status</p>
              <p className="mt-2 text-2xl font-semibold text-white" aria-live="polite">
                {status}
              </p>
            </div>
            <div className="text-right text-xs text-slate-300">
              <div>{mode === 'misere' ? 'Misère rules' : 'Classic rules'}</div>
              <div>{size}×{size} · {level.charAt(0).toUpperCase() + level.slice(1)} AI</div>
            </div>
          </header>

          <div
            className="relative mx-auto w-full max-w-[20rem]"
            style={{ maxWidth: `${boardPixels}px` }}
          >
            <div
              className="grid h-full w-full gap-1 rounded-2xl border border-white/10 bg-white/5 p-1 shadow-inner"
              style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
            >
              {board.map((cell, idx) => {
                const isWinningCell = winLine?.includes(idx);
                const isLastMove = lastMoveIndex === idx;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleClick(idx)}
                    disabled={waitingForStart || Boolean(cell) || hasWinner}
                    aria-label={`Place ${player || 'piece'} on square ${idx + 1}`}
                    className={clsx(
                      'relative flex aspect-square items-center justify-center rounded-xl border border-slate-700/60 bg-slate-800/70 transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400',
                      cell ? 'text-white' : 'text-slate-500 hover:bg-slate-700/60 hover:text-slate-300',
                      cell && 'shadow-inner shadow-black/50',
                      isWinningCell && 'border-emerald-400/80 bg-emerald-500/20 text-emerald-100',
                      isLastMove && !isWinningCell && 'ring-2 ring-offset-2 ring-offset-slate-900 ring-sky-400/70'
                    )}
                  >
                    <span className={clsx('font-semibold', cellFontSize)}>
                      {cell ? currentSkin[cell] : ''}
                    </span>
                  </button>
                );
              })}
            </div>

            {winLine && (
              <svg
                className="pointer-events-none absolute inset-0 h-full w-full"
                viewBox={`0 0 ${size * 100} ${size * 100}`}
              >
                <defs>
                  <linearGradient id={winGradientId} x1="0%" x2="100%" y1="0%" y2="100%">
                    <stop offset="0%" stopColor="#34d399" />
                    <stop offset="100%" stopColor="#22d3ee" />
                  </linearGradient>
                </defs>
                {(() => {
                  const start = winLine[0];
                  const end = winLine[winLine.length - 1];
                  const sx = (start % size) * 100 + 50;
                  const sy = Math.floor(start / size) * 100 + 50;
                  const ex = (end % size) * 100 + 50;
                  const ey = Math.floor(end / size) * 100 + 50;
                  return (
                    <line
                      ref={lineRef}
                      x1={sx}
                      y1={sy}
                      x2={ex}
                      y2={ey}
                      stroke={`url(#${winGradientId})`}
                      strokeWidth={16}
                      strokeLinecap="round"
                      opacity={0.9}
                    />
                  );
                })()}
              </svg>
            )}

            {waitingForStart && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="pointer-events-auto w-full max-w-[15rem] rounded-2xl border border-white/15 bg-slate-900/90 p-4 text-center shadow-xl">
                  <p className="text-sm uppercase tracking-[0.18em] text-slate-300">Choose your side</p>
                  <div className="mt-4 flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => startGame('X')}
                      className="flex-1 rounded-xl bg-sky-500/90 py-2 text-xl font-semibold text-white shadow hover:bg-sky-400"
                    >
                      {currentSkin.X}
                    </button>
                    <button
                      type="button"
                      onClick={() => startGame('O')}
                      className="flex-1 rounded-xl bg-violet-500/90 py-2 text-xl font-semibold text-white shadow hover:bg-violet-400"
                    >
                      {currentSkin.O}
                    </button>
                  </div>
                  <p className="mt-3 text-xs text-slate-300">Tap to begin a fresh match.</p>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="rounded-xl bg-sky-500 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-slate-600/50"
              onClick={() => {
                setBoard(createBoard(size));
                setStatus(`${currentSkin[player]}'s turn`);
                setWinLine(null);
                setLastMoveIndex(null);
                if (aiMoveTimeout.current) {
                  clearTimeout(aiMoveTimeout.current);
                  aiMoveTimeout.current = null;
                }
              }}
              disabled={waitingForStart}
            >
              Restart round
            </button>
            <button
              type="button"
              className="rounded-xl border border-white/20 px-5 py-2 text-sm font-semibold text-white/90 transition hover:border-white/40 hover:text-white"
              onClick={() => {
                setPlayer(null);
                setAi(null);
                setBoard(createBoard(size));
                setStatus('Select your side to begin');
                setWinLine(null);
                setLastMoveIndex(null);
                if (aiMoveTimeout.current) {
                  clearTimeout(aiMoveTimeout.current);
                  aiMoveTimeout.current = null;
                }
              }}
            >
              Change setup
            </button>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { label: 'Wins', value: variantStats.wins },
              { label: 'Losses', value: variantStats.losses },
              { label: 'Draws', value: variantStats.draws },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="rounded-xl border border-white/10 bg-white/5 p-4 text-center shadow-inner"
              >
                <p className="text-xs uppercase tracking-[0.3em] text-slate-300">{label}</p>
                <p className="mt-2 text-2xl font-bold text-white">{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span>Performance</span>
              <span>{totalGames ? `${winRate}% win rate` : 'No games yet'}</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-400 to-emerald-400 transition-all duration-300"
                style={{ width: `${totalGames ? winRate : 0}%` }}
              />
            </div>
          </div>
        </section>

        <aside className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/30 backdrop-blur">
          <h2 className="text-lg font-semibold text-white">Game settings</h2>
          <p className="mt-1 text-sm text-slate-300">Tune your challenge on the fly.</p>

          <div className="mt-6 space-y-5">
            <label className="block text-sm font-medium text-slate-200">
              Board size
              <select
                className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-white shadow-inner focus:border-sky-400 focus:outline-none"
                value={size}
                onChange={(e) => setSize(parseInt(e.target.value, 10))}
              >
                <option value={3}>3 × 3 (Classic)</option>
                <option value={4}>4 × 4 (Extended)</option>
              </select>
            </label>

            <label className="block text-sm font-medium text-slate-200">
              Ruleset
              <select
                className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-white shadow-inner focus:border-sky-400 focus:outline-none"
                value={mode}
                onChange={(e) => setMode(e.target.value)}
              >
                <option value="classic">Classic (three-in-a-row wins)</option>
                <option value="misere">Misère (avoid three-in-a-row)</option>
              </select>
            </label>

            <label className="block text-sm font-medium text-slate-200">
              AI difficulty
              <select
                className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-white shadow-inner focus:border-sky-400 focus:outline-none"
                value={level}
                onChange={(e) => setLevel(e.target.value)}
              >
                <option value="easy">Easy (relaxed)</option>
                <option value="medium">Medium (mixes it up)</option>
                <option value="hard">Hard (optimal)</option>
              </select>
            </label>

            <label className="block text-sm font-medium text-slate-200">
              Piece style
              <select
                className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-white shadow-inner focus:border-sky-400 focus:outline-none"
                value={skin}
                onChange={(e) => setSkin(e.target.value)}
              >
                {Object.keys(SKINS).map((k) => (
                  <option key={k} value={k}>
                    {k.charAt(0).toUpperCase() + k.slice(1)}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              className="w-full rounded-xl border border-white/20 px-4 py-2 text-sm font-semibold text-white/90 transition hover:border-rose-400/60 hover:text-white"
              onClick={() => {
                setStats((prev) => {
                  const updated = { ...prev, [variantKey]: { wins: 0, losses: 0, draws: 0 } };
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('tictactoeStats', JSON.stringify(updated));
                  }
                  return updated;
                });
              }}
            >
              Reset current stats
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
};

export { checkWinner, minimax } from '../../apps/games/tictactoe/logic';

export default function TicTacToeApp() {
  return (
    <GameLayout gameId="tictactoe">
      <TicTacToe />
    </GameLayout>
  );
}
