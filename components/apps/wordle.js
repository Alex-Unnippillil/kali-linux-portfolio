import React, { useState, useEffect, useMemo } from 'react';
import commonWords from './wordle_words.json';
import altWords from './wordle_words_alt.json';

// Determine today's puzzle key and pick a word from the dictionary
// deterministically so everyone sees the same puzzle each day.
const todayKey = new Date().toISOString().split('T')[0];
function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) {
    h = Math.imul(31, h) + str.charCodeAt(i);
  }
  return Math.abs(h);
}

const dictionaries = {
  common: commonWords,
  alt: altWords,
};

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
  const solution = useMemo(
    () => wordList[hash(`${todayKey}-${dictName}`) % wordList.length],
    [dictName, wordList]
  );

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
  const [guess, setGuess] = useState('');
  const [message, setMessage] = useState('');
  const [analysis, setAnalysis] = useState('');

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
  }, [dictName]);

  const colors = colorBlind
    ? {
        correct: 'bg-blue-700 border-blue-700',
        present: 'bg-orange-700 border-orange-700',
        absent: 'bg-gray-700 border-gray-700',
      }
    : {
        correct: 'bg-green-700 border-green-700',
        present: 'bg-yellow-800 border-yellow-800',
        absent: 'bg-gray-700 border-gray-700',
      };

  const emojiMap = colorBlind
    ? { correct: '🟦', present: '🟧', absent: '⬛' }
    : { correct: '🟩', present: '🟨', absent: '⬛' };

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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isGameOver) return;
    const upper = guess.toUpperCase();
    if (upper.length !== 5) return;

    if (!wordList.includes(upper)) {
      setMessage('Word not in dictionary.');
      return;
    }

    if (hardMode && new Set(upper).size < 5) {
      setMessage('Hard mode: no repeating letters.');
      return;
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
    }
  };

  const share = () => {
    let text = `Wordle ${isSolved ? guesses.length : 'X'}/6\n`;
    text += guesses
      .map((g) => g.result.map((r) => emojiMap[r]).join(''))
      .join('\n');
    navigator.clipboard.writeText(text);
    setMessage('Copied results to clipboard!');
  };

  const renderCell = (row, col) => {
    const guessRow = guesses[row];
    const letter =
      guessRow?.guess[col] || (row === guesses.length ? guess[col] || '' : '');
    const status = guessRow?.result[col];
    let classes =
      'w-10 h-10 md:w-12 md:h-12 flex items-center justify-center border-2 font-bold text-xl';
    if (status) {
      classes += ` ${colors[status]} text-white`;
    } else {
      classes += ' border-gray-600';
    }
    return (
      <div key={col} className={classes}>
        {letter}
      </div>
    );
  };

  const shareString = () =>
    `Wordle ${isSolved ? guesses.length : 'X'}/6\n${guesses
      .map((g) => g.result.map((r) => emojiMap[r]).join(''))
      .join('\n')}`;

  return (
    <div className="h-full w-full flex flex-col items-center justify-start bg-ub-cool-grey text-white p-4 space-y-4 overflow-y-auto">
      <h1 className="text-xl font-bold">Wordle</h1>

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
        <select
          className="text-black text-sm"
          value={dictName}
          onChange={(e) => setDictName(e.target.value)}
        >
          <option value="common">Common</option>
          <option value="alt">Alt</option>
        </select>
      </div>

      <div className="grid grid-rows-6 gap-1">
        {Array.from({ length: 6 }).map((_, row) => (
          <div key={row} className="grid grid-cols-5 gap-1">
            {Array.from({ length: 5 }).map((_, col) => renderCell(row, col))}
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
          <textarea
            readOnly
            value={shareString()}
            className="w-52 h-32 p-2 text-black"
          />
        </div>
      )}

      {analysis && <div className="text-sm">{analysis}</div>}
      {message && <div className="text-sm">{message}</div>}

      <div className="flex flex-col items-center space-y-1">
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

