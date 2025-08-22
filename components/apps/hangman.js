import React, { useState, useEffect } from 'react';

const words = [
  'javascript',
  'nextjs',
  'portfolio',
  'linux',
  'hangman',
  'react',
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

const getRandomWord = () =>
  words[Math.floor(Math.random() * words.length)];

const Hangman = () => {
  const [word, setWord] = useState('');
  const [guessed, setGuessed] = useState([]);
  const [wrong, setWrong] = useState(0);

  useEffect(() => {
    setWord(getRandomWord());
  }, []);

  const handleGuess = (letter) => {
    if (guessed.includes(letter) || isGameOver()) return;
    setGuessed((g) => [...g, letter]);
    if (!word.includes(letter)) {
      setWrong((w) => w + 1);
    }
  };

  const isWinner = () =>
    word && word.split('').every((l) => guessed.includes(l));
  const isLoser = () => wrong >= 6;
  const isGameOver = () => isWinner() || isLoser();

  const reset = () => {
    setWord(getRandomWord());
    setGuessed([]);
    setWrong(0);
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

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white p-4 select-none">
      <HangmanDrawing wrong={wrong} />
      <div className="flex space-x-2 mb-4 text-2xl">
        {word.split('').map((letter, idx) => (
          <span key={idx} className="border-b-2 border-white px-1">
            {guessed.includes(letter) || isLoser() ? letter : ''}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2 mb-4">
        {letters.map((letter) => (
          <button
            key={letter}
            onClick={() => handleGuess(letter)}
            disabled={guessed.includes(letter) || isGameOver()}
            className="px-2 py-1 bg-gray-700 disabled:bg-gray-600 hover:bg-gray-600 rounded"
          >
            {letter.toUpperCase()}
          </button>
        ))}
      </div>
      <div className="mb-4 h-6">
        {isWinner() && 'You won!'}
        {isLoser() && `You lost! The word was ${word}.`}
      </div>
      <button
        onClick={reset}
        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
      >
        Reset
      </button>
    </div>
  );
};

export default Hangman;

