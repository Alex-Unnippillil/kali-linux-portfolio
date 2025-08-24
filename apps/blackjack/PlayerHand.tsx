"use client";

import React from 'react';
import { Hand } from './types';

interface PlayerHandProps {
  hand: Hand;
  active: boolean;
  reduceMotion: boolean;
}

function cardValue(card: { value: string; suit: string }) {
  return card.value + card.suit;
}

const PlayerHand: React.FC<PlayerHandProps> = ({ hand, active, reduceMotion }) => (
  <div aria-label="Player hand" className={`p-2 ${active ? 'ring-2 ring-blue-500' : ''}`}>
    <div className="flex space-x-2">
      {hand.cards.map((card, idx) => (
        <span
          key={idx}
          className={`border p-1 inline-block ${
            reduceMotion ? '' : 'transform-gpu transition-transform duration-500'
          }`}
          aria-label={cardValue(card)}
        >
          {cardValue(card)}
        </span>
      ))}
    </div>
    <div className="text-sm">Bet: {hand.bet}</div>
    {hand.surrendered && <div className="text-sm text-red-500">Surrendered</div>}
  </div>
);

export default React.memo(PlayerHand);
