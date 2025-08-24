'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  createGame,
  guess as applyGuess,
  isLoser,
  isWinner,
  type HangmanGame,
} from './engine';
import {
  buildDictionary,
  selectWord,
  type Dictionary,
  type WordEntry,
} from './words';

const MIN_FREQ = 100; // filter rare words
const LETTERS = 'abcdefghijklmnopqrstuvwxyz'.split('');
const HINT_ORDER = 'etaoinshrdlucmfwypvbgkjqxz';

export default function HangmanClient() {
  const [dict, setDict] = useState<Dictionary | null>(null);
  const [game, setGame] = useState<HangmanGame | null>(null);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('');

  // load and curate word list
  useEffect(() => {
    fetch('/wordlists/enable.json')
      .then((r) => r.json())
      .then((words: WordEntry[]) => {
        const filtered = words.filter((w) => w.freq >= MIN_FREQ);
        setDict(buildDictionary(filtered));
      })
      .catch(() => setDict({ easy: [], medium: [], hard: [] }));
  }, []);

  const startGame = useCallback(() => {
    if (!dict) return;
    const entry = selectWord(dict[difficulty]);
    const newGame = createGame(entry.word);
    setGame({ ...newGame });
    setMessage('');
    setStatus('');
  }, [dict, difficulty]);

  useEffect(() => {
    if (dict) startGame();
  }, [dict, startGame]);

  const handleGuess = useCallback(
    (letter: string) => {
      if (!game || status) return;
      letter = letter.toLowerCase();
      if (game.guessed.includes(letter)) {
        setMessage(`${letter.toUpperCase()} already guessed`);
        return;
      }
      const correct = applyGuess(game, letter);
      setGame({ ...game });
      setMessage(
        correct
          ? `${letter.toUpperCase()} is in the word`
          : `${letter.toUpperCase()} is not in the word`
      );
      if (isWinner(game)) {
        setStatus('You win!');
      } else if (isLoser(game)) {
        setStatus(`Game over! The word was ${game.word.toUpperCase()}`);
      }
    },
    [game, status]
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (/^[a-zA-Z]$/.test(e.key)) {
        e.preventDefault();
        handleGuess(e.key.toLowerCase());
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleGuess]);

  const provideHint = useCallback(() => {
    if (!game || status) return;
    const remaining = game.word.split('').filter((l) => !game.guessed.includes(l));
    if (!remaining.length) return;
    const reveal =
      HINT_ORDER.split('').find((l) => remaining.includes(l)) || remaining[0];
    applyGuess(game, reveal);
    setGame({ ...game });
    setMessage(`Hint: ${reveal.toUpperCase()}`);
    if (isWinner(game)) setStatus('You win!');
  }, [game, status]);

  if (!game) return <p>Loading…</p>;

  return (
    <div className="flex flex-col items-center space-y-4">
      <div aria-live="assertive" className="sr-only">
        {status}
      </div>
      <div aria-live="polite" className="sr-only">
        {message}
      </div>
      <div className="flex space-x-2">
        <label>
          Difficulty:
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as any)}
            className="ml-2 border px-1 py-0.5"
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </label>
        <button
          onClick={startGame}
          className="border px-2 py-1 rounded"
        >
          New Word
        </button>
      </div>
      <p className="text-xl" aria-label="word">
        {game.word.split('').map((l, i) => (
          <span
            key={i}
            className="inline-block w-6 text-center border-b border-black mx-0.5"
          >
            {game.guessed.includes(l) ? l.toUpperCase() : ''}
          </span>
        ))}
      </p>
      <p>Wrong guesses: {game.wrong}/6</p>
      <div className="grid grid-cols-7 gap-2">
        {LETTERS.map((l) => (
          <button
            key={l}
            id={`key-${l}`}
            onClick={() => handleGuess(l)}
            onTouchStart={(e) => {
              e.preventDefault();
              handleGuess(l);
            }}
            disabled={game.guessed.includes(l) || !!status}
            className="border rounded px-2 py-1 disabled:opacity-50"
            aria-label={`Guess ${l}`}
          >
            {l.toUpperCase()}
          </button>
        ))}
      </div>
      <div className="flex space-x-2">
        <button
          onClick={provideHint}
          disabled={!!status}
          className="border px-2 py-1 rounded"
        >
          Hint
        </button>
        <button onClick={startGame} className="border px-2 py-1 rounded">
          Restart
        </button>
      </div>
      {status && <p>{status}</p>}
    </div>
  );
}

