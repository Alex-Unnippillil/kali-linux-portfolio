import { useState } from 'react';
import dynamic from 'next/dynamic';

const Blackjack = dynamic(() => import('../../components/apps/blackjack'), {
  ssr: false,
});

export default function BlackjackPage() {
  const [decks, setDecks] = useState(6);
  const [hitSoft17, setHitSoft17] = useState(true);
  const [allowSurrender, setAllowSurrender] = useState(true);
  const [penetration, setPenetration] = useState(0.75);

  return (
    <div className="h-full w-full flex flex-col">
      <div className="p-2 bg-ub-cool-grey text-white flex space-x-4 items-center">
        <label className="flex items-center space-x-1">
          <span className="text-sm">Decks</span>
          <input
            type="number"
            min={1}
            max={8}
            value={decks}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              if (!Number.isNaN(val)) setDecks(val);
            }}
            className="w-16 text-black px-1"
          />
        </label>
        <label className="flex items-center space-x-1">
          <span className="text-sm">Pen</span>
          <input
            type="number"
            min={0.5}
            max={0.95}
            step={0.05}
            value={penetration}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              if (!Number.isNaN(val)) setPenetration(val);
            }}
            className="w-16 text-black px-1"
          />
        </label>
        <label className="flex items-center space-x-1">
          <input
            type="checkbox"
            checked={hitSoft17}
            onChange={() => setHitSoft17(!hitSoft17)}
          />
          <span className="text-sm">Hit Soft 17</span>
        </label>
        <label className="flex items-center space-x-1">
          <input
            type="checkbox"
            checked={allowSurrender}
            onChange={() => setAllowSurrender(!allowSurrender)}
          />
          <span className="text-sm">Allow Surrender</span>
        </label>
      </div>
      <Blackjack
        decks={decks}
        hitSoft17={hitSoft17}
        allowSurrender={allowSurrender}
        penetration={penetration}
      />
    </div>
  );
}

