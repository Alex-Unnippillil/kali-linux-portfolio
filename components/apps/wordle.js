import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  getWordOfTheDay,
  buildResultMosaic,
  dictionaries as wordleDictionaries,
} from '../../utils/wordle';

// Determine today's puzzle key for local storage
const todayKey = new Date().toISOString().split('T')[0];

const dictionaries = wordleDictionaries;

// Persist state to localStorage so that refreshes keep progress/history
// and games reset each day.
function usePersistentState(key, defaultValue) {
  const [state, setState] = useState(defaultValue);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(key);
      setState(stored ? JSON.parse(stored) : defaultValue);
    } catch {
      setState(defaultValue);
    }
  }, [key, defaultValue]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(state));
    }
  }, [key, state]);

  return [state, setState];
}

// Evaluate a guess against the solution producing statuses for each letter.
const evaluateGuess = (guess, answer) => {
  const result = Array(5).fill('absent');
  const answerArr = answer.split('');
  const used = Array(5).fill(false);

  // First pass - correct placements
  guess.split('').forEach((ch, i) => {
    if (answerArr[i] === ch) {
      result[i] = 'correct';
      used[i] = true;
    }
  });

  // Second pass - present letters
  guess.split('').forEach((ch, i) => {
    if (result[i] === 'correct') return;
    const idx = answerArr.findIndex((a, j) => !used[j] && a === ch);
    if (idx !== -1) {
      result[i] = 'present';
      used[idx] = true;
    }
  });

  return result;
};

const Wordle = () => {
  const [dictName, setDictName] = usePersistentState('wordle-dictionary', 'common');
  const wordList = dictionaries[dictName];
  const solution = useMemo(() => getWordOfTheDay(dictName), [dictName]);

  // guesses for today are stored under a daily key so a new game starts each day
  const [guesses, setGuesses] = usePersistentState(
    `wordle-guesses-${dictName}-${todayKey}`,
    []
  );
  const [history, setHistory] = usePersistentState(
    `wordle-history-${dictName}`,
    {}
  );
  const [streak, setStreak] = usePersistentState(
    `wordle-streak-${dictName}`,
    { current: 0, max: 0 }
  );
  const defaultStats = useMemo(
    () => ({
      played: 0,
      won: 0,
      guessDist: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, fail: 0 },
    }),
    []
  );
  const [stats, setStats] = usePersistentState(
    `wordle-stats-${dictName}`,
    defaultStats
  );
  const [guess, setGuess] = useState('');
  const [message, setMessage] = useState('');
  const [analysis, setAnalysis] = useState('');
  const [revealMap, setRevealMap] = useState({});
  const [boardReady, setBoardReady] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(true);
  const [isStatsOpen, setIsStatsOpen] = useState(false);

  // settings
  const [colorBlind, setColorBlind] = usePersistentState(
    'wordle-colorblind',
    false
  );
  const [hardMode, setHardMode] = usePersistentState('wordle-hardmode', false);

  const isSolved = guesses.some((g) => g.guess === solution);
  const isGameOver = isSolved || guesses.length === 6;

  useEffect(() => {
    setGuess('');
    setMessage('');
    setAnalysis('');
    setRevealMap({});
  }, [dictName]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = () => setPrefersReducedMotion(media.matches);
    handleChange();
    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) {
      setBoardReady(true);
      return;
    }
    setBoardReady(false);
    const timer = setTimeout(() => setBoardReady(true), 80);
    return () => clearTimeout(timer);
  }, [dictName, solution, prefersReducedMotion]);

  const colors = colorBlind
    ? {
        correct: '#2563eb',
        present: '#f97316',
        absent: '#4b5563',
      }
    : {
        correct: '#538d4e',
        present: '#b59f3b',
        absent: '#3a3a3c',
      };

  const keyColors = colorBlind
    ? { correct: '#2563eb', present: '#f97316', absent: '#4b5563' }
    : { correct: '#538d4e', present: '#b59f3b', absent: '#3a3a3c' };

  const letterHints = useMemo(() => {
    const map = {};
    const priority = { absent: 0, present: 1, correct: 2 };
    guesses.forEach(({ guess: g, result }) => {
      for (let i = 0; i < g.length; i += 1) {
        const ch = g[i];
        const res = result[i];
        if (!map[ch] || priority[res] > priority[map[ch]]) {
          map[ch] = res;
        }
      }
    });
    return map;
  }, [guesses]);


  const getPossibleWords = () =>
    wordList.filter((word) =>
      guesses.every(
        (g) =>
          evaluateGuess(g.guess, word).join('') === g.result.join('')
      )
    );

  const calculateEntropy = (g, remaining) => {
    if (!remaining.length) return 0;
    const counts = {};
    remaining.forEach((w) => {
      const key = evaluateGuess(g, w).join('');
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.values(counts).reduce((sum, c) => {
      const p = c / remaining.length;
      return sum - p * Math.log2(p);
    }, 0);
  };

  const updateStreaks = (hist) => {
    const dates = Object.keys(hist).sort();
    let curr = 0;
    let max = 0;
    let prev = null;
    dates.forEach((d) => {
      const entry = hist[d];
      if (entry.success) {
        if (prev && new Date(prev).getTime() + 86400000 === new Date(d).getTime()) {
          curr += 1;
        } else {
          curr = 1;
        }
        prev = d;
        if (curr > max) max = curr;
      } else {
        curr = 0;
        prev = d;
      }
    });
    setStreak({ current: curr, max });
  };

  const handleAnalyze = () => {
    const upper = guess.toUpperCase();
    if (upper.length !== 5) {
      setAnalysis('Enter a full five-letter word to analyze.');
      return;
    }
    if (!wordList.includes(upper)) {
      setAnalysis('Word not in dictionary.');
      return;
    }
    const remaining = getPossibleWords();
    const entropy = calculateEntropy(upper, remaining);
    setAnalysis(
      `${remaining.length} words remaining; entropy ${entropy.toFixed(2)} bits`
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isGameOver) {
      setMessage(
        'Daily puzzle already complete. Switch dictionaries or come back tomorrow!'
      );
      return;
    }
    const upper = guess.toUpperCase();
    if (upper.length !== 5) {
      setMessage('Guesses must be exactly five letters.');
      return;
    }

    if (!wordList.includes(upper)) {
      setMessage('Word not in dictionary.');
      return;
    }

    if (hardMode) {
      const requiredPos = {};
      const requiredCounts = {};
      const forbiddenPos = {};

      guesses.forEach(({ guess: g, result }) => {
        const localCounts = {};
        for (let i = 0; i < 5; i += 1) {
          const ch = g[i];
          const res = result[i];
          if (res === 'correct') {
            requiredPos[i] = ch;
            localCounts[ch] = (localCounts[ch] || 0) + 1;
          } else if (res === 'present') {
            forbiddenPos[i] = forbiddenPos[i] || new Set();
            forbiddenPos[i].add(ch);
            localCounts[ch] = (localCounts[ch] || 0) + 1;
          }
        }
        Object.entries(localCounts).forEach(([ch, c]) => {
          requiredCounts[ch] = Math.max(requiredCounts[ch] || 0, c);
        });
      });

      for (const [idx, ch] of Object.entries(requiredPos)) {
        if (upper[Number(idx)] !== ch) {
          setMessage(
            `Hard mode: ${ch} must be in position ${Number(idx) + 1}.`
          );
          return;
        }
      }

      const guessCounts = {};
      for (let i = 0; i < 5; i += 1) {
        const ch = upper[i];
        guessCounts[ch] = (guessCounts[ch] || 0) + 1;
        if (forbiddenPos[i] && forbiddenPos[i].has(ch)) {
          setMessage(`Hard mode: ${ch} cannot be in position ${i + 1}.`);
          return;
        }
      }

      for (const [ch, count] of Object.entries(requiredCounts)) {
        if ((guessCounts[ch] || 0) < count) {
          setMessage(
            `Hard mode: guess must contain ${ch}${
              count > 1 ? ` (${count}x)` : ''
            }.`
          );
          return;
        }
      }
    }

    const result = evaluateGuess(upper, solution);
    const next = [...guesses, { guess: upper, result }];
    setGuesses(next);
    setGuess('');
    setMessage('');
    setAnalysis('');

    if (upper === solution || next.length === 6) {
      const newHistory = {
        ...history,
        [todayKey]: {
          guesses: next.length,
          solution,
          success: upper === solution,
        },
      };
      setHistory(newHistory);
      updateStreaks(newHistory);

      const newStats = {
        ...stats,
        played: stats.played + 1,
        won: stats.won + (upper === solution ? 1 : 0),
        guessDist: { ...stats.guessDist },
      };
      if (upper === solution) {
        newStats.guessDist[next.length] += 1;
      } else {
        newStats.guessDist.fail += 1;
      }
      setStats(newStats);
    }
  };

  const share = useCallback(() => {
    const mosaic = buildResultMosaic(
      guesses.map((g) => g.result),
      colorBlind
    );
    const text = `Wordle ${isSolved ? guesses.length : 'X'}/6\n${mosaic}`;
    if (navigator.clipboard) {
      navigator.clipboard
        .writeText(text)
        .then(() => setMessage('Copied results to clipboard!'))
        .catch(() =>
          setMessage('Unable to access clipboard. Copy manually from stats.')
        );
    } else {
      setMessage('Clipboard unavailable. Copy manually from stats.');
    }
  }, [colorBlind, guesses, isSolved]);

  useEffect(() => {
    if (!guesses.length) return;
    const rowIndex = guesses.length - 1;

    // reveal previous rows immediately
    setRevealMap((prev) => {
      const updated = { ...prev };
      for (let r = 0; r < rowIndex; r += 1) {
        for (let c = 0; c < 5; c += 1) {
          updated[`${r}-${c}`] = true;
        }
      }
      return updated;
    });

    if (prefersReducedMotion) {
      setRevealMap((prev) => {
        const upd = { ...prev };
        for (let c = 0; c < 5; c += 1) {
          upd[`${rowIndex}-${c}`] = true;
        }
        return upd;
      });
      return;
    }

    let frame;
    let start;
    let last = -1;
    const animate = (ts) => {
      if (!start) start = ts;
      const elapsed = ts - start;
      const col = Math.min(4, Math.floor(elapsed / 200));
      if (col > last) {
        setRevealMap((prev) => ({
          ...prev,
          [`${rowIndex}-${col}`]: true,
        }));
        last = col;
      }
      if (last < 4) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [guesses, prefersReducedMotion]);

  const renderCell = (row, col) => {
    const guessRow = guesses[row];
    const letter =
      guessRow?.guess[col] || (row === guesses.length ? guess[col] || '' : '');
    const status = guessRow?.result[col];
    const revealed = revealMap[`${row}-${col}`];
    const isActiveRow = row === guesses.length && !guessRow;
    const showStatus = status && revealed;
    const baseClasses =
      'relative w-10 h-10 md:w-12 md:h-12 flex items-center justify-center border-2 font-bold text-xl uppercase transition-colors duration-300 ease-out transform-gpu';
    const tileStyle = {};
    if (showStatus) {
      tileStyle.backgroundColor = colors[status];
      tileStyle.borderColor = colors[status];
      tileStyle.color = '#ffffff';
    }
    if (!showStatus) {
      tileStyle.borderColor = '#4b5563';
    }
    if (!prefersReducedMotion && status) {
      tileStyle.transition =
        'transform 420ms cubic-bezier(0.34, 1.56, 0.64, 1), background-color 300ms ease-out, border-color 300ms ease-out, color 300ms ease-out';
      tileStyle.transform = showStatus ? 'rotateX(0deg)' : 'rotateX(-90deg)';
      tileStyle.transitionDelay = `${col * 110}ms`;
    }
    const textStyle =
      !prefersReducedMotion && status
        ? {
            transition: 'opacity 220ms ease-out',
            transitionDelay: `${col * 110 + (showStatus ? 60 : 0)}ms`,
            opacity: showStatus ? 1 : 0,
          }
        : undefined;
    const ariaLabel = status
      ? `${letter || 'blank'} ${status}`
      : letter || (isActiveRow ? 'empty' : 'blank');
    return (
      <div
        key={col}
        className={baseClasses}
        style={tileStyle}
        role="gridcell"
        aria-label={ariaLabel}
      >
        <span style={textStyle}>{letter}</span>
      </div>
    );
  };

  const keyboardRows = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];
  const renderKey = (ch) => {
    const status = letterHints[ch];
    const keyStyle = {
      backgroundColor: status ? keyColors[status] : '#4b5563',
      color: status ? '#ffffff' : '#f3f4f6',
    };
    const hintText =
      status === 'correct'
        ? 'Correct letter & spot'
        : status === 'present'
        ? 'Correct letter, wrong spot'
        : status === 'absent'
        ? 'Letter not in solution'
        : 'Unused letter';
    return (
      <div
        key={ch}
        className="group relative flex-1 min-w-[2.25rem]">
        <div
          className="flex items-center justify-center rounded-md px-2 py-3 text-sm font-semibold uppercase shadow transition-all duration-200 ease-out hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-400"
          style={keyStyle}
          aria-label={`${ch} ${status || ''}`.trim() || ch}
        >
          {ch}
        </div>
        <div className="pointer-events-none absolute -top-10 left-1/2 z-10 hidden w-max -translate-x-1/2 rounded bg-gray-900/90 px-2 py-1 text-xs text-gray-100 shadow-lg transition-opacity duration-200 ease-out group-hover:block">
          {hintText}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full w-full flex flex-col items-center justify-start bg-ub-cool-grey text-white p-4 space-y-4 overflow-y-auto">
      <h1 className="text-xl font-bold">Wordle</h1>

      <div className="flex space-x-4">
        <label className="flex items-center space-x-1 text-sm">
          <input
            type="checkbox"
            checked={colorBlind}
            onChange={() => setColorBlind(!colorBlind)}
            aria-label="Toggle color blind palette"
          />
          <span>Color Blind</span>
        </label>
        <label className="flex items-center space-x-1 text-sm">
          <input
            type="checkbox"
            checked={hardMode}
            onChange={() => setHardMode(!hardMode)}
            aria-label="Toggle hard mode"
          />
          <span>Hard Mode</span>
        </label>
        <label className="flex items-center space-x-1 text-sm">
          <span>Word Pack</span>
          <select
            className="text-black text-sm"
            value={dictName}
            onChange={(e) => setDictName(e.target.value)}
            aria-label="Select dictionary word pack"
          >
            {Object.keys(dictionaries).map((name) => (
              <option key={name} value={name}>
                {name.charAt(0).toUpperCase() + name.slice(1)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div
        className="wordle-board grid grid-rows-6 gap-1 transition-all duration-500 ease-out"
        role="grid"
        aria-label="Wordle board"
        style={{
          opacity: boardReady ? 1 : 0,
          transform: boardReady ? 'translateY(0)' : 'translateY(12px)',
        }}
      >
        {Array.from({ length: 6 }).map((_, row) => (
          <div key={row} className="grid grid-cols-5 gap-1" role="row">
            {Array.from({ length: 5 }).map((_, col) => renderCell(row, col))}
          </div>
        ))}
      </div>

      <div className="space-y-2 w-full max-w-md" aria-label="Keyboard">
        {keyboardRows.map((row) => (
          <div key={row} className="flex w-full items-center justify-center gap-1">
            {row.split('').map((ch) => renderKey(ch))}
          </div>
        ))}
      </div>

      {!isGameOver && (
          <form onSubmit={handleSubmit} className="flex space-x-2">
            <input
              type="text"
              maxLength={5}
              value={guess}
              onChange={(e) => setGuess(e.target.value.toUpperCase())}
              className="w-32 p-2 text-black text-center uppercase"
              placeholder="Guess"
              aria-label="Enter your guess"
            />
            <button
              type="submit"
              className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded"
            >
            Submit
          </button>
          <button
            type="button"
            onClick={handleAnalyze}
            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded"
          >
            Analyze
          </button>
        </form>
      )}

      {isGameOver && (
        <div className="flex flex-col items-center space-y-2">
          <div className="flex gap-2">
            <button
              onClick={share}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
            >
              Share Mosaic
            </button>
            <button
              onClick={() => setIsStatsOpen(true)}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
            >
              View Stats
            </button>
          </div>
          <div
            role="img"
            aria-label="Emoji result grid"
            className="font-mono leading-5"
          >
            {buildResultMosaic(
              guesses.map((g) => g.result),
              colorBlind
            )
              .split('\n')
              .map((line, i) => (
                <div key={i}>{line}</div>
              ))}
          </div>
        </div>
      )}

      <div className="text-sm" aria-live="polite">
        {analysis}
      </div>
      <div className="text-sm" aria-live="polite" role="status">
        {message}
      </div>

      <div className="flex flex-col items-center space-y-1">
        <div className="text-sm">
          Played: {stats.played} | Win %:{' '}
          {stats.played ? Math.round((stats.won / stats.played) * 100) : 0}
        </div>
        <div className="text-xs">
          Guess dist: {Array.from({ length: 6 })
            .map((_, i) => `${i + 1}:${stats.guessDist[i + 1]}`)
            .join(' ')}{' '}
          X:{stats.guessDist.fail}
        </div>
        <div className="text-sm">
          Current streak: {streak.current} (max: {streak.max})
        </div>
        <Calendar history={history} colorBlind={colorBlind} />
        <button
          type="button"
          onClick={() => setIsStatsOpen(true)}
          className="mt-2 rounded bg-gray-700 px-3 py-1 text-sm hover:bg-gray-600"
        >
          Open detailed stats
        </button>
      </div>

      {isStatsOpen && (
        <StatsModal
          stats={stats}
          streak={streak}
          history={history}
          onClose={() => setIsStatsOpen(false)}
          colorBlind={colorBlind}
          onShare={share}
          guesses={guesses}
          isSolved={isSolved}
          solution={solution}
        />
      )}

      <style jsx>{`
        .wordle-board {
          perspective: 1200px;
        }
      `}</style>
    </div>
  );
};

const StatsModal = ({
  stats,
  streak,
  history,
  onClose,
  colorBlind,
  onShare,
  guesses,
  isSolved,
  solution,
}) => {
  const [animate, setAnimate] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setAnimate(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const guessEntries = useMemo(() => {
    return Array.from({ length: 6 }).map((_, i) => ({
      label: `${i + 1}`,
      value: stats.guessDist[i + 1] || 0,
    }));
  }, [stats.guessDist]);
  const failCount = stats.guessDist.fail || 0;
  const maxValue = Math.max(
    1,
    ...guessEntries.map((entry) => entry.value),
    failCount
  );
  const palette = colorBlind
    ? { correct: '#2563eb', present: '#f97316', absent: '#4b5563' }
    : { correct: '#538d4e', present: '#b59f3b', absent: '#3a3a3c' };

  const streakCard = (() => {
    const latestKey = Object.keys(history).sort().pop();
    const latest = latestKey ? history[latestKey] : null;
    const description = latest
      ? latest.success
        ? `Solved in ${latest.guesses} guesses`
        : `Missed "${latest.solution}"`
      : 'No games recorded yet';
    return { latestKey, description };
  })();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wordle-stats-title"
    >
      <div
        className={`w-full max-w-2xl rounded-lg border border-gray-700 bg-ub-dark shadow-2xl transition-all duration-500 ease-out ${
          animate ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
      >
        <div className="flex items-center justify-between border-b border-gray-700 px-4 py-3">
          <h2 id="wordle-stats-title" className="text-lg font-semibold">
            Daily stats
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded bg-gray-700 px-2 py-1 text-sm hover:bg-gray-600"
          >
            Close
          </button>
        </div>
        <div className="space-y-6 px-4 py-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-gray-700 bg-gray-800/60 p-4 text-center shadow-inner">
              <div className="text-3xl font-bold">{stats.played}</div>
              <div className="text-sm uppercase tracking-wide text-gray-300">
                Games played
              </div>
            </div>
            <div className="rounded-lg border border-gray-700 bg-gray-800/60 p-4 text-center shadow-inner">
              <div className="text-3xl font-bold">
                {stats.played
                  ? Math.round((stats.won / stats.played) * 100)
                  : 0}
                %
              </div>
              <div className="text-sm uppercase tracking-wide text-gray-300">
                Win rate
              </div>
            </div>
            <div className="rounded-lg border border-gray-700 bg-gray-800/60 p-4 text-center shadow-inner">
              <div className="text-3xl font-bold">{streak.current}</div>
              <div className="text-sm uppercase tracking-wide text-gray-300">
                Current streak (max {streak.max})
              </div>
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-300">
              Guess distribution
            </h3>
            <div className="space-y-2">
              {guessEntries.map((entry) => (
                <div key={entry.label} className="flex items-center gap-2">
                  <span className="w-6 text-right text-xs text-gray-300">
                    {entry.label}
                  </span>
                  <div className="h-8 w-full overflow-hidden rounded bg-gray-700/70">
                    <div
                      className="flex h-full items-center justify-between px-3 text-sm font-semibold transition-all duration-700 ease-out"
                      style={{
                        width: animate
                          ? `${(entry.value / maxValue) * 100}%`
                          : '0%',
                        backgroundColor: palette.correct,
                      }}
                    >
                      <span>{entry.value}</span>
                      <span className="text-xs uppercase tracking-wide text-gray-100">
                        guesses
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <span className="w-6 text-right text-xs text-gray-300">X</span>
                <div className="h-8 w-full overflow-hidden rounded bg-gray-700/70">
                  <div
                    className="flex h-full items-center justify-between px-3 text-sm font-semibold transition-all duration-700 ease-out"
                    style={{
                      width: animate
                        ? `${(failCount / maxValue) * 100}%`
                        : '0%',
                      backgroundColor: palette.absent,
                    }}
                  >
                    <span>{failCount}</span>
                    <span className="text-xs uppercase tracking-wide text-gray-100">
                      fails
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-gray-700 bg-gray-800/60 p-4 shadow-inner">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-300">
                Streak tracker
              </h3>
              <p className="text-sm text-gray-200">
                {streak.current > 0
                  ? `You are on a ${streak.current}-day streak.`
                  : 'Build your streak by solving consecutive puzzles.'}
              </p>
              {streakCard.latestKey && (
                <p className="mt-2 text-xs text-gray-400">
                  Last game ({streakCard.latestKey}): {streakCard.description}
                </p>
              )}
            </div>
            <div className="rounded-lg border border-gray-700 bg-gray-800/60 p-4 shadow-inner">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-300">
                Shareable summary
              </h3>
              <div className="rounded bg-gray-900/60 p-3 text-sm text-gray-100 shadow-inner">
                <p className="font-semibold">
                  Wordle {isSolved ? guesses.length : 'X'}/6 — {solution}
                </p>
                <p className="mt-1 text-xs uppercase tracking-wide text-gray-400">
                  {isSolved ? 'Solved puzzle' : 'Missed puzzle'}
                </p>
                <p className="mt-2 whitespace-pre-wrap font-mono text-xs leading-5">
                  {buildResultMosaic(
                    guesses.map((g) => g.result),
                    colorBlind
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={onShare}
                className="mt-3 w-full rounded bg-gray-700 px-3 py-2 text-sm font-semibold hover:bg-gray-600"
              >
                Copy summary
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Calendar = ({ history, colorBlind }) => {
  const today = new Date();
  const cells = [];
  for (let i = 29; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    const entry = history[key];
    let bg = '#374151';
    if (entry) {
      bg = entry.success
        ? colorBlind
          ? '#2563eb'
          : '#15803d'
        : colorBlind
        ? '#f97316'
        : '#b91c1c';
    }
    cells.push(
      <div
        key={key}
        className="h-4 w-4 rounded"
        style={{ backgroundColor: bg }}
        aria-label={`${key} ${entry ? (entry.success ? 'win' : 'loss') : 'no game'}`}
      ></div>
    );
  }
  return <div className="grid grid-cols-7 gap-1">{cells}</div>;
};

export default Wordle;

export const displayWordle = () => <Wordle />;

