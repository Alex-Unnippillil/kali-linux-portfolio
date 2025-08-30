'use client';

import React, { useState } from 'react';
import type { Clue, Grid } from '../../../apps/games/nonogram/logic';
import { findForcedCellsInLine } from '../../../apps/games/nonogram/logic';
import { createHintSystem } from '../../../apps/games/nonogram/hints';

interface HintSystemProps {
  rows: Clue[];
  cols: Clue[];
  grid: Grid;
  solution: Grid;
  maxHints?: number;
  /**
   * Optional callback when a hint is produced. Can be used by the parent
   * component to apply the hinted value on the board or highlight the cell.
   */
  onHint?: (hint: { i: number; j: number; value: 1 }) => void;
}

interface DeductionStep {
  i: number;
  j: number;
  text: string;
}

/**
 * Determine a human readable explanation for a given hint by checking whether
 * it originates from the row or the column clues.
 */
const explainHint = (
  rows: Clue[],
  cols: Clue[],
  grid: Grid,
  i: number,
  j: number
): string => {
  const rowForced = findForcedCellsInLine(rows[i], grid[i]).some(
    (f) => f.index === j && f.value === 1
  );
  if (rowForced) {
    const clue = rows[i].length ? rows[i].join(' ') : '0';
    return `Row ${i + 1} (clue ${clue}) forces column ${j + 1} to be filled.`;
  }
  const col = grid.map((r) => r[j]);
  const colForced = findForcedCellsInLine(cols[j], col).some(
    (f) => f.index === i && f.value === 1
  );
  if (colForced) {
    const clue = cols[j].length ? cols[j].join(' ') : '0';
    return `Column ${j + 1} (clue ${clue}) forces row ${i + 1} to be filled.`;
  }
  return `Cell (${i + 1}, ${j + 1}) must be filled.`;
};

const HintSystem: React.FC<HintSystemProps> = ({
  rows,
  cols,
  grid,
  solution,
  maxHints = 3,
  onHint,
}) => {
  const [system] = useState(() => createHintSystem(maxHints));
  const [steps, setSteps] = useState<DeductionStep[]>([]);
  const [assist, setAssist] = useState(false);

  const handleHint = () => {
    const hint = system.useHint(grid, solution);
    if (!hint) return;
    onHint?.(hint);
    setSteps((prev) => [
      ...prev,
      { i: hint.i, j: hint.j, text: explainHint(rows, cols, grid, hint.i, hint.j) },
    ]);
  };

  return (
    <div className="space-y-2">
      <button
        className="px-2 py-1 border rounded"
        onClick={() => setAssist((s) => !s)}
      >
        {assist ? 'Hide Assistance' : 'Show Assistance'}
      </button>
      {assist && (
        <div className="space-y-2">
          <button
            className="px-2 py-1 border rounded"
            onClick={handleHint}
            disabled={system.remaining() <= 0}
          >
            Hint ({system.remaining()})
          </button>
          <ul className="list-disc list-inside text-sm">
            {steps.map((s, idx) => (
              <li key={`${s.i}-${s.j}-${idx}`}>{s.text}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default HintSystem;

