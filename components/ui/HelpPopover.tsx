import React from 'react';

interface HelpPopoverProps {
  text: string;
  x: number;
  y: number;
}

const HelpPopover = ({ text, x, y }: HelpPopoverProps) => (
  <div
    className="fixed z-50 bg-gray-800 text-white text-sm p-2 rounded shadow-lg max-w-xs"
    style={{ top: y, left: x }}
    role="tooltip"
  >
    <p>{text}</p>
    <p className="mt-1 text-xs text-gray-300">Press Esc to close</p>
  </div>
);

export default HelpPopover;
