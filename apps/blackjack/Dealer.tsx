import React from 'react';
import { Card } from './types';

interface DealerProps {
  hand: Card[];
  hideHoleCard: boolean;
}

function cardValue(card: Card) {
  return card.value + card.suit;
}

const Dealer: React.FC<DealerProps> = ({ hand, hideHoleCard }) => {
  return (
    <div aria-label="Dealer" className="p-2">
      <h2 className="font-bold">Dealer</h2>
      <div className="flex space-x-2">
        {hand.map((card, idx) => (
          <span key={idx} className="border p-1" aria-label={hideHoleCard && idx === 1 ? 'Hidden card' : cardValue(card)}>
            {hideHoleCard && idx === 1 ? '🂠' : cardValue(card)}
          </span>
        ))}
      </div>
    </div>
  );
};

export default React.memo(Dealer);
