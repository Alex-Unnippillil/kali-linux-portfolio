import React, { useState, useRef, useEffect } from 'react';
import { Shoe } from './engine';

const BlackjackTrainer = () => {
  const shoeRef = useRef(new Shoe(1));
  const [card, setCard] = useState(null);
  const [guess, setGuess] = useState('');
  const [feedback, setFeedback] = useState('');
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);

  const drawCard = () => {
    setCard(shoeRef.current.draw());
  };

  useEffect(() => {
    drawCard();
  }, []);

  const submitGuess = () => {
    const g = parseInt(guess, 10);
    const actual = shoeRef.current.runningCount;
    if (g === actual) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      if (newStreak > bestStreak) setBestStreak(newStreak);
      setFeedback(`Correct! Count is ${actual}`);
    } else {
      setStreak(0);
      setFeedback(`Nope. Count is ${actual}`);
    }
    setGuess('');
    drawCard();
  };

  const reset = () => {
    shoeRef.current.shuffle();
    setStreak(0);
    setFeedback('');
    drawCard();
  };

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white p-4 select-none">
      {card && <div className="text-4xl mb-4">{`${card.value}${card.suit}`}</div>}
      <input
        type="number"
        value={guess}
        onChange={(e) => setGuess(e.target.value)}
        className="text-black mb-2 px-2 py-1"
      />
      <div className="flex space-x-2">
        <button className="px-3 py-1 bg-gray-700" onClick={submitGuess}>
          Submit
        </button>
        <button className="px-3 py-1 bg-gray-700" onClick={reset}>
          New Shoe
        </button>
      </div>
      {feedback && <div className="mt-2">{feedback}</div>}
      <div className="mt-4">Streak: {streak}</div>
      <div className="mt-1">Best: {bestStreak}</div>
      <div className="mt-1">RC: {shoeRef.current.runningCount}</div>
      <div className="mt-1 text-xs">
        {Object.entries(shoeRef.current.composition)
          .map(([v, c]) => `${v}:${c}`)
          .join(' ')}
      </div>
    </div>
  );
};

export default BlackjackTrainer;
