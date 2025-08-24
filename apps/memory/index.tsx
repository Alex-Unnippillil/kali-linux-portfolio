import React, { useState, useEffect } from 'react';

const themePacks: Record<string, string[]> = {
  emoji: ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼'],
  icons: ['★','♥','♦','♣','♠','☀','☂','☁'],
};

const COMBO_WINDOW = 3000; // ms

interface Card {
  id: number;
  content: string;
  flipped: boolean;
  matched: boolean;
}

const shuffle = <T,>(array: T[]): T[] => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

const createDeck = (theme: string): Card[] => {
  const items = themePacks[theme];
  const deck = [...items, ...items].map((content, idx) => ({
    id: idx,
    content,
    flipped: false,
    matched: false,
  }));
  return shuffle(deck);
};

const Memory: React.FC = () => {
  const [theme, setTheme] = useState('emoji');
  const [cards, setCards] = useState<Card[]>(() => createDeck('emoji'));
  const [flipped, setFlipped] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [combo, setCombo] = useState(0);
  const [comboExpiry, setComboExpiry] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (!comboExpiry) return;
    const tick = () => setTimeLeft(Math.max(0, comboExpiry - Date.now()));
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [comboExpiry]);

  const resetGame = (t = theme) => {
    setCards(createDeck(t));
    setFlipped([]);
    setMoves(0);
    setCombo(0);
    setComboExpiry(0);
  };

  const handleTheme = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const t = e.target.value;
    setTheme(t);
    resetGame(t);
  };

  const flipCard = (index: number) => {
    if (cards[index].flipped || cards[index].matched || flipped.length === 2) return;
    const newCards = cards.slice();
    newCards[index].flipped = true;
    const newFlipped = [...flipped, index];
    setCards(newCards);
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      setMoves((m) => m + 1);
      const [a, b] = newFlipped;
      if (newCards[a].content === newCards[b].content) {
        newCards[a].matched = newCards[b].matched = true;
        setCards([...newCards]);
        const now = Date.now();
        if (now < comboExpiry) {
          setCombo((c) => c + 1);
        } else {
          setCombo(1);
        }
        setComboExpiry(now + COMBO_WINDOW);
        setFlipped([]);
      } else {
        setTimeout(() => {
          newCards[a].flipped = false;
          newCards[b].flipped = false;
          setCards([...newCards]);
          setFlipped([]);
          setCombo(0);
          setComboExpiry(0);
        }, 800);
      }
    }
  };

  const allMatched = cards.every((c) => c.matched);

  return (
    <div className="p-4 select-none">
      <div className="mb-2 flex items-center gap-4">
        <div>Moves: {moves}</div>
        <div>
          Combo: {combo}
          {combo > 0 && (
            <span className="text-xs"> ({(timeLeft / 1000).toFixed(1)}s)</span>
          )}
        </div>
        <select
          aria-label="Theme"
          value={theme}
          onChange={handleTheme}
          className="border p-1 text-sm"
        >
          {Object.keys(themePacks).map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <button
          onClick={() => resetGame()}
          className="border px-2 py-1 text-sm"
        >
          Reset
        </button>
      </div>
      {allMatched && <div className="mb-2">🎉 Completed in {moves} moves!</div>}
      <div className="grid grid-cols-4 gap-2">
        {cards.map((card, idx) => (
          <button
            key={card.id}
            onClick={() => flipCard(idx)}
            className={`card w-16 h-16 relative focus:outline-none ${
              card.flipped || card.matched ? 'flipped' : ''
            }`}
            aria-label={
              card.flipped || card.matched ? card.content : 'hidden card'
            }
          >
            <div className="card-inner w-full h-full">
              <div className="card-face card-back" />
              <div className="card-face card-front">{card.content}</div>
            </div>
          </button>
        ))}
      </div>
      <style jsx>{`
        .card {
          perspective: 600px;
        }
        .card-inner {
          position: relative;
          transform-style: preserve-3d;
          transition: transform 0.3s;
          will-change: transform;
        }
        .card.flipped .card-inner {
          transform: rotateY(180deg);
        }
        .card-face {
          position: absolute;
          width: 100%;
          height: 100%;
          backface-visibility: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
          border-radius: 0.25rem;
        }
        .card-back {
          background: #3b82f6;
          color: white;
        }
        .card-front {
          background: white;
          transform: rotateY(180deg);
        }
      `}</style>
    </div>
  );
};

export default Memory;

