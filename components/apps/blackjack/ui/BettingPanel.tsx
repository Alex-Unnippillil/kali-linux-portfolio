import React from 'react';

export const BettingPanel = ({ bet, bankroll, onBetChange, onDeal, canDeal }: {
  bet: number;
  bankroll: number;
  onBetChange: (value: number) => void;
  onDeal: () => void;
  canDeal: boolean;
}) => (
  <div className="rounded border border-kali-border bg-kali-panel p-3">
    <label htmlFor="blackjack-bet" className="text-sm">Bet</label>
    <div className="mt-2 flex items-center gap-2">
      <button type="button" className="rounded bg-kali-muted px-2 py-1" onClick={() => onBetChange(Math.max(5, bet - 5))} aria-label="Decrease bet by 5">-5</button>
      <input
        id="blackjack-bet"
        type="number"
        min={5}
        max={bankroll}
        value={bet}
        className="w-24 rounded border border-kali-border bg-kali-surface px-2 py-1"
        aria-label="Bet amount"
        onChange={(e) => onBetChange(Number(e.target.value || 0))}
      />
      <button type="button" className="rounded bg-kali-muted px-2 py-1" onClick={() => onBetChange(Math.min(bankroll, bet + 5))} aria-label="Increase bet by 5">+5</button>
      <button type="button" className="rounded bg-kali-primary px-3 py-1 text-kali-inverse disabled:opacity-40" onClick={onDeal} disabled={!canDeal}>Deal</button>
    </div>
  </div>
);
