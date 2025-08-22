import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import confetti from 'canvas-confetti';
import ReactGA from 'react-ga4';

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
    aria-hidden="true"
  >
    <line x1="10" y1="240" x2="150" y2="240" strokeWidth="4" />
    <line x1="40" y1="20" x2="40" y2="240" strokeWidth="4" />
    <line x1="40" y1="20" x2="120" y2="20" strokeWidth="4" />
    <line x1="120" y1="20" x2="120" y2="40" strokeWidth="4" />
    {wrong > 0 && (
      <circle cx="120" cy="60" r="20" strokeWidth="4" fill="transparent" />
    )}
    {wrong > 1 && <line x1="120" y1="80" x2="120" y2="140" strokeWidth="4" />}
    {wrong > 2 && <line x1="120" y1="100" x2="90" y2="120" strokeWidth="4" />}
    {wrong > 3 && <line x1="120" y1="100" x2="150" y2="120" strokeWidth="4" />}
    {wrong > 4 && <line x1="120" y1="140" x2="100" y2="170" strokeWidth="4" />}
    {wrong > 5 && <line x1="120" y1="140" x2="140" y2="170" strokeWidth="4" />}
  </svg>
);

const letters = 'abcdefghijklmnopqrstuvwxyz'.split('');
const themes = ['movies', 'animals'];

const Hangman = () => {
  const router = useRouter();
  const initialTheme =
    typeof router.query.theme === 'string' && themes.includes(router.query.theme)
      ? router.query.theme
      : themes[0];
  const [theme, setTheme] = useState(initialTheme);
  const [dictionary, setDictionary] = useState({ easy: [], medium: [], hard: [] });
  const [difficulty, setDifficulty] = useState('easy');
  const [lengthIndex, setLengthIndex] = useState(0);
  const [word, setWord] = useState('');
  const [category, setCategory] = useState('');
  const [guessed, setGuessed] = useState([]);
  const [wrong, setWrong] = useState(0);
  const [letterHint, setLetterHint] = useState('');
  const [categoryHintShown, setCategoryHintShown] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [score, setScore] = useState(0);
  const [revealed, setRevealed] = useState([]);
  const [gameEnded, setGameEnded] = useState(false);
  const [shake, setShake] = useState(false);
  const [highScore, setHighScore] = useState(0);
  const usedWordsRef = useRef([]);

  const length = lengthOptions[lengthIndex];
  const hintLimits = useMemo(() => ({ easy: Infinity, medium: 1, hard: 0 }), []);

  useEffect(() => {
    if (typeof router.query.theme === 'string' && themes.includes(router.query.theme)) {
      setTheme(router.query.theme);
    }
  }, [router.query.theme]);

  useEffect(() => {
    fetch(`/wordlists/${theme}.json`)
      .then((res) => res.json())
      .then((data) => setDictionary(data))
      .catch(() => setDictionary({ easy: [], medium: [], hard: [] }));
  }, [theme]);

  useEffect(() => {
    const key = `hangman-${theme}-${difficulty}-highscore`;
    const saved = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
    setHighScore(saved ? Number(saved) : 0);
  }, [theme, difficulty]);

  const getFilteredWords = useCallback(() => {
    const base = dictionary[difficulty] || [];
    return base.filter(
      (w) => w.word.length >= length.min && w.word.length <= length.max,
    );
  }, [dictionary, difficulty, length.min, length.max]);

  const selectWord = useCallback(() => {
    const options = getFilteredWords();
    let available = options.filter((w) => !usedWordsRef.current.includes(w.word));
    if (available.length === 0) {
      usedWordsRef.current = [];
      available = options;
    }
    const choice = available[Math.floor(Math.random() * available.length)];
    usedWordsRef.current.push(choice.word);
    return choice;
  }, [getFilteredWords]);

  const initGame = useCallback(() => {
    const choice = selectWord();
    setGuessed([]);
    setWrong(0);
    setLetterHint('');
    setCategoryHintShown(false);
    setHintsUsed(0);
    setScore(0);
    setRevealed([]);
    setGameEnded(false);
    setWord(choice?.word || '');
    setCategory(choice?.category || '');
  }, [selectWord]);

  useEffect(() => {
    if (dictionary.easy.length || dictionary.medium.length || dictionary.hard.length) {
      usedWordsRef.current = [];
      initGame();
    }
  }, [dictionary, initGame, difficulty, lengthIndex]);

  const isWinner = useCallback(
    () => word.split('').every((l) => guessed.includes(l)),
    [word, guessed],
  );

  const isLoser = useCallback(() => wrong >= 6, [wrong]);

  const isGameOver = useCallback(() => isWinner() || isLoser(), [isWinner, isLoser]);

  const handleGuess = useCallback(
    (letter) => {
      letter = letter.toLowerCase();
      const btn = document.getElementById(`key-${letter}`);
      if (btn) {
        btn.classList.add('key-press');
        setTimeout(() => btn.classList.remove('key-press'), 100);
      }
      if (guessed.includes(letter) || isGameOver()) return;
      ReactGA.event({ category: 'hangman', action: 'guess', label: letter });
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
    },
    [guessed, isGameOver, word],
  );

  useEffect(() => {
    const onKey = (e) => {
      const key = e.key.toLowerCase();
      if (letters.includes(key)) {
        e.preventDefault();
        handleGuess(key);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleGuess]);

  const revealLetter = useCallback(() => {
    if (isGameOver() || hintsUsed >= hintLimits[difficulty]) return;
    const remaining = word
      .split('')
      .filter((l) => !guessed.includes(l));
    if (!remaining.length) return;
    const unique = Array.from(new Set(remaining));
    const reveal = unique[Math.floor(Math.random() * unique.length)];
    ReactGA.event({ category: 'hangman', action: 'hint_letter' });
    setGuessed((g) => [...g, reveal]);
    setLetterHint(reveal);
    setScore((s) => s - 5);
    setHintsUsed((h) => h + 1);
    setRevealed((r) => [...r, reveal]);
    setTimeout(() => setRevealed((r) => r.filter((l) => l !== reveal)), 500);
  }, [difficulty, guessed, hintLimits, hintsUsed, isGameOver, word]);

  const revealCategory = useCallback(() => {
    if (isGameOver() || categoryHintShown) return;
    ReactGA.event({ category: 'hangman', action: 'hint_category' });
    setCategoryHintShown(true);
    setScore((s) => s - 2);
  }, [categoryHintShown, isGameOver]);

  const reset = useCallback(() => {
    initGame();
  }, [initGame]);

  const saveHigh = useCallback(
    (finalScore) => {
      const key = `hangman-${theme}-${difficulty}-highscore`;
      if (finalScore > highScore) {
        localStorage.setItem(key, String(finalScore));
        setHighScore(finalScore);
        fetch('/api/hangman/highscore', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ theme, difficulty, score: finalScore }),
        }).catch(() => {});
      }
    },
    [difficulty, theme, highScore],
  );

  useEffect(() => {
    if (!gameEnded && isGameOver()) {
      ReactGA.event({
        category: 'hangman',
        action: 'game_over',
        label: isWinner() ? 'win' : 'lose',
        value: guessed.length,
      });
      if (isWinner()) {
        confetti({ particleCount: 100, spread: 70 });
      }
      setGameEnded(true);
      saveHigh(score);
    }
  }, [gameEnded, guessed, isGameOver, isWinner, saveHigh, score]);

  useEffect(() => {
    ReactGA.event({
      category: 'hangman',
      action: 'category_select',
      label: `${theme}-${difficulty}`,
    });
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
          aria-label="Select theme"
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
          aria-label="Select difficulty"
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
          aria-label="Select word length"
        >
          {lengthOptions.map((opt, idx) => (
            <option key={opt.label} value={idx}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      <div className="mb-2">Score: {score} (High: {highScore})</div>
      <HangmanDrawing wrong={wrong} />
      <div className="flex space-x-2 mb-4 text-2xl" aria-label="Word display">
        {word.split('').map((letter, idx) => (
          <span
            key={idx}
            className={`border-b-2 border-white px-1 ${
              revealed.includes(letter) ? 'reveal' : ''
            }`}
            aria-label={guessed.includes(letter) || isLoser() ? letter : 'blank'}
          >
            {guessed.includes(letter) || isLoser() ? letter : ''}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2 mb-4" aria-label="Keyboard">
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
            aria-label={`Letter ${letter.toUpperCase()}`}
          >
            {letter.toUpperCase()}
          </button>
        ))}
      </div>
      <div className="mb-2 h-6" role="status" aria-live="polite">
        {isWinner() && 'You won!'}
        {isLoser() && `You lost! The word was ${word}.`}
      </div>
      {letterHint && !isGameOver() && <div className="mb-2 h-6">Hint: {letterHint}</div>}
      {categoryHintShown && !isGameOver() && (
        <div className="mb-2 h-6">Category: {category}</div>
      )}
      <div className="flex space-x-2">
        <button
          onClick={revealLetter}
          disabled={isGameOver() || hintsUsed >= hintLimits[difficulty]}
          className="px-4 py-2 bg-blue-700 hover:bg-blue-600 rounded disabled:bg-blue-500"
          aria-label="Reveal a letter"
        >
          Reveal Letter (-5)
        </button>
        <button
          onClick={revealCategory}
          disabled={isGameOver() || categoryHintShown}
          className="px-4 py-2 bg-purple-700 hover:bg-purple-600 rounded disabled:bg-purple-500"
          aria-label="Reveal category"
        >
          Reveal Category (-2)
        </button>
        <button
          onClick={reset}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
          aria-label="Reset game"
        >
          Reset
        </button>
      </div>
    </div>
  );
};

export default Hangman;
