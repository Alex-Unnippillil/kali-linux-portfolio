import React from 'react';
import { HandView } from './HandView';
import { HandState } from '../domain/types';

export const Table = ({ dealer, hands, activeIndex }: { dealer: HandState; hands: HandState[]; activeIndex: number }) => (
  <div className="space-y-3">
    <HandView hand={dealer} title="Dealer" />
    <div className="grid gap-2 md:grid-cols-2">
      {hands.map((hand, idx) => (
        <HandView key={hand.id} hand={hand} title={`Player ${idx + 1}`} active={idx === activeIndex} />
      ))}
    </div>
  </div>
);
