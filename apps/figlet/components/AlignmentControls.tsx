import React from "react";

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
    <div className="flex items-center gap-2 text-xs uppercase tracking-wide">
      Align
      <select
        value={align}
        onChange={(e) => setAlign(e.target.value)}
        className="rounded border border-black/40 bg-gray-800 px-2 py-1 text-white"
        aria-label="Alignment"
      >
        <option value="left">Left</option>
        <option value="center">Center</option>
        <option value="right">Right</option>
        <option value="justify">Justify</option>
      </select>
      <label className="flex items-center gap-2">
        Padding
        <input
          type="number"
          min="0"
          value={padding}
          onChange={(e) => setPadding(Number(e.target.value))}
          className="w-16 rounded border border-black/40 bg-gray-800 px-2 py-1 text-white"
          aria-label="Padding"
        />
      </label>
    </div>
  );
};

export default AlignmentControls;
