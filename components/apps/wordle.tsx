import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ANSWERS, GUESSES } from '../../apps/wordle/words';

const ROWS = 6;
const COLS = 5;

const seedIndex = () => {
  const epoch = new Date('2024-01-01T00:00:00Z');
  const today = new Date();
  const diff = Math.floor(
    (today.setUTCHours(0, 0, 0, 0) - epoch.getTime()) / 86400000,
  );
  return diff % ANSWERS.length;
};

const evaluateGuess = (guess: string, answer: string) => {
  const res: ('correct' | 'present' | 'absent')[] = Array(COLS).fill('absent');
  const ans = answer.split('');
  const used = Array(COLS).fill(false);

  for (let i = 0; i < COLS; i++) {
    if (guess[i] === ans[i]) {
      res[i] = 'correct';
      used[i] = true;
    }
  }
  for (let i = 0; i < COLS; i++) {
    if (res[i] === 'correct') continue;
    const idx = ans.findIndex((ch, j) => !used[j] && ch === guess[i]);
    if (idx !== -1) {
      res[i] = 'present';
      used[idx] = true;
    }
  }
  return res;
};

const Keyboard = ({
  onKey,
  keyStatuses,
}: {
  onKey: (k: string) => void;
  keyStatuses: Record<string, string>;
}) => {
  const rows = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];
  const getKeyClass = (k: string) => {
    const status = keyStatuses[k];
    if (status === 'correct') return 'bg-green-600';
    if (status === 'present') return 'bg-yellow-500';
    if (status === 'absent') return 'bg-gray-700';
    return 'bg-gray-500';
  };
  return (
    <div className="space-y-1 mt-4">
      {rows.map((row, i) => (
        <div key={row} className="flex justify-center space-x-1">
          {i === 2 && (
            <button
              className="px-3 py-2 bg-gray-500 rounded text-sm"
              onClick={() => onKey('ENTER')}
            >
              Enter
            </button>
          )}
          {row.split('').map((ch) => (
            <button
              key={ch}
              className={`w-8 h-10 rounded text-sm ${getKeyClass(ch)}`}
              onClick={() => onKey(ch)}
            >
              {ch}
            </button>
          ))}
          {i === 2 && (
            <button
              className="px-3 py-2 bg-gray-500 rounded text-sm"
              onClick={() => onKey('BACKSPACE')}
            >
              ⌫
            </button>
          )}
        </div>
      ))}
    </div>
  );
};

const Wordle = () => {
  const answer = useMemo(() => ANSWERS[seedIndex()], []);
  const [guesses, setGuesses] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<string[][]>([]);
  const [current, setCurrent] = useState('');
  const [hardMode, setHardMode] = useState(false);
  const [message, setMessage] = useState('');
  const [gameOver, setGameOver] = useState(false);
  const [keyStatuses, setKeyStatuses] = useState<Record<string, string>>({});

  const checkHardMode = useCallback(
    (g: string) => {
      if (!hardMode) return true;
      for (let r = 0; r < statuses.length; r++) {
        const s = statuses[r];
        const word = guesses[r];
        for (let i = 0; i < COLS; i++) {
          if (s[i] === 'correct' && g[i] !== word[i]) return false;
          if (s[i] === 'present' && !g.includes(word[i])) return false;
        }
      }
      return true;
    },
    [hardMode, statuses, guesses],
  );

  const submitGuess = useCallback(() => {
    if (current.length !== COLS) return setMessage('Word must be 5 letters');
    const lower = current.toLowerCase();
    if (!GUESSES.includes(lower)) return setMessage('Word not in list');
    if (!checkHardMode(lower)) return setMessage('Use revealed hints');

    const evals = evaluateGuess(lower, answer);
    setGuesses([...guesses, lower]);
    setStatuses([...statuses, evals]);
    setCurrent('');
    setMessage('');

    setKeyStatuses((prev) => {
      const next = { ...prev };
      lower.split('').forEach((ch, i) => {
        const st = evals[i];
        const prevSt = next[ch.toUpperCase()];
        if (prevSt === 'correct') return;
        if (prevSt === 'present' && st === 'absent') return;
        next[ch.toUpperCase()] = st;
      });
      return next;
    });

    if (lower === answer) {
      setGameOver(true);
      setMessage('You solved it!');
    } else if (guesses.length + 1 === ROWS) {
      setGameOver(true);
      setMessage(`Word was ${answer.toUpperCase()}`);
    }
  }, [current, guesses, statuses, answer, checkHardMode]);

  const handleKey = useCallback(
    (k: string) => {
      if (gameOver) return;
      if (k === 'ENTER') {
        submitGuess();
      } else if (k === 'BACKSPACE') {
        setCurrent((c) => c.slice(0, -1));
      } else if (/^[A-Z]$/.test(k)) {
        setCurrent((c) => (c.length < COLS ? c + k : c));
      }
    },
    [gameOver, submitGuess],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const key = e.key.toUpperCase();
      handleKey(key === 'BACKSPACE' ? 'BACKSPACE' : key);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleKey]);

  const share = () => {
    const grid = statuses
      .map((row) =>
        row
          .map((s) => (s === 'correct' ? '🟩' : s === 'present' ? '🟨' : '⬛'))
          .join(''),
      )
      .join('\n');
    const text = `Daily Puzzle ${new Date()
      .toISOString()
      .slice(0, 10)}\n${grid}`;
    navigator.clipboard
      .writeText(text)
      .then(() => setMessage('Copied results'))
      .catch(() => setMessage('Copy failed'));
  };

  return (
    <div className="h-full w-full flex flex-col items-center bg-panel text-white p-4">
      <div className="flex justify-between items-center w-full max-w-sm mb-2">
        <h1 className="text-lg font-bold">Daily Puzzle</h1>
        <label className="text-sm flex items-center space-x-1">
          <input
            type="checkbox"
            checked={hardMode}
            onChange={() => setHardMode(!hardMode)}
          />
          <span>Hard</span>
        </label>
      </div>
      <div className="grid gap-1 mb-2" style={{ gridTemplateColumns: `repeat(${COLS},3rem)` }}>
        {Array.from({ length: ROWS }).map((_, r) => (
          <div key={r} className="flex space-x-1">
            {Array.from({ length: COLS }).map((__, c) => {
              const letter =
                guesses[r]?.[c]?.toUpperCase() ||
                (r === guesses.length ? current[c] : '') ||
                '';
              const status = statuses[r]?.[c];
              let cls =
                'w-12 h-12 border-2 flex items-center justify-center text-xl font-bold';
              if (status === 'correct') cls += ' bg-green-600 border-green-600';
              else if (status === 'present') cls += ' bg-yellow-500 border-yellow-500';
              else if (status === 'absent') cls += ' bg-gray-700 border-gray-700';
              else cls += ' border-gray-500';
              return (
                <div key={c} className={cls}>
                  {letter}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      {message && <div className="mb-2 text-sm">{message}</div>}
      {gameOver && (
        <button
          onClick={share}
          className="px-3 py-1 bg-gray-600 rounded text-sm mb-2"
        >
          Share
        </button>
      )}
      <Keyboard onKey={handleKey} keyStatuses={keyStatuses} />
    </div>
  );
};

export default Wordle;
