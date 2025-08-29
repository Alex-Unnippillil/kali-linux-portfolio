import React from 'react';

interface AlignmentControlsProps {
  align: string;
  setAlign: (value: string) => void;
  padding: number;
  setPadding: (value: number) => void;
}

const AlignmentControls: React.FC<AlignmentControlsProps> = ({
  align,
  setAlign,
  padding,
  setPadding,
}) => {
  return (
    <div className="flex items-center gap-1 text-sm">
      Align
      <select
        value={align}
        onChange={(e) => setAlign(e.target.value)}
        className="px-1 bg-gray-700 text-white"
        aria-label="Alignment"
      >
        <option value="left">Left</option>
        <option value="center">Center</option>
        <option value="right">Right</option>
        <option value="justify">Justify</option>
      </select>
      <label className="flex items-center gap-1">
        Padding
        <input
          type="number"
          min="0"
          value={padding}
          onChange={(e) => setPadding(Number(e.target.value))}
          className="w-12 px-1 bg-gray-700 text-white"
          aria-label="Padding"
        />
      </label>
    </div>
  );
};

export default AlignmentControls;
