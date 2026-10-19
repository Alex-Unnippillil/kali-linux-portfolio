import React from 'react';

interface PadProps {
  onDirection?: (dir: { x: number; y: number }) => void;
  onButton?: (button: string) => void;
  disabled?: boolean;
  label?: string;
}

/**
 * Simple on screen D-pad and two action buttons (A/B).
 * Designed primarily for touch devices but clickable with a mouse.
 */
export default function VirtualPad({
  onDirection,
  onButton,
  disabled = false,
  label = 'Game controls',
}: PadProps) {
  const handleDir = (x: number, y: number) => () => onDirection?.({ x, y });
  const handleBtn = (b: string) => () => onButton?.(b);

  return (
    <div className="virtual-pad" role="group" aria-label={label}>
      <div className="dpad">
        <button type="button" aria-label="Move up" disabled={disabled} className="up" onClick={handleDir(0, -1)} />
        <div className="middle">
          <button type="button" aria-label="Move left" disabled={disabled} className="left" onClick={handleDir(-1, 0)} />
          <button type="button" aria-label="Move right" disabled={disabled} className="right" onClick={handleDir(1, 0)} />
        </div>
        <button type="button" aria-label="Move down" disabled={disabled} className="down" onClick={handleDir(0, 1)} />
      </div>
      <div className="actions">
        <button type="button" aria-label="Action A" disabled={disabled} className="btn-a" onClick={handleBtn('A')}>
          A
        </button>
        <button type="button" aria-label="Action B" disabled={disabled} className="btn-b" onClick={handleBtn('B')}>
          B
        </button>
      </div>
    </div>
  );
}
