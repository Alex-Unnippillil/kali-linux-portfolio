import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  getWordOfTheDay,
  buildResultMosaic,
  dictionaries as wordleDictionaries,
} from '../../utils/wordle';

// Determine today's puzzle key for local storage
const todayKey = new Date().toISOString().split('T')[0];

const dictionaries = wordleDictionaries;

const STATUSES = ['correct', 'present', 'absent'];
const STATUS_SET = new Set(STATUSES);

const sanitizeGuessText = (value) =>
  value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 5);

const normalizeBoolean = (value, fallback) =>
  typeof value === 'boolean' ? value : fallback;

const normalizeDictName = (value) =>
  dictionaries[value] ? value : 'common';

const normalizeGuesses = (value) => {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (entry) =>
        entry &&
        typeof entry.guess === 'string' &&
        entry.guess.length === 5 &&
        Array.isArray(entry.result) &&
        entry.result.length === 5 &&
        entry.result.every((res) => STATUS_SET.has(res))
    )
    .map((entry) => ({
      guess: entry.guess.toUpperCase(),
      result: entry.result,
    }))
    .slice(0, 6);
};

const normalizeHistory = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const next = {};
  Object.entries(value).forEach(([key, entry]) => {
    if (
      entry &&
      typeof entry === 'object' &&
      typeof entry.success === 'boolean' &&
      typeof entry.solution === 'string' &&
      typeof entry.guesses === 'number'
    ) {
      next[key] = {
        guesses: entry.guesses,
        solution: entry.solution,
        success: entry.success,
      };
    }
  });
  return next;
};

const normalizeStreak = (value) => {
  if (!value || typeof value !== 'object') return { current: 0, max: 0 };
  const current = Number.isFinite(value.current) ? Math.max(0, value.current) : 0;
  const max = Number.isFinite(value.max) ? Math.max(0, value.max) : 0;
  return { current, max };
};

const normalizeStats = (value, fallback) => {
  if (!value || typeof value !== 'object') return fallback;
  const guessDist = { ...fallback.guessDist };
  if (value.guessDist && typeof value.guessDist === 'object') {
    Object.keys(guessDist).forEach((key) => {
      const num = Number(value.guessDist[key]);
      guessDist[key] = Number.isFinite(num) ? Math.max(0, num) : guessDist[key];
    });
  }
  const played = Number.isFinite(value.played) ? Math.max(0, value.played) : fallback.played;
  const won = Number.isFinite(value.won) ? Math.max(0, value.won) : fallback.won;
  return { played, won, guessDist };
};

// Persist state to localStorage so that refreshes keep progress/history
// and games reset each day.
function usePersistentState(key, defaultValue, normalize) {
  const [state, setState] = useState(defaultValue);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(key);
      if (!stored) {
        setState(defaultValue);
        return;
      }
      const parsed = JSON.parse(stored);
      const nextValue = normalize ? normalize(parsed, defaultValue) : parsed;
      setState(nextValue ?? defaultValue);
    } catch {
      setState(defaultValue);
    }
  }, [key, defaultValue, normalize]);

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
  const [dictName, setDictName] = usePersistentState(
    'wordle-dictionary',
    'common',
    normalizeDictName
  );
  const activeDictName = useMemo(
    () => normalizeDictName(dictName),
    [dictName]
  );
  const wordList = dictionaries[activeDictName] || dictionaries.common || [];
  const solution = useMemo(
    () => getWordOfTheDay(activeDictName),
    [activeDictName]
  );
  const emptyGuesses = useMemo(() => [], []);
  const emptyHistory = useMemo(() => ({}), []);
  const defaultStreak = useMemo(() => ({ current: 0, max: 0 }), []);

  // guesses for today are stored under a daily key so a new game starts each day
  const [guesses, setGuesses] = usePersistentState(
    `wordle-guesses-${dictName}-${todayKey}`,
    emptyGuesses,
    normalizeGuesses
  );
  const [history, setHistory] = usePersistentState(
    `wordle-history-${dictName}`,
    emptyHistory,
    normalizeHistory
  );
  const [streak, setStreak] = usePersistentState(
    `wordle-streak-${dictName}`,
    defaultStreak,
    normalizeStreak
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
    defaultStats,
    normalizeStats
  );
  const [guess, setGuess] = useState('');
  const [message, setMessage] = useState('');
  const [analysis, setAnalysis] = useState('');
  const [revealMap, setRevealMap] = useState({});
  const [shareText, setShareText] = useState('');
  const [showHelp, setShowHelp] = useState(false);

  // settings
  const [colorBlind, setColorBlind] = usePersistentState(
    'wordle-colorblind',
    false,
    normalizeBoolean
  );
  const [hardMode, setHardMode] = usePersistentState(
    'wordle-hardmode',
    false,
    normalizeBoolean
  );
  const [solverEnabled, setSolverEnabled] = usePersistentState(
    'wordle-solver',
    false,
    normalizeBoolean
  );

  const isSolved = guesses.some((g) => g.guess === solution);
  const isGameOver = isSolved || guesses.length === 6;

  useEffect(() => {
    if (dictName !== activeDictName) {
      setDictName(activeDictName);
    }
  }, [dictName, activeDictName, setDictName]);

  useEffect(() => {
    setGuess('');
    setMessage('');
    setAnalysis('');
    setRevealMap({});
    setShareText('');
  }, [activeDictName]);

  const colors = colorBlind
    ? {
        correct: 'bg-blue-800 border-blue-800',
        present: 'bg-orange-600 border-orange-600',
        absent: 'bg-gray-700 border-gray-700',
      }
    : {
        correct: 'bg-green-600 border-green-600',
        present: 'bg-yellow-500 border-yellow-500',
        absent: 'bg-gray-700 border-gray-700',
      };

  const keyColors = colorBlind
    ? { correct: 'bg-blue-800', present: 'bg-orange-600', absent: 'bg-gray-700' }
    : { correct: 'bg-green-600', present: 'bg-yellow-500', absent: 'bg-gray-700' };

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

  const remainingWords = useMemo(() => {
    if (!wordList.length) return [];
    if (!guesses.length) return wordList;
    return wordList.filter((word) =>
      guesses.every(
        (g) => evaluateGuess(g.guess, word).join('') === g.result.join('')
      )
    );
  }, [wordList, guesses]);

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

  const solverSuggestions = useMemo(() => {
    if (!solverEnabled || isGameOver || !wordList.length || !remainingWords.length) {
      return [];
    }
    return wordList
      .map((word) => ({
        word,
        entropy: calculateEntropy(word, remainingWords),
      }))
      .sort((a, b) => {
        if (b.entropy !== a.entropy) return b.entropy - a.entropy;
        return a.word.localeCompare(b.word);
      })
      .slice(0, 5);
  }, [solverEnabled, isGameOver, wordList, remainingWords]);

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
    if (!wordList.length) {
      setAnalysis('Dictionary unavailable.');
      return;
    }
    const upper = guess.toUpperCase();
    if (upper.length !== 5) return;
    if (!wordList.includes(upper)) {
      setAnalysis('Word not in dictionary.');
      return;
    }
    const remaining = remainingWords;
    const entropy = calculateEntropy(upper, remaining);
    setAnalysis(
      `${remaining.length} words remaining; entropy ${entropy.toFixed(2)} bits`
    );
  };

  const handleUseSuggestion = useCallback((word) => {
    setGuess(word);
    setMessage('');
    setAnalysis('');
  }, []);

  const submitGuess = useCallback(
    (rawGuess) => {
      if (isGameOver) return;
      if (!wordList.length) {
        setMessage('Dictionary unavailable.');
        return;
      }
      const upper = rawGuess.toUpperCase();
      if (upper.length !== 5) {
        setMessage('Enter a 5-letter word.');
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
            setMessage(`Hard mode: ${ch} must be in position ${Number(idx) + 1}.`);
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
            setMessage(`Hard mode: guess must contain ${ch}${count > 1 ? ` (${count}x)` : ''}.`);
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
    },
    [
      guesses,
      hardMode,
      history,
      isGameOver,
      setHistory,
      setStats,
      solution,
      stats,
      wordList,
      updateStreaks,
    ]
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    submitGuess(guess);
  };

  const share = async () => {
    const mosaic = buildResultMosaic(
      guesses.map((g) => g.result),
      colorBlind
    );
    const text = `Wordle ${isSolved ? guesses.length : 'X'}/6\n${mosaic}`;
    setShareText(text);
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ text });
        setMessage('Shared results!');
        return;
      } catch (error) {
        if (error?.name === 'AbortError') return;
      }
    }
    try {
      const clipboardPromise = navigator?.clipboard?.writeText?.(text);
      if (clipboardPromise && typeof clipboardPromise.then === 'function') {
        await clipboardPromise;
      }
      setMessage('Copied results to clipboard!');
      return;
    } catch {
      // fall through to in-app share text
    }
    setMessage('Copy failed. Select the results below.');
  };

  const handleLetterInput = useCallback(
    (letter) => {
      if (isGameOver) return;
      setGuess((prev) => {
        if (prev.length >= 5) return prev;
        return `${prev}${letter}`;
      });
      setMessage('');
      setAnalysis('');
    },
    [isGameOver]
  );

  const handleBackspace = useCallback(() => {
    if (isGameOver) return;
    setGuess((prev) => prev.slice(0, -1));
  }, [isGameOver]);

  const handleEscape = useCallback(() => {
    setGuess('');
    setMessage('');
    setAnalysis('');
  }, []);

  const handleEnter = useCallback(() => {
    submitGuess(guess);
  }, [guess, submitGuess]);

  const resetToday = useCallback(() => {
    const todayEntry = history[todayKey];
    if (todayEntry) {
      const updatedHistory = { ...history };
      delete updatedHistory[todayKey];
      setHistory(updatedHistory);
      updateStreaks(updatedHistory);

      const updatedStats = {
        ...stats,
        played: Math.max(0, stats.played - 1),
        won: Math.max(0, stats.won - (todayEntry.success ? 1 : 0)),
        guessDist: { ...stats.guessDist },
      };
      if (todayEntry.success) {
        const bucket = Math.min(6, Math.max(1, Number(todayEntry.guesses) || 0));
        if (updatedStats.guessDist[bucket] > 0) {
          updatedStats.guessDist[bucket] -= 1;
        }
      } else if (updatedStats.guessDist.fail > 0) {
        updatedStats.guessDist.fail -= 1;
      }
      setStats(updatedStats);
    }
    setGuesses([]);
    setGuess('');
    setMessage("Today's board reset.");
    setAnalysis('');
    setRevealMap({});
    setShareText('');
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`wordle-guesses-${dictName}-${todayKey}`);
    }
  }, [dictName, history, setGuesses, setHistory, setStats, stats, updateStreaks]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (event) => {
      if (showHelp) {
        if (event.key === 'Escape') {
          event.preventDefault();
          setShowHelp(false);
        }
        return;
      }
      const target = event.target;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (event.key === 'Backspace') {
        event.preventDefault();
        handleBackspace();
        return;
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        handleEnter();
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        handleEscape();
        return;
      }
      if (/^[a-z]$/i.test(event.key)) {
        event.preventDefault();
        handleLetterInput(event.key.toUpperCase());
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleBackspace, handleEnter, handleEscape, handleLetterInput, showHelp]);

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

    if (typeof window === 'undefined') return;
    const prefersReduce = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;
    if (prefersReduce) {
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
  }, [guesses]);

  const renderCell = (row, col) => {
    const guessRow = guesses[row];
    const letter =
      guessRow?.guess[col] || (row === guesses.length ? guess[col] || '' : '');
    const status = guessRow?.result[col];
    const revealed = revealMap[`${row}-${col}`];
    const displayLetter = letter || '';
    const statusLabel = status && revealed ? status : displayLetter ? 'filled' : 'empty';
    let classes =
      'w-10 h-10 md:w-12 md:h-12 flex items-center justify-center border-2 font-bold text-xl transition-colors duration-300';
    if (status && revealed) {
      classes += ` ${colors[status]} text-white`;
    } else {
      classes += ' border-gray-600';
    }
    return (
      <div
        key={col}
        className={classes}
        role="gridcell"
        aria-label={`Row ${row + 1} Column ${col + 1}: ${displayLetter || 'blank'} ${statusLabel}`}
      >
        {displayLetter}
      </div>
    );
  };

  const keyboardRows = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];
  const renderKey = (ch) => {
    const status = letterHints[ch];
    let classes =
      'w-6 h-10 md:w-8 md:h-10 flex items-center justify-center rounded font-bold text-sm focus:outline-none focus:ring-2 focus:ring-white/70';
    if (status) {
      classes += ` ${keyColors[status]} text-white`;
    } else {
      classes += ' bg-gray-600';
    }
    return (
      <button
        key={ch}
        type="button"
        onClick={() => handleLetterInput(ch)}
        className={classes}
        aria-label={`Letter ${ch}${status ? `, ${status}` : ''}`}
      >
        {ch}
      </button>
    );
  };

  return (
    <div className="h-full w-full flex flex-col items-center justify-start bg-ub-cool-grey text-white p-4 space-y-4 overflow-y-auto">
      <div className="flex items-center justify-between w-full max-w-xl">
        <h1 className="text-xl font-bold">Wordle</h1>
        <button
          type="button"
          onClick={() => setShowHelp(true)}
          className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm"
        >
          Help
        </button>
      </div>

      <div className="flex space-x-4">
        <label className="flex items-center space-x-1 text-sm">
          <input
            type="checkbox"
            checked={colorBlind}
            onChange={() => setColorBlind(!colorBlind)}
          />
          <span>Color Blind</span>
        </label>
        <label className="flex items-center space-x-1 text-sm">
          <input
            type="checkbox"
            checked={hardMode}
            onChange={() => setHardMode(!hardMode)}
          />
          <span>Hard Mode</span>
        </label>
        <label className="flex items-center space-x-1 text-sm">
          <input
            type="checkbox"
            checked={solverEnabled}
            onChange={() => setSolverEnabled(!solverEnabled)}
          />
          <span>Solver</span>
        </label>
        <label className="flex items-center space-x-1 text-sm">
          <span>Word Pack</span>
          <select
            className="text-black text-sm"
            value={dictName}
            onChange={(e) => setDictName(e.target.value)}
          >
            {Object.keys(dictionaries).map((name) => (
              <option key={name} value={name}>
                {name.charAt(0).toUpperCase() + name.slice(1)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid grid-rows-6 gap-1" role="grid" aria-label="Wordle board">
        {Array.from({ length: 6 }).map((_, row) => (
          <div key={row} className="grid grid-cols-5 gap-1" role="row">
            {Array.from({ length: 5 }).map((_, col) => renderCell(row, col))}
          </div>
        ))}
      </div>

      <div className="space-y-1" aria-label="Keyboard">
        {keyboardRows.map((row) => (
          <div key={row} className="flex justify-center space-x-1">
            {row.split('').map((ch) => renderKey(ch))}
          </div>
        ))}
        <div className="flex justify-center space-x-1">
          <button
            type="button"
            onClick={handleEnter}
            className="px-3 h-10 md:h-10 rounded bg-gray-600 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-white/70"
            aria-label="Enter guess"
          >
            Enter
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            className="px-3 h-10 md:h-10 rounded bg-gray-600 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-white/70"
            aria-label="Backspace"
          >
            Delete
          </button>
        </div>
      </div>

      {!isGameOver && (
        <>
          <form onSubmit={handleSubmit} className="flex space-x-2">
            <input
              type="text"
              maxLength={5}
              value={guess}
              onChange={(e) => setGuess(sanitizeGuessText(e.target.value))}
              className="w-32 p-2 text-black text-center uppercase"
              placeholder="Guess"
              aria-label="Guess"
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
            <button
              type="button"
              onClick={resetToday}
              className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded"
              aria-label="Reset today's board"
            >
              Reset Today
            </button>
          </form>

          {solverEnabled && (
            <div
              className="w-full max-w-xl rounded border border-gray-700 bg-black/20 p-3 space-y-2"
              aria-label="Solver panel"
            >
              {!wordList.length ? (
                <p className="text-sm">Dictionary unavailable.</p>
              ) : (
                <>
                  <p className="text-sm">Remaining solutions: {remainingWords.length}</p>
                  {remainingWords.length === 0 ? (
                    <p className="text-sm">No solutions match the current constraints.</p>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-sm">Top suggestions:</p>
                      <div className="flex flex-wrap gap-2">
                        {solverSuggestions.map((suggestion) => (
                          <button
                            key={suggestion.word}
                            type="button"
                            onClick={() => handleUseSuggestion(suggestion.word)}
                            className="px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-xs"
                            aria-label={`Use suggestion ${suggestion.word}`}
                          >
                            {suggestion.word} ({suggestion.entropy.toFixed(2)})
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </>
      )}

      {isGameOver && (
        <div className="flex flex-col items-center space-y-2">
          <button
            onClick={share}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
          >
            Share
          </button>
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
          {shareText && (
            <textarea
              value={shareText}
              readOnly
              rows={4}
              className="w-full max-w-xs text-black p-2 rounded"
              aria-label="Share results"
            />
          )}
        </div>
      )}

      <div className="text-sm" aria-live="polite" role="status">
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
        <Calendar history={history} />
      </div>

      {showHelp && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="wordle-help-title"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setShowHelp(false);
            }
          }}
        >
          <div className="bg-ub-cool-grey text-white p-4 rounded max-w-md w-full space-y-3">
            <div className="flex items-center justify-between">
              <h2 id="wordle-help-title" className="text-lg font-bold">
                How to play
              </h2>
              <button
                type="button"
                onClick={() => setShowHelp(false)}
                className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm"
              >
                Close
              </button>
            </div>
            <p className="text-sm">
              Guess the 5-letter word in six tries. Each guess must be in the word
              list. Letters turn green for correct placement, yellow when present
              elsewhere, and gray when absent.
            </p>
            <p className="text-sm">
              Use the on-screen keyboard or your physical keyboard (Enter to
              submit, Backspace to delete). Escape clears your current guess.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

const Calendar = ({ history }) => {
  const today = new Date();
  const cells = [];
  for (let i = 29; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    const entry = history[key];
    let color = 'bg-gray-700';
    let label = `${key}: no game`;
    if (entry) {
      color = entry.success ? 'bg-green-700' : 'bg-red-700';
      label = `${key}: ${entry.success ? 'win' : 'loss'} in ${entry.guesses} guesses`;
    }
    cells.push(
      <div
        key={key}
        className={`w-4 h-4 ${color}`}
        role="gridcell"
        aria-label={label}
        title={label}
      ></div>
    );
  }
  return (
    <div className="grid grid-cols-7 gap-1" role="grid" aria-label="Last 30 days">
      {cells}
    </div>
  );
};

export default Wordle;

export const displayWordle = () => <Wordle />;
