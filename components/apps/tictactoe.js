import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import GameLayout from './GameLayout';
import { checkWinner, minimax, createBoard } from '../../apps/games/tictactoe/logic';

const DEFAULT_RECORD = {
  wins: 0,
  losses: 0,
  draws: 0,
  streakType: null,
  streakCount: 0,
  bestWinStreak: 0,
  history: [],
};

const SKINS = {
  classic: { X: 'X', O: 'O' },
  emoji: { X: '❌', O: '⭕' },
  animals: { X: '🐱', O: '🐶' },
  fruits: { X: '🍎', O: '🍌' },
};

const AI_LEVELS = [
  { id: 'easy', label: 'Easy', hint: 'Random playful moves.' },
  { id: 'medium', label: 'Medium', hint: 'Mix of intuition and strategy.' },
  { id: 'hard', label: 'Expert', hint: 'Perfect play via minimax.' },
];

const loadStats = () => {
  if (typeof window === 'undefined') return {};
  try {
    const stored = JSON.parse(localStorage.getItem('tictactoeStats') || '{}');
    return Object.keys(stored).reduce((acc, key) => {
      acc[key] = {
        ...DEFAULT_RECORD,
        ...stored[key],
        history: Array.isArray(stored[key]?.history) ? stored[key].history : [],
      };
      return acc;
    }, {});
  } catch {
    return {};
  }
};

const TicTacToe = () => {
  const [size, setSize] = useState(3);
  const [mode, setMode] = useState('classic');
  const [skin, setSkin] = useState('classic');
  const [level, setLevel] = useState('hard');
  const [board, setBoard] = useState(createBoard(3));
  const [player, setPlayer] = useState(null);
  const [ai, setAi] = useState(null);
  const [status, setStatus] = useState('Choose X or O');
  const [winLine, setWinLine] = useState(null);
  const [stats, setStats] = useState(loadStats);
  const [previewIndex, setPreviewIndex] = useState(null);
  const [lastOutcome, setLastOutcome] = useState(null);
  const confettiRef = useRef(null);

  const lineRef = useRef(null);

  const variantKey = `${mode}-${size}`;
  const variantStats = useMemo(
    () => ({
      ...DEFAULT_RECORD,
      ...(stats?.[variantKey] || {}),
      history: stats?.[variantKey]?.history || [],
    }),
    [stats, variantKey]
  );

  useEffect(() => {
    let mounted = true;
    if (typeof window !== 'undefined') {
      import('canvas-confetti').then((mod) => {
        if (mounted) {
          confettiRef.current = mod.default || mod;
        }
      });
    }
    return () => {
      mounted = false;
    };
  }, []);

  const recordResult = useCallback(
    (res) => {
      setStats((prev) => {
        const current = {
          ...DEFAULT_RECORD,
          ...(prev?.[variantKey] || {}),
          history: prev?.[variantKey]?.history || [],
        };
        const streakType = res === 'draw' ? null : res;
        const streakCount =
          res === 'draw'
            ? 0
            : current.streakType === res
            ? current.streakCount + 1
            : 1;
        const nextHistory = [
          {
            id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            result: res,
            mode,
            size,
            player,
            ai,
            timestamp: new Date().toISOString(),
          },
          ...current.history,
        ].slice(0, 10);
        const updatedVariant = {
          wins: res === 'win' ? current.wins + 1 : current.wins,
          losses: res === 'loss' ? current.losses + 1 : current.losses,
          draws: res === 'draw' ? current.draws + 1 : current.draws,
          streakType,
          streakCount,
          bestWinStreak:
            res === 'win'
              ? Math.max(current.bestWinStreak || 0, streakCount)
              : current.bestWinStreak || 0,
          history: nextHistory,
        };
        const updated = {
          ...prev,
          [variantKey]: updatedVariant,
        };
        if (typeof window !== 'undefined') {
          localStorage.setItem('tictactoeStats', JSON.stringify(updated));
        }
        return updated;
      });
      setLastOutcome(res);
    },
    [variantKey, mode, size, player, ai]
  );

  useEffect(() => {
    setBoard(createBoard(size));
    setPlayer(null);
    setAi(null);
    setStatus('Choose X or O');
    setWinLine(null);
    setPreviewIndex(null);
    setLastOutcome(null);
  }, [size, mode]);

  const startGame = (p) => {
    const a = p === 'X' ? 'O' : 'X';
    setPlayer(p);
    setAi(a);
    setBoard(createBoard(size));
    setStatus(`${SKINS[skin][p]}'s turn`);
    setWinLine(null);
    setPreviewIndex(null);
  };

  const handleClick = (idx) => {
    if (player === null) return;
    if (board[idx] || checkWinner(board, size, mode === 'misere').winner) return;
    const newBoard = board.slice();
    newBoard[idx] = player;
    setBoard(newBoard);
  };

  useEffect(() => {
    if (player === null || ai === null) return;
    const { winner, line } = checkWinner(board, size, mode === 'misere');
    if (winner) {
      if (winner === 'draw') {
        setStatus("It's a draw! Keep the streak alive next round.");
      } else {
        setStatus(`${SKINS[skin][winner]} claims the board!`);
      }
      setWinLine(line);
      if (winner === 'draw') recordResult('draw');
      else if (winner === player) recordResult('win');
      else recordResult('loss');
      if (winner === player) {
        const confetti = confettiRef.current;
        if (confetti) {
          confetti({
            particleCount: 160,
            spread: 70,
            origin: { y: 0.3 },
          });
        }
      }
      return;
    }
    const filled = board.filter(Boolean).length;
    const isPlayerTurn =
      (player === 'X' && filled % 2 === 0) || (player === 'O' && filled % 2 === 1);
    if (!isPlayerTurn) {
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
          : minimax(board.slice(), ai, size, mode === 'misere').index;
      } else {
        move = minimax(board.slice(), ai, size, mode === 'misere').index;
      }
      if (move >= 0) {
        const newBoard = board.slice();
        newBoard[move] = ai;
        setTimeout(() => setBoard(newBoard), level === 'hard' ? 120 : 200);
      }
    } else {
      setStatus(`${SKINS[skin][player]}'s turn`);
    }
  }, [board, player, ai, size, skin, mode, level, recordResult]);

  useEffect(() => {
    if (winLine && lineRef.current) {
      const line = lineRef.current;
      const length = line.getTotalLength();
      line.style.transition = 'none';
      line.style.strokeDasharray = String(length);
      line.style.strokeDashoffset = String(length);
      requestAnimationFrame(() => {
        line.style.transition = 'stroke-dashoffset 0.5s ease, stroke 0.5s ease';
        line.style.strokeDashoffset = '0';
      });
    }
  }, [winLine]);

  useEffect(() => {
    if (!lastOutcome) return;
    if (lastOutcome === 'win' && (variantStats.streakCount || 0) >= 3) {
      const confetti = confettiRef.current;
      if (confetti) {
        confetti({
          particleCount: 220,
          spread: 100,
          origin: { y: 0.2 },
        });
      }
    }
  }, [lastOutcome, variantStats.streakCount]);

  const currentSkin = SKINS[skin];

  const winningCells = useMemo(() => new Set(winLine || []), [winLine]);

  const renderScoreboard = () => (
    <div className="w-full rounded-2xl bg-slate-900/60 backdrop-blur border border-slate-700/60 shadow-inner p-4 text-slate-200">
      <h2 className="text-sm font-semibold tracking-wide uppercase text-slate-300">
        Scoreboard — {mode === 'misere' ? 'Misère' : 'Classic'} {size}×{size}
      </h2>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-base font-medium">
        <div className="rounded-lg bg-gradient-to-br from-emerald-500/20 via-emerald-500/10 to-transparent p-3">
          <p className="text-xs uppercase text-emerald-300">Wins</p>
          <p className="text-2xl font-bold text-emerald-200">{variantStats.wins}</p>
        </div>
        <div className="rounded-lg bg-gradient-to-br from-rose-500/20 via-rose-500/10 to-transparent p-3">
          <p className="text-xs uppercase text-rose-300">Losses</p>
          <p className="text-2xl font-bold text-rose-200">{variantStats.losses}</p>
        </div>
        <div className="rounded-lg bg-gradient-to-br from-amber-500/20 via-amber-500/10 to-transparent p-3">
          <p className="text-xs uppercase text-amber-300">Draws</p>
          <p className="text-2xl font-bold text-amber-200">{variantStats.draws}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
        <span>
          Current streak:{' '}
          {variantStats.streakType
            ? `${variantStats.streakCount} ${variantStats.streakType}${variantStats.streakCount === 1 ? '' : 's'}`
            : '—'}
        </span>
        <span>Best win streak: {variantStats.bestWinStreak || 0}</span>
      </div>
    </div>
  );

  const renderHistory = () => (
    <div className="w-full rounded-2xl bg-slate-900/50 border border-slate-700/50 p-4 text-slate-200">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
        Match history
      </h2>
      {variantStats.history.length === 0 ? (
        <p className="mt-3 text-xs text-slate-400">
          Play a few rounds to build your streak history.
        </p>
      ) : (
        <ol className="mt-3 space-y-2 max-h-40 overflow-auto pr-1" aria-live="polite">
          {variantStats.history.map((item) => {
            const outcomeColors = {
              win: 'text-emerald-300',
              loss: 'text-rose-300',
              draw: 'text-amber-300',
            };
            const outcomeLabels = {
              win: 'Win',
              loss: 'Loss',
              draw: 'Draw',
            };
            const label = outcomeLabels[item.result] || 'Result';
            const date = new Date(item.timestamp);
            return (
              <li
                key={item.id}
                className="flex items-center justify-between rounded-lg bg-slate-800/70 px-3 py-2 text-xs"
              >
                <span className={`${outcomeColors[item.result]} font-semibold`}>{label}</span>
                <span className="text-slate-400">
                  {item.mode === 'misere' ? 'Misère' : 'Classic'} · {item.size}×{item.size} · {date.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );

  if (player === null) {
    return (
      <div className="h-full w-full overflow-y-auto bg-gradient-to-br from-slate-900 via-slate-950 to-black text-slate-100">
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 px-6 py-8">
          <div className="w-full rounded-3xl border border-slate-700/60 bg-slate-900/70 p-6 shadow-xl">
            <h1 className="text-2xl font-semibold text-emerald-300">Tic-Tac-Toe Arsenal</h1>
            <p className="mt-2 text-sm text-slate-300">
              Choose your battlefield configuration, preview streaks, and step into a shimmering grid of strategy.
            </p>
            <div className="mt-6 grid w-full gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-200">
                Board Size
                <select
                  value={size}
                  onChange={(e) => setSize(parseInt(e.target.value, 10))}
                  className="rounded-xl border border-slate-700 bg-slate-800/90 px-3 py-2 text-base text-slate-100 shadow-inner focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                >
                  <option value={3}>3×3 — Tactical clash</option>
                  <option value={4}>4×4 — Extended arena</option>
                </select>
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-200">
                Win Condition
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value)}
                  className="rounded-xl border border-slate-700 bg-slate-800/90 px-3 py-2 text-base text-slate-100 shadow-inner focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                >
                  <option value="classic">Classic — Three aligned wins</option>
                  <option value="misere">Misère — Force your rival to align</option>
                </select>
              </label>
              <fieldset className="col-span-full" aria-label="AI difficulty">
                <legend className="mb-2 text-sm font-medium text-slate-200">AI Difficulty</legend>
                <div
                  role="radiogroup"
                  className="flex flex-wrap items-center gap-3"
                  aria-label="AI difficulty"
                >
                  {AI_LEVELS.map((option) => {
                    const isActive = level === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        role="radio"
                        aria-checked={isActive}
                        onClick={() => setLevel(option.id)}
                        className={`group rounded-2xl border px-4 py-3 text-left shadow transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300 ${
                          isActive
                            ? 'border-emerald-400/80 bg-emerald-500/20 text-emerald-200'
                            : 'border-slate-700 bg-slate-800/90 text-slate-200 hover:border-emerald-300/40 hover:text-emerald-200'
                        }`}
                      >
                        <span className="block text-sm font-semibold">{option.label}</span>
                        <span className="block text-xs text-slate-300 group-hover:text-emerald-200">
                          {option.hint}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-200">
                Board Skin
                <select
                  value={skin}
                  onChange={(e) => setSkin(e.target.value)}
                  className="rounded-xl border border-slate-700 bg-slate-800/90 px-3 py-2 text-base text-slate-100 shadow-inner focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                >
                  {Object.keys(SKINS).map((k) => (
                    <option key={k} value={k}>
                      {k.charAt(0).toUpperCase() + k.slice(1)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="mt-6 flex flex-col items-center gap-4">
              <p className="text-sm text-slate-300">Choose your side to begin</p>
              <div className="flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  className="rounded-2xl border border-emerald-400/70 bg-gradient-to-br from-emerald-500/20 via-emerald-500/10 to-transparent px-6 py-3 text-2xl font-semibold text-emerald-200 shadow-lg transition hover:scale-105 hover:border-emerald-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"
                  onClick={() => startGame('X')}
                >
                  {currentSkin.X} — First strike
                </button>
                <button
                  type="button"
                  className="rounded-2xl border border-sky-400/70 bg-gradient-to-br from-sky-500/20 via-sky-500/10 to-transparent px-6 py-3 text-2xl font-semibold text-sky-200 shadow-lg transition hover:scale-105 hover:border-sky-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
                  onClick={() => startGame('O')}
                >
                  {currentSkin.O} — Counter move
                </button>
              </div>
            </div>
          </div>
          {renderScoreboard()}
          {renderHistory()}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-y-auto bg-gradient-to-br from-slate-900 via-slate-950 to-black text-slate-100">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6 md:px-8">
        <div
          className="rounded-3xl border border-slate-700/60 bg-slate-900/70 p-4 shadow-2xl transition-all md:p-6"
        >
          <div
            className="flex flex-col items-center gap-4 rounded-2xl border border-slate-700/60 bg-gradient-to-br from-slate-800/80 via-slate-900/80 to-black/80 p-4 shadow-inner md:p-6"
          >
            <div
              className="text-center text-lg font-semibold text-emerald-300"
              role="status"
              aria-live="polite"
            >
              {status}
            </div>
            <div className="relative w-full max-w-[min(26rem,90vw)]">
              <div
                className="relative aspect-square w-full overflow-hidden rounded-[1.75rem] border border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 via-slate-900/60 to-slate-950 shadow-[0_0_30px_rgba(0,0,0,0.45)]"
              >
                <div
                  className="absolute inset-0 grid gap-3 p-3"
                  style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}
                >
                  {board.map((cell, idx) => {
                    const isWinning = winningCells.has(idx);
                    const row = Math.floor(idx / size) + 1;
                    const column = (idx % size) + 1;
                    const preview =
                      !cell && previewIndex === idx && player
                        ? currentSkin[player]
                        : null;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleClick(idx)}
                        onMouseEnter={() => setPreviewIndex(idx)}
                        onMouseLeave={() => setPreviewIndex(null)}
                        onFocus={() => setPreviewIndex(idx)}
                        onBlur={() => setPreviewIndex(null)}
                        onTouchStart={() => setPreviewIndex(idx)}
                        aria-label={`Cell row ${row}, column ${column}`}
                        className={`group relative flex items-center justify-center rounded-2xl border border-slate-700/60 bg-slate-900/80 text-5xl font-semibold text-slate-100 transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300 ${
                          isWinning
                            ? 'animate-pulse border-emerald-400/80 bg-emerald-500/20 text-emerald-200 shadow-[0_0_25px_rgba(16,185,129,0.45)]'
                            : 'hover:-translate-y-1 hover:border-emerald-400/70 hover:bg-slate-800/90 hover:shadow-lg'
                        }`}
                      >
                        <span
                          className={`transition-transform duration-300 ${
                            isWinning ? 'scale-110' : 'group-hover:scale-105'
                          }`}
                        >
                          {cell ? (
                            currentSkin[cell]
                          ) : preview ? (
                            <span className="text-slate-300/50">{preview}</span>
                          ) : (
                            <span className="text-sm uppercase tracking-[0.35em] text-slate-500">
                              {row}-{column}
                            </span>
                          )}
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
                          stroke="url(#winGradient)"
                          strokeWidth="14"
                          strokeLinecap="round"
                        />
                      );
                    })()}
                    <defs>
                      <linearGradient id="winGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#34d399" />
                        <stop offset="50%" stopColor="#22d3ee" />
                        <stop offset="100%" stopColor="#a855f7" />
                      </linearGradient>
                    </defs>
                  </svg>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
              <button
                type="button"
                className="rounded-xl border border-emerald-400/60 bg-emerald-500/20 px-4 py-2 font-semibold text-emerald-200 shadow transition hover:border-emerald-300 hover:bg-emerald-500/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"
                onClick={() => {
                  setBoard(createBoard(size));
                  setStatus(`${currentSkin[player]}'s turn`);
                  setWinLine(null);
                  setPreviewIndex(null);
                }}
              >
                Restart Round
              </button>
              <button
                type="button"
                className="rounded-xl border border-slate-600 bg-slate-800/80 px-4 py-2 font-semibold text-slate-200 shadow transition hover:border-slate-400 hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-200"
                onClick={() => {
                  setPlayer(null);
                  setAi(null);
                  setBoard(createBoard(size));
                  setStatus('Choose X or O');
                  setWinLine(null);
                  setPreviewIndex(null);
                }}
              >
                Reconfigure Match
              </button>
              <button
                type="button"
                className="rounded-xl border border-amber-400/60 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-200 shadow transition hover:border-amber-300 hover:bg-amber-500/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
                onClick={() => {
                  setStats((prev) => {
                    const updated = { ...prev, [variantKey]: { ...DEFAULT_RECORD } };
                    if (typeof window !== 'undefined') {
                      localStorage.setItem('tictactoeStats', JSON.stringify(updated));
                    }
                    return updated;
                  });
                  setLastOutcome(null);
                }}
              >
                Reset Stats
              </button>
            </div>
          </div>
        </div>
        {renderScoreboard()}
        {renderHistory()}
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
