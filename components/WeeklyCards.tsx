import { useEffect, useState } from 'react';
import cardsData from '../data/weeklyCards.json';

type Card = {
  title: string;
  description: string;
};

interface Props {
  cards?: Card[];
}

const ROTATE_MS = 5000;

export default function WeeklyCards({ cards = cardsData }: Props) {
  const [index, setIndex] = useState(0);
  const [pinnedIndex, setPinnedIndex] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);

  const activeIndex = pinnedIndex ?? index;

  useEffect(() => {
    if (pinnedIndex !== null || paused) return;
    const id = setInterval(() => {
      setIndex((prev) => (prev + 1) % cards.length);
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, [cards.length, pinnedIndex, paused]);

  const togglePin = () => {
    setPinnedIndex(pinnedIndex === activeIndex ? null : activeIndex);
  };

  return (
    <div
      data-testid="weekly-card"
      tabIndex={0}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className="mx-auto my-4 max-w-md rounded border bg-gray-800 p-4 text-white"
    >
      <h2 className="text-lg font-bold">{cards[activeIndex].title}</h2>
      <p className="text-sm">{cards[activeIndex].description}</p>
      <button
        type="button"
        onClick={togglePin}
        className="mt-2 text-xs underline"
      >
        {pinnedIndex !== null ? 'Unpin' : 'Pin'}
      </button>
    </div>
  );
}
