import React from 'react';

interface SizeSelectorProps {
  value: number;
  onChange: (size: number) => void;
}

/**
 * Dropdown for selecting the memory board size.
 * Supports 2x2 through 8x8 grids. The parent component
 * owns the state and passes the current value plus a handler.
 */
const SizeSelector: React.FC<SizeSelectorProps> = ({ value, onChange }) => {
  return (
    <label className="flex items-center space-x-2">
      <span className="text-sm">Grid</span>
      <select
        aria-label="Grid size"
        className="surface-100 px-2 py-1 rounded text-text"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      >
        <option value={2}>2x2</option>
        <option value={4}>4x4</option>
        <option value={6}>6x6</option>
        <option value={8}>8x8</option>
      </select>
    </label>
  );
};

export default SizeSelector;
