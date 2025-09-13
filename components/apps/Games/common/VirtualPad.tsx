import React from 'react';

interface PadProps {
  onDirection?: (dir: { x: number; y: number }) => void;
  onButton?: (button: string) => void;
}

/**
 * Simple on screen D-pad and two action buttons (A/B).
 * Designed primarily for touch devices but clickable with a mouse.
 */
export default function VirtualPad({ onDirection, onButton }: PadProps) {
  const handleDir = (x: number, y: number) => () => onDirection?.({ x, y });
  const handleBtn = (b: string) => () => onButton?.(b);

  return (
    <div className="virtual-pad">
      <div className="dpad">
        <button
          className="up"
          aria-label="Up"
          onPointerDown={handleDir(0, -1)}
        />
        <div className="middle">
          <button
            className="left"
            aria-label="Left"
            onPointerDown={handleDir(-1, 0)}
          />
          <button
            className="right"
            aria-label="Right"
            onPointerDown={handleDir(1, 0)}
          />
        </div>
        <button
          className="down"
          aria-label="Down"
          onPointerDown={handleDir(0, 1)}
        />
      </div>
      <div className="actions">
        <button className="btn-a" onPointerDown={handleBtn('A')}>
          A
        </button>
        <button className="btn-b" onPointerDown={handleBtn('B')}>
          B
        </button>
      </div>
    </div>
  );
}
