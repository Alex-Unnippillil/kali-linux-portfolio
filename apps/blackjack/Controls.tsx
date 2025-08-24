'use client';

import React from 'react';

interface ControlsProps {
  onHit: () => void;
  onStand: () => void;
  onSplit: () => void;
  onDouble: () => void;
  onInsurance: () => void;
  onSurrender: () => void;
  onUndo: () => void;
  canSplit: boolean;
  canDouble: boolean;
  canInsurance: boolean;
  canSurrender: boolean;
  canUndo: boolean;
  disabled: boolean;
  recommended?: string;
}

const Controls: React.FC<ControlsProps> = ({
  onHit,
  onStand,
  onSplit,
  onDouble,
  onInsurance,
  onSurrender,
  onUndo,
  canSplit,
  canDouble,
  canInsurance,
  canSurrender,
  canUndo,
  disabled,
  recommended,
}) => (
  <div className="space-x-2" aria-label="Controls">
    <button
      aria-label="Hit"
      disabled={disabled}
      className={`btn ${recommended === 'hit' ? 'ring-2 ring-green-500' : ''}`}
      onClick={onHit}
    >
      Hit
    </button>
    <button
      aria-label="Stand"
      disabled={disabled}
      className={`btn ${recommended === 'stand' ? 'ring-2 ring-green-500' : ''}`}
      onClick={onStand}
    >
      Stand
    </button>
    <button
      aria-label="Split"
      disabled={disabled || !canSplit}
      className={`btn ${recommended === 'split' ? 'ring-2 ring-green-500' : ''}`}
      onClick={onSplit}
    >
      Split
    </button>
    <button
      aria-label="Double down"
      disabled={disabled || !canDouble}
      className={`btn ${recommended === 'double' ? 'ring-2 ring-green-500' : ''}`}
      onClick={onDouble}
    >
      Double
    </button>
    <button
      aria-label="Surrender"
      disabled={disabled || !canSurrender}
      className={`btn ${recommended === 'surrender' ? 'ring-2 ring-green-500' : ''}`}
      onClick={onSurrender}
    >
      Surrender
    </button>
    <button aria-label="Undo" disabled={disabled || !canUndo} className="btn" onClick={onUndo}>
      Undo
    </button>
    <button
      aria-label="Insurance"
      disabled={disabled || !canInsurance}
      className="btn"
      onClick={onInsurance}
    >
      Insurance
    </button>
  </div>
);

export default React.memo(Controls);
