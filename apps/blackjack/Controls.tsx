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
}) => (
  <div className="space-x-2" aria-label="Controls">
    <button aria-label="Hit" disabled={disabled} className="btn" onClick={onHit}>Hit</button>
    <button aria-label="Stand" disabled={disabled} className="btn" onClick={onStand}>Stand</button>
    <button aria-label="Split" disabled={disabled || !canSplit} className="btn" onClick={onSplit}>Split</button>
    <button aria-label="Double down" disabled={disabled || !canDouble} className="btn" onClick={onDouble}>Double</button>
    <button aria-label="Surrender" disabled={disabled || !canSurrender} className="btn" onClick={onSurrender}>Surrender</button>
    <button aria-label="Undo" disabled={disabled || !canUndo} className="btn" onClick={onUndo}>Undo</button>
    <button aria-label="Insurance" disabled={disabled || !canInsurance} className="btn" onClick={onInsurance}>Insurance</button>
  </div>
);

export default React.memo(Controls);
