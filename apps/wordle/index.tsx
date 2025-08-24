'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  evaluateGuess,
  validateGuess,
  checkHardMode,
  LetterState,
} from './engine';
import { ALL_GUESSES, getAnswer, seedIndex } from './words';
import { loadState, saveState } from '../../lib/idb';

const ROWS = 6;
const COLS = 5;

interface SavedState {
  seed: number;
  guesses: string[];
  statuses: LetterState[][];
  hardMode: boolean;
  colorBlind: boolean;
}

const keyboardRows = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];

const UbuntuWordle = () => {
  const seed = seedIndex();
  const [answer, setAnswer] = useState('');
  const [guesses, setGuesses] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<LetterState[][]>([]);
  const [current, setCurrent] = useState('');
  const [hardMode, setHardMode] = useState(false);
  const [colorBlind, setColorBlind] = useState(false);
  const [message, setMessage] = useState('');
  const [gameOver, setGameOver] = useState(false);
  const [keyStatuses, setKeyStatuses] = useState<Record<string, LetterState>>({});

  useEffect(() => {
    setAnswer(getAnswer('easy', seed));
    loadState<SavedState>('wordle').then((data) => {
      if (!data || data.seed !== seed) return;
      setGuesses(data.guesses || []);
      setStatuses(data.statuses || []);
      setHardMode(data.hardMode || false);
      setColorBlind(data.colorBlind || false);
      // reconstruct key statuses
      const ks: Record<string, LetterState> = {};
      (data.guesses || []).forEach((g, idx) => {
        (data.statuses[idx] || []).forEach((st, i) => {
          const ch = g[i].toUpperCase();
          const prev = ks[ch];
          if (prev === 'correct') return;
          if (prev === 'present' && st === 'absent') return;
          ks[ch] = st;
        });
      });
      setKeyStatuses(ks);
      if (
        data.statuses.some((row) => row.every((s) => s === 'correct')) ||
        data.guesses.length === ROWS
      ) {
        setGameOver(true);
      }
    });
  }, [seed]);

  useEffect(() => {
    saveState('wordle', {
      seed,
      guesses,
      statuses,
      hardMode,
      colorBlind,
    });
  }, [seed, guesses, statuses, hardMode, colorBlind]);

  const submitGuess = useCallback(() => {
    const err = validateGuess(current, ALL_GUESSES);
    if (err) return setMessage(err);
    if (!checkHardMode(current.toLowerCase(), guesses, statuses, hardMode)) {
      return setMessage('Use revealed hints');
    }
    const res = evaluateGuess(current.toLowerCase(), answer);
    const newGuesses = [...guesses, current.toLowerCase()];
    const newStatuses = [...statuses, res];
    setGuesses(newGuesses);
    setStatuses(newStatuses);
    setCurrent('');
    setMessage('');

    setKeyStatuses((prev) => {
      const next = { ...prev } as Record<string, LetterState>;
      current.split('').forEach((ch, i) => {
        const st = res[i];
        const key = ch.toUpperCase();
        const prevSt = next[key];
        if (prevSt === 'correct') return;
        if (prevSt === 'present' && st === 'absent') return;
        next[key] = st;
      });
      return next;
    });

    if (current.toLowerCase() === answer) {
      setGameOver(true);
      setMessage('Solved!');
    } else if (newGuesses.length === ROWS) {
      setGameOver(true);
      setMessage(`Word was ${answer.toUpperCase()}`);
    }
  }, [current, answer, guesses, statuses, hardMode]);

  const handleKey = useCallback(
    (k: string) => {
      if (gameOver) return;
      if (k === 'ENTER') return submitGuess();
      if (k === 'BACKSPACE') {
        setCurrent((c) => c.slice(0, -1));
        return;
      }
      if (/^[A-Z]$/.test(k) && current.length < COLS) {
        setCurrent((c) => (c + k).toLowerCase());
      }
    },
    [gameOver, current, submitGuess],
  );

  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      const key = e.key.toUpperCase();
      if (key === 'ENTER' || key === 'BACKSPACE' || /^[A-Z]$/.test(key)) {
        e.preventDefault();
        handleKey(key);
      }
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [handleKey]);

  const share = async () => {
    const header = `Ubuntu Wordle ${seed} ${
      guesses.some((g, i) =>
        statuses[i]?.every((s) => s === 'correct'),
      )
        ? guesses.length
        : 'X'
    }/${ROWS}`;
    const grid = statuses
      .map((row) =>
        row
          .map((s) => {
            if (colorBlind) {
              if (s === 'correct') return '🟦';
              if (s === 'present') return '🟧';
              return '⬛';
            }
            if (s === 'correct') return '🟩';
            if (s === 'present') return '🟨';
            return '⬛';
          })
          .join(''),
      )
      .join('\n');
    const text = `${header}\n${grid}`;
    await navigator.clipboard.writeText(text);
    setMessage('Result copied to clipboard');
  };

  const cellClass = (s?: LetterState) => {
    if (!s) return 'bg-gray-800 border-gray-600';
    if (s === 'correct')
      return colorBlind
        ? 'bg-blue-600 border-blue-600'
        : 'bg-green-600 border-green-600';
    if (s === 'present')
      return colorBlind
        ? 'bg-orange-500 border-orange-500'
        : 'bg-yellow-500 border-yellow-500';
    return 'bg-gray-700 border-gray-700';
  };

  const keyClass = (k: string) => {
    const st = keyStatuses[k];
    if (st === 'correct')
      return colorBlind ? 'bg-blue-600' : 'bg-green-600';
    if (st === 'present')
      return colorBlind ? 'bg-orange-500' : 'bg-yellow-500';
    if (st === 'absent') return 'bg-gray-700';
    return 'bg-gray-500';
  };

  return (
    <div className="p-4 text-center text-white select-none">
      <h1 className="text-2xl mb-2 font-bold text-purple-300">Ubuntu Wordle</h1>
      <div className="space-y-1 mb-2">
        {Array.from({ length: ROWS }).map((_, r) => (
          <div key={r} className="flex justify-center space-x-1">
            {Array.from({ length: COLS }).map((_, c) => {
              const letter =
                guesses[r]?.[c]?.toUpperCase() ||
                (r === guesses.length ? current[c]?.toUpperCase() : '');
              const status = statuses[r]?.[c];
              return (
                <div
                  key={c}
                  className={`w-10 h-10 border-2 flex items-center justify-center font-bold text-lg ${cellClass(
                    status,
                  )}`}
                >
                  {letter}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div className="h-6 mb-2 text-sm">{message}</div>
      {gameOver && (
        <button
          onClick={share}
          className="mt-2 px-3 py-1 bg-purple-600 rounded"
        >
          Share
        </button>
      )}
      <div className="flex justify-center space-x-4 mt-4 text-sm">
        <label className="flex items-center space-x-1">
          <input
            type="checkbox"
            checked={hardMode}
            onChange={(e) => setHardMode(e.target.checked)}
          />
          <span>Hard</span>
        </label>
        <label className="flex items-center space-x-1">
          <input
            type="checkbox"
            checked={colorBlind}
            onChange={(e) => setColorBlind(e.target.checked)}
          />
          <span>Color blind</span>
        </label>
      </div>
      <div className="space-y-1 mt-4">
        {keyboardRows.map((row, i) => (
          <div key={row} className="flex justify-center space-x-1">
            {i === 2 && (
              <button
                className={`px-3 py-2 rounded text-sm bg-gray-500`}
                onClick={() => handleKey('ENTER')}
              >
                Enter
              </button>
            )}
            {row.split('').map((ch) => (
              <button
                key={ch}
                className={`w-8 h-10 rounded text-sm ${keyClass(ch)}`}
                onClick={() => handleKey(ch)}
              >
                {ch}
              </button>
            ))}
            {i === 2 && (
              <button
                className={`px-3 py-2 rounded text-sm bg-gray-500`}
                onClick={() => handleKey('BACKSPACE')}
              >
                ⌫
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default UbuntuWordle;

