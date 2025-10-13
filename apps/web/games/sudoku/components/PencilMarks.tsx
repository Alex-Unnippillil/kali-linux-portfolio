import React, { useState } from "react";

export type PencilMarksProps = {
  /**
   * Current list of candidate numbers for the cell.
   */
  marks: number[];
  /**
   * Notify parent components when the marks change.
   */
  onChange: (marks: number[]) => void;
  /**
   * Whether the marks should start hidden.
   */
  hidden?: boolean;
};

/**
 * PencilMarks renders a 3x3 grid allowing the user to note potential
 * candidates for a Sudoku cell. Each number can be toggled individually and
 * the entire set of notes can be shown or hidden per cell.
 */
const PencilMarks: React.FC<PencilMarksProps> = ({
  marks,
  onChange,
  hidden,
}) => {
  const [visible, setVisible] = useState(!hidden);

  const toggleMark = (n: number) => {
    const next = marks.includes(n)
      ? marks.filter((m) => m !== n)
      : [...marks, n];
    onChange(next.sort((a, b) => a - b));
  };

  const toggleVisibility = (e: React.MouseEvent) => {
    e.stopPropagation();
    setVisible((v) => !v);
  };

  return (
    <div className="relative w-full h-full select-none">
      <button
        type="button"
        onClick={toggleVisibility}
        className="absolute top-0 right-0 text-[8px] leading-none opacity-50 hover:opacity-100"
        aria-label={visible ? 'Hide pencil marks' : 'Show pencil marks'}
      >
        {visible ? '\u2715' : '\u2022'}
      </button>
      {visible && (
        <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 text-[8px] leading-3">
          {Array.from({ length: 9 }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleMark(n);
              }}
              className="flex items-center justify-center"
            >
              {marks.includes(n) ? n : ''}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default PencilMarks;
