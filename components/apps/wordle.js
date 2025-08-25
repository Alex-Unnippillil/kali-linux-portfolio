import React, { useState } from 'react';
import { withGameErrorBoundary } from './GameErrorBoundary';

const Wordle = () => {
  const [guess, setGuess] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white p-4 space-y-4">
      <h1 className="text-xl font-bold">Wordle</h1>
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
      </form>
      {submitted && (
        <div className="text-sm">
          You guessed: <span className="font-mono">{guess}</span>
        </div>
      )}
    </div>
  );
};

const WordleWithBoundary = withGameErrorBoundary(Wordle);

export default WordleWithBoundary;
