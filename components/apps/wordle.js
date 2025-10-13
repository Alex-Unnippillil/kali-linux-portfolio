import React, { useState, useEffect, useMemo } from 'react';
import {
  getWordOfTheDay,
  buildResultMosaic,
  dictionaries as wordleDictionaries,
} from '../../utils/wordle';

const basePuzzleDate = new Date('2021-06-19T00:00:00Z');
const getCurrentDayKey = () => new Date().toISOString().split('T')[0];

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
  const [todayKey, setTodayKey] = useState(getCurrentDayKey);
  const [dictName, setDictName] = usePersistentState('wordle-dictionary', 'common');
  const wordList = dictionaries[dictName];
  const solutionDate = useMemo(
    () => new Date(`${todayKey}T00:00:00Z`),
    [todayKey]
  );
  const solution = useMemo(
    () => getWordOfTheDay(dictName, solutionDate),
    [dictName, solutionDate]
  );
  const emptyGuessDefault = useMemo(
    () => (dictName || todayKey ? [] : []),
    [dictName, todayKey]
  );
  const historyDefault = useMemo(() => ({}), []);
  const streakDefault = useMemo(() => ({ current: 0, max: 0 }), []);

  // guesses for today are stored under a daily key so a new game starts each day
  const [guesses, setGuesses] = usePersistentState(
    `wordle-guesses-${dictName}-${todayKey}`,
    emptyGuessDefault
  );
  const [history, setHistory] = usePersistentState(
    `wordle-history-${dictName}`,
    historyDefault
  );
  const [streak, setStreak] = usePersistentState(
    `wordle-streak-${dictName}`,
    streakDefault
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

  // settings
  const [colorBlind, setColorBlind] = usePersistentState(
    'wordle-colorblind',
    false
  );
  const [hardMode, setHardMode] = usePersistentState('wordle-hardmode', false);

  const isSolved = guesses.some((g) => g.guess === solution);
  const isGameOver = isSolved || guesses.length === 6;
  const puzzleNumber = useMemo(() => {
    const diff = Math.floor((solutionDate.getTime() - basePuzzleDate.getTime()) / 86400000);
    return diff < 0 ? 0 : diff;
  }, [solutionDate]);

  useEffect(() => {
    const syncKey = () => {
      const current = getCurrentDayKey();
      setTodayKey((prev) => (prev === current ? prev : current));
    };
    syncKey();
    const interval = setInterval(syncKey, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setGuess('');
    setMessage('');
    setAnalysis('');
    setRevealMap({});
  }, [dictName, todayKey]);

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
    if (upper.length !== 5) return;
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

  const commitGuess = () => {
    if (isGameOver) return;
    const upper = guess.toUpperCase();
    if (upper.length !== 5) return;

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
  };

  const share = async () => {
    const mosaic = buildResultMosaic(
      guesses.map((g) => g.result),
      colorBlind
    );
    const attempts = isSolved ? guesses.length : 'X';
    const headerParts = ['Wordle'];
    if (Number.isFinite(puzzleNumber)) {
      headerParts.push(String(puzzleNumber));
    }
    headerParts.push(`${attempts}/6${hardMode ? '*' : ''}`);
    const text = `${headerParts.join(' ')}\n${mosaic}`;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        setMessage('Copied results to clipboard!');
      } else {
        throw new Error('Clipboard unavailable');
      }
    } catch (err) {
      setMessage('Unable to copy results automatically.');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    commitGuess();
  };

  const handleVirtualKey = (key) => {
    if (isGameOver) return;
    if (message) setMessage('');
    if (key === 'ENTER') {
      commitGuess();
      return;
    }
    if (key === 'BACK') {
      setGuess((prev) => prev.slice(0, -1));
      return;
    }
    if (/^[A-Z]$/.test(key)) {
      setGuess((prev) => {
        if (prev.length >= 5) return prev;
        return `${prev}${key}`;
      });
    }
  };

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
    let classes =
      'w-10 h-10 md:w-12 md:h-12 flex items-center justify-center border-2 font-bold text-xl';
    if (status && revealed) {
      classes += ` ${colors[status]} text-white tile-flip`;
    } else {
      classes += ' border-gray-600';
    }
    return (
      <div
        key={col}
        className={classes}
        role="gridcell"
        aria-label={status ? `${letter} ${status}` : letter}
      >
        {letter}
      </div>
    );
  };

  const keyboardRows = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACK'],
  ];
  const renderKey = (ch) => {
    const status = letterHints[ch];
    const isAction = ch === 'ENTER' || ch === 'BACK';
    const display = ch === 'BACK' ? '⌫' : ch;
    let classes =
      'h-10 md:h-12 flex items-center justify-center rounded font-bold text-sm focus:outline-none focus:ring-2 focus:ring-white/70';
    if (isAction) {
      classes += ' px-3 md:px-4 bg-gray-600 text-white';
    } else if (status) {
      classes += ` w-6 md:w-8 ${keyColors[status]} text-white`;
    } else {
      classes += ' w-6 md:w-8 bg-gray-600 text-white';
    }
    const ariaLabel =
      ch === 'ENTER'
        ? 'Enter key'
        : ch === 'BACK'
        ? 'Backspace key'
        : `${ch} key${status ? ` (${status})` : ''}`;
    return (
      <button
        key={ch}
        type="button"
        onClick={() => handleVirtualKey(ch)}
        className={classes}
        aria-label={ariaLabel}
      >
        {display}
      </button>
    );
  };

  const colorBlindId = 'wordle-colorblind-toggle';
  const hardModeId = 'wordle-hardmode-toggle';
  const dictSelectId = 'wordle-dictionary-select';
  const colorBlindLabelId = 'wordle-colorblind-label';
  const hardModeLabelId = 'wordle-hardmode-label';

  return (
    <div className="h-full w-full flex flex-col items-center justify-start bg-ub-cool-grey text-white p-4 space-y-4 overflow-y-auto">
      <h1 className="text-xl font-bold">Wordle</h1>

      <div className="flex space-x-4">
        <div className="flex items-center space-x-1 text-sm">
          <input
            id={colorBlindId}
            type="checkbox"
            checked={colorBlind}
            onChange={() => setColorBlind(!colorBlind)}
            aria-labelledby={colorBlindLabelId}
          />
          <label id={colorBlindLabelId} htmlFor={colorBlindId}>
            Color Blind
          </label>
        </div>
        <div className="flex items-center space-x-1 text-sm">
          <input
            id={hardModeId}
            type="checkbox"
            checked={hardMode}
            onChange={() => setHardMode(!hardMode)}
            aria-labelledby={hardModeLabelId}
          />
          <label id={hardModeLabelId} htmlFor={hardModeId}>
            Hard Mode
          </label>
        </div>
        <div className="flex items-center space-x-1 text-sm">
          <label htmlFor={dictSelectId}>Word Pack</label>
          <select
            id={dictSelectId}
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
        </div>
      </div>

      <div className="grid grid-rows-6 gap-1" role="grid" aria-label="Wordle board">
        {Array.from({ length: 6 }).map((_, row) => (
          <div key={row} className="grid grid-cols-5 gap-1" role="row">
            {Array.from({ length: 5 }).map((_, col) => renderCell(row, col))}
          </div>
        ))}
      </div>

      <div className="space-y-1" aria-label="Keyboard">
        {keyboardRows.map((row, idx) => (
          <div key={idx} className="flex justify-center space-x-1">
            {row.map((ch) => renderKey(ch))}
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
            aria-label="Guess word"
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
        <Calendar history={history} />
      </div>
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
    if (entry) color = entry.success ? 'bg-green-700' : 'bg-red-700';
    cells.push(<div key={key} className={`w-4 h-4 ${color}`}></div>);
  }
  return <div className="grid grid-cols-7 gap-1">{cells}</div>;
};

export default Wordle;

export const displayWordle = () => <Wordle />;

