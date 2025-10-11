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

  return (
    <div className="relative flex flex-col gap-4 p-4 text-sm sm:text-base">
      <Overlay
        onPause={handlePause}
        onResume={handleResume}
        muted={muted}
        onToggleSound={handleToggleSound}
      />
      <div className="flex flex-wrap items-start gap-6 pr-24">
        <div className="flex flex-wrap gap-6">
          {stats.map((item) => (
            <div key={item.label} className="rounded-md border border-slate-700/40 bg-slate-900/40 px-3 py-2 shadow">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                {item.label}
              </div>
              <div className="font-semibold tabular-nums text-lg text-slate-50">{item.value}</div>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="rounded-md border border-slate-600/50 bg-slate-800/70 px-3 py-1.5 text-slate-100 shadow hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={handleShuffle}
              disabled={boosters.shuffle === 0}
              className="rounded-md border border-slate-600/50 bg-purple-800/70 px-3 py-1.5 text-slate-100 shadow hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
            >
              Shuffle ({boosters.shuffle})
            </button>
            <button
              type="button"
              onClick={handleColorBomb}
              disabled={boosters.colorBomb === 0}
              className="rounded-md border border-slate-600/50 bg-amber-800/70 px-3 py-1.5 text-slate-100 shadow hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
            >
              Color Bomb ({boosters.colorBomb})
            </button>
          </div>
          <div className="rounded-lg border border-slate-700/40 bg-slate-900/40 px-4 py-3 text-slate-100 shadow-inner">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Status</div>
            <p className="mt-1 text-sm leading-snug">{message}</p>
            {lastCascade && (
              <p className="mt-1 text-xs text-slate-300">
                Last chain: cleared {lastCascade.cleared} candies for {lastCascade.points} points
                {lastCascade.chain > 1 ? ` (x${lastCascade.chain})` : ''}.
              </p>
            )}
          </div>
        </div>
      </div>
      <div className="flex flex-col items-center gap-3">
        <div className="grid gap-1" style={gridStyle}>
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
              className={`relative rounded-md border border-slate-700/40 shadow-inner transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 ${
                selected === index ? 'ring-2 ring-orange-400' : ''
              }`}
              style={{
                backgroundColor: color || 'transparent',
                width: cellSize,
                height: cellSize,
              }}
            >
              <span className="sr-only">Candy {index + 1}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CandyCrush;

