import React from 'react';
/**
 * Simple on screen D-pad and two action buttons (A/B).
 * Designed primarily for touch devices but clickable with a mouse.
 */
export default function VirtualPad({ onDirection, onButton }) {
    const handleDir = (x, y) => () => onDirection?.({ x, y });
    const handleBtn = (b) => () => onButton?.(b);
    return (<div className="virtual-pad">
      <div className="dpad">
        <button className="up" onPointerDown={handleDir(0, -1)}/>
        <div className="middle">
          <button className="left" onPointerDown={handleDir(-1, 0)}/>
          <button className="right" onPointerDown={handleDir(1, 0)}/>
        </div>
        <button className="down" onPointerDown={handleDir(0, 1)}/>
      </div>
      <div className="actions">
        <button className="btn-a" onPointerDown={handleBtn('A')}>
          A
        </button>
        <button className="btn-b" onPointerDown={handleBtn('B')}>
          B
        </button>
      </div>
    </div>);
}
