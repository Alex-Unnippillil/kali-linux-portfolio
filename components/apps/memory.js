import React, { useState, useEffect } from 'react';

const createDeck = () => {
  const emojis = ['\u{1F34E}', '\u{1F34C}', '\u{1F347}', '\u{1F353}', '\u{1F34D}', '\u{1F95D}', '\u{1F351}', '\u{1F951}'];
  return [...emojis, ...emojis]
    .sort(() => Math.random() - 0.5)
    .map((value, index) => ({ id: index, value }));
};

const Memory = () => {
  const [cards, setCards] = useState([]);
  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState([]);

  useEffect(() => {
    setCards(createDeck());
  }, []);

  const handleFlip = (idx) => {
    if (flipped.length === 2 || flipped.includes(idx) || matched.includes(idx)) return;

    const newFlipped = [...flipped, idx];
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      const [first, second] = newFlipped;
      if (cards[first].value === cards[second].value) {
        setMatched([...matched, first, second]);
        setTimeout(() => setFlipped([]), 500);
      } else {
        setTimeout(() => setFlipped([]), 1000);
      }
    }
  };

  const reset = () => {
    setCards(createDeck());
    setFlipped([]);
    setMatched([]);
  };

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white p-4">
      <div className="grid grid-cols-4 gap-2 mb-4">
        {cards.map((card, idx) => {
          const isFlipped = flipped.includes(idx) || matched.includes(idx);
          return (
            <button
              key={card.id}
              className="h-16 w-16 bg-gray-700 hover:bg-gray-600 flex items-center justify-center text-2xl"
              onClick={() => handleFlip(idx)}
            >
              {isFlipped ? card.value : ''}
            </button>
          );
        })}
      </div>
      <button
        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
        onClick={reset}
      >
        Reset
      </button>
    </div>
  );
};

export default Memory;
