import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Overlay, useGameLoop } from './Games/common';
import {
  BOARD_WIDTH,
  CANDY_COLORS,
  createBoard,
  detonateColorBomb,
  findMatches,
  initialBoosters,
  isAdjacent,
  resolveBoard,
  scoreCascade,
  shuffleBoard,
  swapCandies,
  useCandyCrushStats,
} from './candy-crush-logic';
import usePersistentState from '../../hooks/usePersistentState';
import { getAudioContext } from '../../utils/audio';

const cellSize = 44;

const isBoolean = (value) => typeof value === 'boolean';

const clampChannel = (value) => Math.max(0, Math.min(255, Math.round(value)));

const parseHex = (hex) => {
  if (typeof hex !== 'string') return null;
  const normalized = hex.trim();
  if (!normalized.startsWith('#')) return null;
  const value = normalized.slice(1);

  if (value.length === 3) {
    const channels = value.split('').map((char) => parseInt(char.repeat(2), 16));
    if (channels.some(Number.isNaN)) return null;
    return channels;
  }

  if (value.length !== 6) return null;

  const channels = [value.slice(0, 2), value.slice(2, 4), value.slice(4, 6)].map((chunk) =>
    parseInt(chunk, 16),
  );
  if (channels.some(Number.isNaN)) return null;
  return channels;
};

const adjustColor = (hex, amount) => {
  const channels = parseHex(hex);
  if (!channels) return hex;

  const adjusted = channels.map((channel) => {
    if (amount >= 0) {
      return clampChannel(channel + (255 - channel) * amount);
    }
    return clampChannel(channel * (1 + amount));
  });

  const toHex = (channel) => channel.toString(16).padStart(2, '0');
  return `#${adjusted.map(toHex).join('')}`;
};

const createCandyStyle = (color) => {
  if (!color) {
    return { background: 'transparent' };
  }

  const glow = adjustColor(color, 0.55);
  const accent = adjustColor(color, 0.25);
  const shadow = adjustColor(color, -0.45);

  return {
    background: `radial-gradient(circle at 25% 25%, ${accent} 0%, transparent 55%), linear-gradient(145deg, ${color} 0%, ${shadow} 100%)`,
    boxShadow: `0 0 0.85rem ${glow}66, inset 0 1px 0 ${accent}aa, inset 0 -3px 8px ${shadow}aa`,
    borderColor: `${glow}55`,
  };
};

const CandyCrush = () => {
  const rngRef = useRef(() => Math.random());
  const [board, setBoard] = useState(() => createBoard(BOARD_WIDTH, CANDY_COLORS, rngRef.current));
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [moves, setMoves] = useState(0);
  const [message, setMessage] = useState('Match three candies to start.');
  const [selected, setSelected] = useState(null);
  const [boosters, setBoosters] = useState(() => ({ ...initialBoosters }));
  const [paused, setPaused] = useState(false);
  const [lastCascade, setLastCascade] = useState(null);
  const dragSource = useRef(null);
  const cascadeSource = useRef('auto');
  const started = useRef(false);
  const { bestScore, bestStreak, updateStats } = useCandyCrushStats();
  const [muted, setMuted] = usePersistentState('candy-crush:muted', false, isBoolean);

  const playTone = useCallback(
    (frequency, duration = 0.35) => {
      if (muted || typeof window === 'undefined') return;
      try {
        const ctx = getAudioContext();
        const now = ctx.currentTime;
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(frequency, now);
        oscillator.connect(gain);
        gain.connect(ctx.destination);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.2, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
        oscillator.start(now);
        oscillator.stop(now + duration + 0.05);
      } catch (error) {
        // Ignore AudioContext errors in environments without audio support.
      }
    },
    [muted],
  );

  const playMatchSound = useCallback(() => playTone(720, 0.3), [playTone]);
  const playFailSound = useCallback(() => playTone(220, 0.25), [playTone]);

  const stats = useMemo(
    () => [
      { label: 'Score', value: score },
      { label: 'Moves', value: moves },
      { label: 'Streak', value: streak },
      { label: 'Best Score', value: bestScore },
      { label: 'Best Streak', value: bestStreak },
    ],
    [bestScore, bestStreak, moves, score, streak],
  );

  useEffect(() => {
    updateStats(score, streak);
  }, [score, streak, updateStats]);

  const step = useCallback(() => {
    setBoard((current) => {
      const result = resolveBoard(current, BOARD_WIDTH, CANDY_COLORS, rngRef.current);
      if (result.cascades.length === 0) {
        return current;
      }

      const totalPoints = result.cascades.reduce(
        (total, cascade, index) => total + scoreCascade(cascade, index + 1),
        0,
      );

      if (totalPoints > 0) {
        setScore((prev) => prev + totalPoints);
        const shouldAnnounce = cascadeSource.current !== 'auto' || started.current;
        if (shouldAnnounce) {
          setLastCascade({
            chain: result.cascades.length,
            cleared: result.cleared,
            points: totalPoints,
          });
          playMatchSound();
          setMessage(
            result.cascades.length > 1
              ? `Chain x${result.cascades.length}! Cleared ${result.cleared} candies (+${totalPoints}).`
              : `Cleared ${result.cleared} candies (+${totalPoints}).`,
          );
        }
      }

      if (cascadeSource.current === 'player') {
        setStreak((prev) => prev + 1);
        cascadeSource.current = 'auto';
      }

      return result.board;
    });
  }, [playMatchSound]);

  useGameLoop(step, !paused);

  const attemptSwap = useCallback(
    (from, to) => {
      if (!isAdjacent(from, to, BOARD_WIDTH)) {
        setSelected(to);
        setMessage('Choose an adjacent candy to swap.');
        return;
      }

      let matched = false;
      let shouldBuzz = false;

      setBoard((current) => {
        const next = swapCandies(current, from, to);
        const matches = findMatches(next, BOARD_WIDTH);
        if (matches.length === 0) {
          shouldBuzz = true;
          return current;
        }
        matched = true;
        cascadeSource.current = 'player';
        return next;
      });

      setSelected(null);

      if (!matched) {
        setStreak(0);
        setMessage('No match. Streak reset.');
        if (shouldBuzz) playFailSound();
        return;
      }

      started.current = true;
      setMoves((prev) => prev + 1);
      setMessage('Match found! Watch the cascade.');
    },
    [playFailSound],
  );

  const handleCellClick = useCallback(
    (index) => {
      if (selected === null) {
        setSelected(index);
        setMessage('Select an adjacent candy to swap.');
        return;
      }
      if (selected === index) {
        setSelected(null);
        return;
      }
      attemptSwap(selected, index);
    },
    [attemptSwap, selected],
  );

  const handleDragStart = useCallback(
    (index, event) => {
      dragSource.current = index;
      setSelected(index);
      event.dataTransfer.effectAllowed = 'move';
    },
    [],
  );

  const handleDrop = useCallback(
    (index) => {
      if (dragSource.current === null) return;
      attemptSwap(dragSource.current, index);
      dragSource.current = null;
    },
    [attemptSwap],
  );

  const handleDragEnd = useCallback(() => {
    dragSource.current = null;
    setSelected(null);
  }, []);

  const handleShuffle = useCallback(() => {
    let allowed = false;
    setBoosters((prev) => {
      if (prev.shuffle === 0) return prev;
      allowed = true;
      return { ...prev, shuffle: prev.shuffle - 1 };
    });
    if (!allowed) {
      setMessage('No shuffle boosters remaining.');
      return;
    }
    started.current = true;
    cascadeSource.current = 'player';
    setBoard((current) => shuffleBoard(current, rngRef.current));
    setMoves((prev) => prev + 1);
    setMessage('Board shuffled. Look for new matches.');
  }, []);

  const handleColorBomb = useCallback(() => {
    let allowed = false;
    setBoosters((prev) => {
      if (prev.colorBomb === 0) return prev;
      allowed = true;
      return { ...prev, colorBomb: prev.colorBomb - 1 };
    });
    if (!allowed) {
      setMessage('No color bombs available.');
      return;
    }

    let removed = 0;
    setBoard((current) => {
      const result = detonateColorBomb(current, BOARD_WIDTH, CANDY_COLORS, rngRef.current);
      removed = result.removed;
      if (removed > 0) {
        cascadeSource.current = 'player';
        started.current = true;
        return result.board;
      }
      return current;
    });

    if (removed === 0) {
      setMessage('Color bomb fizzled—no candies cleared.');
      return;
    }

    const bonus = removed * 12;
    setScore((prev) => prev + bonus);
    setMoves((prev) => prev + 1);
    setMessage(`Color bomb cleared ${removed} candies (+${bonus}).`);
    setLastCascade({ chain: 1, cleared: removed, points: bonus });
    playMatchSound();
  }, [playMatchSound]);

  const handleReset = useCallback(() => {
    setBoard(createBoard(BOARD_WIDTH, CANDY_COLORS, rngRef.current));
    setScore(0);
    setStreak(0);
    setMoves(0);
    setBoosters({ ...initialBoosters });
    setSelected(null);
    setLastCascade(null);
    setPaused(false);
    cascadeSource.current = 'auto';
    started.current = false;
    setMessage('New board ready. Match three candies!');
  }, []);

  const handlePause = useCallback(() => {
    setPaused(true);
    setMessage('Game paused.');
  }, []);

  const handleResume = useCallback(() => {
    setPaused(false);
    setMessage('Game resumed.');
  }, []);

  const handleToggleSound = useCallback(
    (nextMuted) => {
      setMuted(nextMuted);
      setMessage(nextMuted ? 'Sound muted.' : 'Sound on.');
    },
    [setMuted],
  );

  const gridStyle = useMemo(
    () => ({
      gridTemplateColumns: `repeat(${BOARD_WIDTH}, ${cellSize}px)`,
      gridAutoRows: `${cellSize}px`,
    }),
    [],
  );

  const candyStyles = useMemo(() => board.map((color) => createCandyStyle(color)), [board]);

  const statusLabel = paused ? 'Paused' : 'Active';
  const statusTheme = paused
    ? 'border-rose-500/50 bg-rose-500/10 text-rose-200 shadow-[0_0_12px_rgba(244,63,94,0.35)]'
    : 'border-cyan-500/60 bg-cyan-500/10 text-cyan-100 shadow-[0_0_18px_rgba(14,165,233,0.35)]';

  return (
    <div className="relative flex flex-col gap-6 rounded-3xl border border-cyan-500/10 bg-gradient-to-br from-slate-950 via-slate-950/85 to-slate-900/90 p-6 text-sm text-cyan-100 shadow-[0_0_32px_rgba(8,47,73,0.45)] backdrop-blur-xl sm:text-base">
      <Overlay
        onPause={handlePause}
        onResume={handleResume}
        muted={muted}
        onToggleSound={handleToggleSound}
      />
      <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
        <div className="flex w-full flex-col gap-6 xl:max-w-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold uppercase tracking-[0.35em] text-cyan-200 sm:text-xl">
                Kali Crush
              </h2>
              <p className="text-xs text-cyan-300/70 sm:text-sm">Match neon candies to keep the breach streak alive.</p>
            </div>
            <span
              className={`inline-flex items-center justify-center rounded-full border px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.3em] transition ${statusTheme}`}
            >
              {statusLabel}
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {stats.map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-cyan-500/15 bg-slate-950/60 px-4 py-3 shadow-[0_6px_22px_rgba(8,145,178,0.18)] backdrop-blur"
              >
                <div className="text-[0.65rem] font-semibold uppercase tracking-[0.4em] text-cyan-400/80">
                  {item.label}
                </div>
                <div className="mt-2 text-2xl font-semibold tabular-nums text-cyan-50">{item.value}</div>
              </div>
            ))}
          </div>
          <div className="rounded-2xl border border-cyan-500/15 bg-slate-950/60 px-4 py-4 shadow-[0_8px_28px_rgba(8,145,178,0.2)] backdrop-blur">
            <div className="text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-cyan-400/80">Status Feed</div>
            <p className="mt-2 text-sm leading-snug text-cyan-100" aria-live="polite">
              {message}
            </p>
            {lastCascade && (
              <p className="mt-2 text-xs text-cyan-300/80">
                Last chain cleared {lastCascade.cleared} candies for {lastCascade.points} points
                {lastCascade.chain > 1 ? ` (x${lastCascade.chain})` : ''}.
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="group relative overflow-hidden rounded-lg border border-cyan-500/30 bg-slate-950/70 px-4 py-2 font-semibold text-cyan-100 shadow-[0_0_18px_rgba(8,47,73,0.45)] transition hover:border-cyan-300/60 hover:text-white hover:shadow-[0_0_24px_rgba(14,165,233,0.3)] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
              Reset Grid
            </button>
            <button
              type="button"
              onClick={handleShuffle}
              disabled={boosters.shuffle === 0}
              className="group relative overflow-hidden rounded-lg border border-cyan-500/40 bg-gradient-to-r from-sky-700/80 via-cyan-600/80 to-sky-500/80 px-4 py-2 font-semibold text-cyan-50 shadow-[0_0_24px_rgba(14,165,233,0.35)] transition hover:from-sky-600/90 hover:to-sky-400/90 disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
              Shuffle ({boosters.shuffle})
            </button>
            <button
              type="button"
              onClick={handleColorBomb}
              disabled={boosters.colorBomb === 0}
              className="group relative overflow-hidden rounded-lg border border-fuchsia-500/50 bg-gradient-to-r from-fuchsia-700/80 via-pink-600/80 to-rose-500/80 px-4 py-2 font-semibold text-fuchsia-50 shadow-[0_0_24px_rgba(217,70,239,0.35)] transition hover:from-fuchsia-600/90 hover:to-rose-400/90 disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
              Color Bomb ({boosters.colorBomb})
            </button>
          </div>
        </div>
        <div className="flex flex-1 flex-col items-center gap-4">
          <div className="rounded-3xl border border-cyan-500/20 bg-slate-950/60 p-4 shadow-[0_0_40px_rgba(8,145,178,0.35)] backdrop-blur-lg">
            <div className="grid gap-2" style={gridStyle}>
              {board.map((color, index) => (
                <button
                  key={index}
                  type="button"
                  draggable
                  onDragStart={(event) => handleDragStart(index, event)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    handleDrop(index);
                  }}
                  onDragEnd={handleDragEnd}
                  onClick={() => handleCellClick(index)}
                  aria-pressed={selected === index}
                  className={`relative overflow-hidden rounded-xl border bg-slate-900/60 transition duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
                    selected === index
                      ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-slate-950'
                      : 'hover:scale-[1.02] hover:shadow-[0_0_14px_rgba(56,189,248,0.35)]'
                  }`}
                  style={{
                    ...candyStyles[index],
                    width: cellSize,
                    height: cellSize,
                  }}
                >
                  <span className="sr-only">Candy {index + 1}</span>
                </button>
              ))}
            </div>
          </div>
          <p className="text-xs text-cyan-300/70">
            Drag or click adjacent candies to execute swaps. Boosters refill on reset.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CandyCrush;

