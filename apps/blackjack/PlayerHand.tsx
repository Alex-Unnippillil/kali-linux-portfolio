import React from 'react';
import { Hand } from './types';

interface PlayerHandProps {
  hand: Hand;
  active: boolean;
}

function cardValue(card: { value: string; suit: string }) {
  return card.value + card.suit;
}

const PlayerHand: React.FC<PlayerHandProps> = ({ hand, active }) => {
  return (
    <div aria-label="Player hand" className={`p-2 ${active ? 'ring-2 ring-blue-500' : ''}`}>
      <div className="flex space-x-2">
        {hand.cards.map((card, idx) => (
          <span key={idx} className="border p-1" aria-label={cardValue(card)}>
            {cardValue(card)}
          </span>
        ))}
      </div>
      <div className="text-sm">Bet: {hand.bet}</div>
    </div>
  );
};

export default React.memo(PlayerHand);
