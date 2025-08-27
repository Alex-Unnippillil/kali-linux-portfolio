import React, { useState, useEffect, useRef, useCallback } from 'react';
import usePersistentState from '../../hooks/usePersistentState';
import confetti from 'canvas-confetti';
import { logEvent, logGameStart, logGameEnd, logGameError } from '../../utils/analytics';

// Available word list themes correspond to JSON files in public/apps/hangman/words
const themes = ['tech', 'animals'];

const lengthOptions = [
  { label: 'Any', min: 0, max: Infinity },
  { label: '4-6', min: 4, max: 6 },
  { label: '7-9', min: 7, max: 9 },
  { label: '10+', min: 10, max: Infinity },
];

const HangmanDrawing = ({ wrong }) => (
  <svg
    height="250"
    width="200"
    className="stroke-white mx-auto"
    strokeLinecap="round"
  >
    {/* base */}
    <line x1="10" y1="240" x2="150" y2="240" strokeWidth="4" />
    <line x1="40" y1="20" x2="40" y2="240" strokeWidth="4" />
    <line x1="40" y1="20" x2="120" y2="20" strokeWidth="4" />
    <line x1="120" y1="20" x2="120" y2="40" strokeWidth="4" />
    {/* head */}
    {wrong > 0 && (
      <circle cx="120" cy="60" r="20" strokeWidth="4" fill="transparent" />
    )}
    {/* body */}
    {wrong > 1 && <line x1="120" y1="80" x2="120" y2="140" strokeWidth="4" />}
    {/* arms */}
    {wrong > 2 && <line x1="120" y1="100" x2="90" y2="120" strokeWidth="4" />}
    {wrong > 3 && <line x1="120" y1="100" x2="150" y2="120" strokeWidth="4" />}
    {/* legs */}
    {wrong > 4 && <line x1="120" y1="140" x2="100" y2="170" strokeWidth="4" />}
    {wrong > 5 && <line x1="120" y1="140" x2="140" y2="170" strokeWidth="4" />}
  </svg>
);

const letters = 'abcdefghijklmnopqrstuvwxyz'.split('');

const Hangman = () => {
  const [theme, setTheme] = useState('tech');
  const [difficulty, setDifficulty] = useState('easy');
  const [lengthIndex, setLengthIndex] = useState(0);
  const [word, setWord] = usePersistentState('hangman-word', '', (v) => typeof v === 'string');
  const [guessed, setGuessed] = usePersistentState('hangman-guessed', [], Array.isArray);
  const [wrong, setWrong] = usePersistentState('hangman-wrong', 0, (v) => typeof v === 'number');
  const [hint, setHint] = useState('');
  const [hintsUsed, setHintsUsed] = usePersistentState('hangman-hints', 0, (v) => typeof v === 'number');
  const [score, setScore] = usePersistentState('hangman-score', 0, (v) => typeof v === 'number');
  const [revealed, setRevealed] = useState([]);
  const [gameEnded, setGameEnded] = useState(false);
  const [shake, setShake] = useState(false);
  const [dictionary, setDictionary] = useState({});
  const [candidates, setCandidates] = useState([]);
  const [entropy, setEntropy] = useState({ total: 0, current: 0, lastGain: 0 });
  const usedWordsRef = useRef([]);

  const length = lengthOptions[lengthIndex];

  const hintLimits = { easy: Infinity, medium: 1, hard: 0 };

  const getFilteredWords = () => {
    const base = dictionary[difficulty] || [];
    return base.filter(
      (w) => w.length >= length.min && w.length <= length.max,
    );
  };

  const selectWord = (options) => {
    let available = options.filter(
      (w) => !usedWordsRef.current.includes(w),
    );
    if (available.length === 0) {
      usedWordsRef.current = [];
      available = options;
    }
    const choice = available[Math.floor(Math.random() * available.length)];
    usedWordsRef.current.push(choice);
    return choice;
  };

  const initGame = () => {
    const options = getFilteredWords();
    setGuessed([]);
    setWrong(0);
    setHint('');
    setHintsUsed(0);
    setScore(0);
    setRevealed([]);
    setGameEnded(false);
    setCandidates(options);
    const totalEntropy = Math.log2(options.length || 1);
    setEntropy({ total: totalEntropy, current: totalEntropy, lastGain: 0 });
    setWord(selectWord(options));
    logGameStart('hangman');
  };

  useEffect(() => {
    let active = true;
    fetch(`/apps/hangman/words/${theme}.json`)
      .then((res) => res.json())
      .then((data) => {
        if (active) {
          setDictionary(data);
        }
      })
      .catch((err) => logGameError('hangman', err?.message || String(err)));
    return () => {
      active = false;
    };
  }, [theme]);

  useEffect(() => {
    usedWordsRef.current = [];
    if (!dictionary[difficulty]) return;
    initGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dictionary, difficulty, lengthIndex]);

  const handleGuess = (letter) => {
    try {
      const btn = document.getElementById(`key-${letter}`);
      if (btn) {
        btn.classList.add('key-press');
        setTimeout(() => btn.classList.remove('key-press'), 100);
      }
      if (guessed.includes(letter) || isGameOver()) return;
      logEvent({ category: 'hangman', action: 'guess', label: letter });

      const prevCandidates = candidates;
      const newCandidates = prevCandidates.filter((w) => {
        for (let i = 0; i < word.length; i += 1) {
          const actual = word[i] === letter;
          const candidate = w[i] === letter;
          if (actual !== candidate) return false;
        }
        return true;
      });
      const prevEntropy = Math.log2(prevCandidates.length || 1);
      const newEntropy = Math.log2(newCandidates.length || 1);
      const gain = prevEntropy - newEntropy;
      setCandidates(newCandidates);
      setEntropy({ total: entropy.total, current: newEntropy, lastGain: gain });

      setGuessed((g) => [...g, letter]);
      if (!word.includes(letter)) {
        setWrong((w) => w + 1);
        setScore((s) => s - 1);
        setShake(true);
        setTimeout(() => setShake(false), 500);
      } else {
        setScore((s) => s + 2);
        setRevealed((r) => [...r, letter]);
        setTimeout(() => setRevealed((r) => r.filter((l) => l !== letter)), 500);
      }
    } catch (err) {
      logGameError('hangman', err?.message || String(err));
    }
  };

  const useHint = () => {
    try {
      if (isGameOver() || hintsUsed >= hintLimits[difficulty]) return;
      const remaining = word
        .split('')
        .filter((l) => !guessed.includes(l));
      if (!remaining.length) return;
      const counts = remaining.reduce((acc, l) => {
        acc[l] = (acc[l] || 0) + 1;
        return acc;
      }, {});
      const best = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0];
      logEvent({ category: 'hangman', action: 'hint' });
      setHint(`Try letter ${best.toUpperCase()}`);
      setScore((s) => s - 5);
      setHintsUsed((h) => h + 1);
    } catch (err) {
      logGameError('hangman', err?.message || String(err));
    }
  };

    const isWinner = useCallback(
      () => word && word.split('').every((l) => guessed.includes(l)),
      [word, guessed]
    );
    const isLoser = useCallback(() => wrong >= 6, [wrong]);
    const isGameOver = useCallback(() => isWinner() || isLoser(), [isWinner, isLoser]);

  const reset = () => {
    initGame();
  };

  useEffect(() => {
    const handler = (e) => {
      const letter = e.key.toLowerCase();
      if (/^[a-z]$/.test(letter)) {
        handleGuess(letter);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  useEffect(() => {
    const winner = word && word.split('').every((l) => guessed.includes(l));
    if (winner) {
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    }
  }, [word, guessed]);

    useEffect(() => {
      if (!gameEnded && isGameOver()) {
        logGameEnd('hangman', isWinner() ? 'win' : 'lose');
        logEvent({
          category: 'hangman',
          action: 'game_over',
          label: isWinner() ? 'win' : 'lose',
          value: guessed.length,
        });
        setGameEnded(true);
      }
    }, [gameEnded, guessed, isGameOver, isWinner]);

  useEffect(() => {
    logEvent({
      category: 'hangman',
      action: 'category_select',
      label: `${theme}-${difficulty}`,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme, difficulty]);

  return (
    <div
      className={`h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white p-4 select-none ${
        shake ? 'shake' : ''
      }`}
    >
      <div className="flex space-x-2 mb-4">
        <select
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          className="bg-gray-700 p-1 rounded"
        >
          {themes.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
          className="bg-gray-700 p-1 rounded"
        >
          {['easy', 'medium', 'hard'].map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <select
          value={lengthIndex}
          onChange={(e) => setLengthIndex(Number(e.target.value))}
          className="bg-gray-700 p-1 rounded"
        >
          {lengthOptions.map((opt, idx) => (
            <option key={opt.label} value={idx}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      <div className="mb-2">Score: {score}</div>
      <div className="w-full max-w-xs bg-gray-700 h-2 mb-2">
        <div
          className="bg-green-500 h-full transition-all"
          style={{
            width: `${
              entropy.total
                ? ((entropy.total - entropy.current) / entropy.total) * 100
                : 0
            }%`,
          }}
        />
      </div>
      <div className="mb-2 text-sm">
        Information gain: {entropy.lastGain.toFixed(2)} bits
      </div>
      <HangmanDrawing wrong={wrong} />
      <div className="flex space-x-2 mb-4 text-2xl">
        {word.split('').map((letter, idx) => (
          <span
            key={idx}
            className={`border-b-2 border-white px-1 ${
              revealed.includes(letter) ? 'reveal' : ''
            }`}
          >
            {guessed.includes(letter) || isLoser() ? letter : ''}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2 mb-4">
        {letters.map((letter) => (
          <button
            id={`key-${letter}`}
            key={letter}
            onClick={() => handleGuess(letter)}
            disabled={guessed.includes(letter) || isGameOver()}
            className={`px-2 py-1 rounded text-white ${
              guessed.includes(letter)
                ? word.includes(letter)
                  ? 'bg-green-700'
                  : 'bg-red-700'
                : 'bg-gray-700 hover:bg-gray-600'
            } disabled:bg-gray-600`}
          >
            {letter.toUpperCase()}
          </button>
        ))}
      </div>
      <div className="mb-2 h-6">
        {isWinner() && 'You won!'}
        {isLoser() && `You lost! The word was ${word}.`}
      </div>
      {hint && !isGameOver() && (
        <div className="mb-2 h-6">Hint: {hint}</div>
      )}
      <div className="flex space-x-2">
        <button
          onClick={useHint}
          disabled={
            isGameOver() || hintsUsed >= hintLimits[difficulty]
          }
          className="px-4 py-2 bg-blue-700 hover:bg-blue-600 rounded disabled:bg-blue-500"
        >
          Hint (-5)
        </button>
        <button
          onClick={reset}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
        >
          Reset
        </button>
      </div>
    </div>
  );
};

export default Hangman;

