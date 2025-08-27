import React, { useState, useEffect } from 'react';
import wordList from './wordle_words.json';

// Determine today's puzzle key and pick a word from the dictionary
// deterministically so everyone sees the same puzzle each day.
export function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) {
    h = Math.imul(31, h) + str.charCodeAt(i);
  }
  return Math.abs(h);
}

export function getSolutionForDate(dateStr) {
  return wordList[hash(dateStr) % wordList.length];
}

const todayKey = new Date().toISOString().split('T')[0];
const solution = getSolutionForDate(todayKey);

// Persist state to localStorage so that refreshes keep progress/history
// and games reset each day.
function usePersistentState(key, defaultValue) {
  const [state, setState] = useState(() => {
    if (typeof window === 'undefined') return defaultValue;
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(state));
    }
  }, [key, state]);

  return [state, setState];
}

// Evaluate a guess against the solution producing statuses for each letter.
export const evaluateGuess = (guess, answer) => {
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
  // guesses for today are stored under a daily key so a new game starts each day
  const [guesses, setGuesses] = usePersistentState(
    `wordle-guesses-${todayKey}`,
    []
  );
  const [history, setHistory] = usePersistentState('wordle-history', {});
  const [guess, setGuess] = useState('');
  const [message, setMessage] = useState('');
  const [keyStatuses, setKeyStatuses] = useState({});

  // settings
  const [colorBlind, setColorBlind] = usePersistentState(
    'wordle-colorblind',
    false
  );
  const [hardMode, setHardMode] = usePersistentState('wordle-hardmode', false);

  const isSolved = guesses.some((g) => g.guess === solution);
  const isGameOver = isSolved || guesses.length === 6;

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

  const handleSubmit = () => {
    if (isGameOver) return;
    const upper = guess.toUpperCase();
    if (upper.length !== 5) return;

    if (hardMode && new Set(upper).size < 5) {
      setMessage('Hard mode: no repeating letters.');
      return;
    }

    if (!wordList.includes(upper)) {
      setMessage('Not in word list.');
      return;
    }

    const result = evaluateGuess(upper, solution);
    const next = [...guesses, { guess: upper, result }];
    setGuesses(next);
    setGuess('');
    setMessage('');

    setKeyStatuses((ks) => {
      const updated = { ...ks };
      result.forEach((r, i) => {
        const ch = upper[i];
        const prev = updated[ch];
        if (prev === 'correct') return;
        if (prev === 'present' && r === 'absent') return;
        updated[ch] = r;
      });
      return updated;
    });

    if (upper === solution || next.length === 6) {
      setHistory({
        ...history,
        [todayKey]: {
          guesses: next.length,
          solution,
          success: upper === solution,
        },
      });
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

  const shapes = { correct: '●', present: '▲', absent: '■' };

  const renderCell = (row, col) => {
    const guessRow = guesses[row];
    const letter =
      guessRow?.guess[col] || (row === guesses.length ? guess[col] || '' : '');
    const status = guessRow?.result[col];
    let classes =
      'relative w-10 h-10 md:w-12 md:h-12 flex items-center justify-center border-2 font-bold text-xl';
    if (status) {
      classes += ` ${colors[status]} text-white`;
    } else {
      classes += ' border-gray-600';
    }
    return (
      <div key={col} className={classes} aria-label={status || 'empty'}>
        {status && (
          <span
            className="absolute top-0 left-0 text-[10px]"
            aria-hidden="true"
          >
            {shapes[status]}
          </span>
        )}
        {letter}
      </div>
    );
  };

  const shareString = () =>
    `Wordle ${isSolved ? guesses.length : 'X'}/6\n${guesses
      .map((g) => g.result.map((r) => emojiMap[r]).join(''))
      .join('\n')}`;

  const keyboardRows = [
    'QWERTYUIOP'.split(''),
    'ASDFGHJKL'.split(''),
    ['ENTER', ...'ZXCVBNM'.split(''), '⌫'],
  ];

  const onKey = (key) => {
    if (isGameOver) return;
    if (key === 'ENTER') {
      handleSubmit();
    } else if (key === '⌫' || key === 'BACKSPACE') {
      setGuess((g) => g.slice(0, -1));
    } else if (/^[A-Z]$/.test(key) && guess.length < 5) {
      setGuess((g) => (g + key).toUpperCase());
    }
  };

  useEffect(() => {
    const handler = (e) => {
      onKey(e.key.toUpperCase());
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [guess, isGameOver]);

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
      </div>

      <div className="grid grid-rows-6 gap-1">
        {Array.from({ length: 6 }).map((_, row) => (
          <div key={row} className="grid grid-cols-5 gap-1">
            {Array.from({ length: 5 }).map((_, col) => renderCell(row, col))}
          </div>
        ))}
      </div>

      {!isGameOver && (
        <div className="flex flex-col items-center">
          {keyboardRows.map((row, i) => (
            <div key={i} className="flex justify-center">
              {row.map((k) => {
                const status = keyStatuses[k];
                let classes =
                  'relative m-0.5 flex items-center justify-center rounded text-sm h-10';
                if (k.length > 1) classes += ' w-12';
                else classes += ' w-8';
                if (status) classes += ` ${colors[status]} text-white`;
                else classes += ' bg-gray-500';
                return (
                  <button
                    key={k}
                    onClick={() => onKey(k)}
                    className={classes}
                    aria-label={k}
                  >
                    {status && (
                      <span
                        className="absolute top-0 left-0 text-[8px]"
                        aria-hidden="true"
                      >
                        {shapes[status]}
                      </span>
                    )}
                    {k}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
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

      {message && <div className="text-sm">{message}</div>}
    </div>
  );
};

export default Wordle;

export const displayWordle = () => <Wordle />;

