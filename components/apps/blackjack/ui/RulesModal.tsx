import React from 'react';
import { GameConfig } from '../domain/types';

export const RulesModal = ({
  open,
  config,
  onClose,
  onSave,
}: {
  open: boolean;
  config: GameConfig;
  onClose: () => void;
  onSave: (config: Partial<GameConfig>) => void;
}) => {
  if (!open) return null;
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded border border-kali-border bg-kali-panel p-4">
        <h2 className="text-sm font-semibold">Table Rules</h2>
        <label className="mt-3 flex items-center justify-between text-sm">
          Dealer hits soft 17
          <input aria-label="Dealer hits soft 17" type="checkbox" checked={config.dealerHitsSoft17} onChange={(e) => onSave({ dealerHitsSoft17: e.target.checked })} />
        </label>
        <label className="mt-3 flex items-center justify-between text-sm">
          Blackjack payout
          <select aria-label="Blackjack payout" value={config.blackjackPayout} onChange={(e) => onSave({ blackjackPayout: Number(e.target.value) as 1.5 | 1.2 })}>
            <option value={1.5}>3:2</option>
            <option value={1.2}>6:5</option>
          </select>
        </label>
        <div className="mt-4 text-right">
          <button type="button" className="rounded bg-kali-muted px-3 py-1" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};
