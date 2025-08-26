import React, { useState, useEffect, useCallback } from 'react';
import wordList from './wordle_words.json';

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
const solution = wordList[hash(todayKey) % wordList.length];

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
  // guesses for today are stored under a daily key so a new game starts each day
  const [guesses, setGuesses] = usePersistentState(
    `wordle-guesses-${todayKey}`,
    []
  );
  const [history, setHistory] = usePersistentState('wordle-history', {});
  const [guess, setGuess] = useState('');
  const [message, setMessage] = useState('');

  // settings
  const [colorBlind, setColorBlind] = usePersistentState(
    'wordle-colorblind',
    false
  );
  const [hardMode, setHardMode] = usePersistentState('wordle-hardmode', false);
  const [stats, setStats] = usePersistentState('wordle-stats', {
    streak: 0,
    best: 0,
  });

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

  const submitGuess = useCallback(() => {
    if (isGameOver) return;
    const upper = guess.toUpperCase();
    if (upper.length !== 5) return;

    if (hardMode && guesses.length) {
      const requiredPos = {};
      const requiredLetters = {};
      guesses.forEach(({ guess: gStr, result }) => {
        const counts = {};
        result.forEach((r, i) => {
          const ch = gStr[i];
          if (r === 'correct') requiredPos[i] = ch;
          if (r === 'present' || r === 'correct') {
            counts[ch] = (counts[ch] || 0) + 1;
          }
        });
        Object.keys(counts).forEach((c) => {
          requiredLetters[c] = Math.max(requiredLetters[c] || 0, counts[c]);
        });
      });
      for (const [i, ch] of Object.entries(requiredPos)) {
        if (upper[Number(i)] !== ch) {
          setMessage(`Hard mode: must use ${ch} in position ${Number(i) + 1}.`);
          return;
        }
      }
      const upperCounts = {};
      upper.split('').forEach((c) => (upperCounts[c] = (upperCounts[c] || 0) + 1));
      for (const [ch, cnt] of Object.entries(requiredLetters)) {
        if ((upperCounts[ch] || 0) < cnt) {
          setMessage(`Hard mode: guess must include ${ch}.`);
          return;
        }
      }
    }

    const result = evaluateGuess(upper, solution);
    const next = [...guesses, { guess: upper, result }];
    setGuesses(next);
    setGuess('');
    setMessage('');

    if (upper === solution || next.length === 6) {
      const updatedHistory = {
        ...history,
        [todayKey]: {
          guesses: next.length,
          solution,
          success: upper === solution,
        },
      };
      setHistory(updatedHistory);

      let streak = 0;
      const day = new Date(todayKey);
      while (true) {
        const key = day.toISOString().split('T')[0];
        if (updatedHistory[key]?.success) {
          streak += 1;
          day.setDate(day.getDate() - 1);
        } else break;
      }
      let best = stats.best || 0;
      if (upper === solution) {
        best = best ? Math.min(best, next.length) : next.length;
      } else {
        streak = 0;
      }
      setStats({ streak, best });
    }
  }, [guess, guesses, hardMode, isGameOver, history, stats, solution]);

  useEffect(() => {
    const onKey = (e) => {
      if (isGameOver) return;
      if (e.key === 'Enter') {
        submitGuess();
      } else if (e.key === 'Backspace') {
        setGuess((g) => g.slice(0, -1));
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        setGuess((g) => (g.length < 5 ? g + e.key.toUpperCase() : g));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [submitGuess, isGameOver]);

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

  const keyStatus = {};
  guesses.forEach(({ guess: g, result }) => {
    g.split('').forEach((ch, i) => {
      const r = result[i];
      const cur = keyStatus[ch];
      if (r === 'correct' || (r === 'present' && cur !== 'correct') || (!cur && r === 'absent')) {
        keyStatus[ch] = r;
      }
    });
  });

  const addLetter = (ch) => {
    if (isGameOver) return;
    setGuess((g) => (g.length < 5 ? g + ch : g));
  };

  const onBackspace = () => {
    if (isGameOver) return;
    setGuess((g) => g.slice(0, -1));
  };

  const onEnter = () => {
    submitGuess();
  };

  const keyboardRows = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['Enter', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'Back'],
  ];

  const shareString = () =>
    `Wordle ${todayKey} ${isSolved ? guesses.length : 'X'}/6\n${guesses
      .map((g) => g.result.map((r) => emojiMap[r]).join(''))
      .join('\n')}`;

  const share = () => {
    const text = shareString();
    navigator.clipboard.writeText(text);
    setMessage('Copied results to clipboard!');
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
        <div className="flex flex-col space-y-1">
          {keyboardRows.map((row, idx) => (
            <div key={idx} className="flex justify-center space-x-1">
              {row.map((key) => {
                if (key === 'Enter')
                  return (
                    <button
                      key="Enter"
                      aria-label="Enter"
                      onClick={onEnter}
                      className="px-3 py-2 bg-gray-600 rounded text-white font-bold"
                    >
                      Enter
                    </button>
                  );
                if (key === 'Back')
                  return (
                    <button
                      key="Back"
                      aria-label="Backspace"
                      onClick={onBackspace}
                      className="px-3 py-2 bg-gray-600 rounded text-white font-bold"
                    >
                      ⌫
                    </button>
                  );
                const status = keyStatus[key];
                let keyClass = 'px-2 py-2 rounded font-bold';
                if (status) keyClass += ` ${colors[status]} text-white`;
                else keyClass += ' bg-gray-600 text-white';
                return (
                  <button
                    key={key}
                    aria-label={key}
                    onClick={() => addLetter(key)}
                    className={keyClass}
                  >
                    {key}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {isGameOver && (
        <div className="flex flex-col items-center space-y-2">
          <div className="text-sm">Streak: {stats.streak} | Best: {stats.best || '-'}</div>
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

