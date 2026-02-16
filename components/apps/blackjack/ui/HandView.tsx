import React, { memo } from 'react';
import { evaluateHand } from '../domain/hand';
import { HandState } from '../domain/types';

export const HandView = memo(({ hand, active, title }: { hand: HandState; active?: boolean; title: string }) => {
  const summary = evaluateHand(hand.cards);
  return (
    <section
      className={`rounded border p-3 ${active ? 'border-kali-primary bg-kali-surface/80' : 'border-kali-border bg-kali-panel/70'}`}
      aria-label={`${title} hand`}
    >
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="mt-2 flex flex-wrap gap-2" aria-label={`${title} cards`}>
        {hand.cards.map((card, idx) => (
          <span key={`${card.rank}${card.suit}-${idx}`} className="rounded border border-kali-border px-2 py-1 text-sm" aria-label={`Card ${card.rank}${card.suit}`}>
            {card.rank}{card.suit}
          </span>
        ))}
      </div>
      <p className="mt-2 text-xs text-kali-text/80" aria-label={`${title} total`}>
        Total: {summary.best} {summary.isSoft ? '(soft)' : ''}
      </p>
      {hand.result && <p className="text-xs font-semibold uppercase">{hand.result}</p>}
    </section>
  );
});

HandView.displayName = 'HandView';
