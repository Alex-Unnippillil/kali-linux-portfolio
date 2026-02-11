import React from 'react';
import { PlayerAction } from '../domain/types';

const labels: Record<PlayerAction, string> = {
  HIT: 'Hit (H)',
  STAND: 'Stand (S)',
  DOUBLE: 'Double (D)',
  SPLIT: 'Split (P)',
  SURRENDER: 'Surrender',
};

export const Controls = ({ legalActions, onAction }: { legalActions: PlayerAction[]; onAction: (a: PlayerAction) => void }) => (
  <div className="flex flex-wrap gap-2" aria-label="Player actions">
    {(Object.keys(labels) as PlayerAction[]).map((action) => (
      <button
        key={action}
        type="button"
        className="rounded bg-kali-muted px-3 py-2 text-sm disabled:opacity-40"
        onClick={() => onAction(action)}
        disabled={!legalActions.includes(action)}
      >
        {labels[action]}
      </button>
    ))}
  </div>
);
