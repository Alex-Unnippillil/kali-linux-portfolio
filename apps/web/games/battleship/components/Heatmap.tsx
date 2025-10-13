"use client";

import React, { useEffect, useState } from 'react';
import { BOARD_SIZE, MonteCarloAI } from '../../../apps/games/battleship/ai';

type CellState = 'hit' | 'miss' | null | undefined;

type HeatmapProps = {
  /** Board showing known hits and misses. */
  board: CellState[];
  /** Additional classes for container. */
  className?: string;
};

/**
 * Calculates ship placement probabilities using MonteCarlo simulations
 * and renders a translucent heat map overlay. The probabilities are
 * recomputed whenever the board changes, i.e. after each move.
 */
const Heatmap: React.FC<HeatmapProps> = ({ board, className }) => {
  const [heat, setHeat] = useState<number[]>(
    () => Array(BOARD_SIZE * BOARD_SIZE).fill(0),
  );

  useEffect(() => {
    const ai = new MonteCarloAI();
    board.forEach((cell, idx) => {
      if (cell === 'hit') ai.record(idx, true);
      else if (cell === 'miss') ai.record(idx, false);
    });
    // nextMove populates the AI's internal heat map.
    ai.nextMove();
    setHeat(ai.getHeatmap().slice());
  }, [board]);

  const max = Math.max(...heat);

  return (
    <div
      className={`absolute inset-0 grid pointer-events-none ${
        className || ''
      }`}
      style={{ gridTemplateColumns: `repeat(${BOARD_SIZE}, 1fr)` }}
      aria-hidden="true"
    >
      {heat.map((value, i) => {
        const intensity = max ? value / max : 0;
        const color = intensity
          ? `rgba(255,0,0,${intensity * 0.6})`
          : 'transparent';
        return <div key={i} style={{ backgroundColor: color }} />;
      })}
    </div>
  );
};

export default Heatmap;

