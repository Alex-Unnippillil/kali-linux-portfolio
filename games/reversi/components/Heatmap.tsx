"use client";

import React, { useMemo } from "react";
import {
  SIZE,
  computeLegalMoves,
  applyMove,
} from "@/components/apps/reversiLogic";

// basic board type definition
export type Cell = "B" | "W" | null;
export type Board = Cell[][];

interface HeatmapProps {
  board: Board;
  player: "B" | "W";
}

const Heatmap: React.FC<HeatmapProps> = ({ board, player }) => {
  // compute mobility map for legal moves
  const map = useMemo(() => {
    const moves = computeLegalMoves(board as any, player);
    const opponent = player === "B" ? "W" : "B";
    const grid: number[][] = Array.from({ length: SIZE }, () =>
      Array(SIZE).fill(0)
    );
    Object.entries(moves).forEach(([key, flips]) => {
      const [r, c] = key.split("-").map(Number);
      const next = applyMove(board as any, r, c, player, flips as any);
      const playerMob = Object.keys(computeLegalMoves(next, player)).length;
      const oppMob = Object.keys(
        computeLegalMoves(next, opponent)
      ).length;
      grid[r][c] = playerMob - oppMob;
    });
    return grid;
  }, [board, player]);

  const max = Math.max(...map.flat().map((v) => Math.abs(v)), 1);

  return (
    <div className="absolute inset-0 grid grid-cols-8 grid-rows-8 pointer-events-none">
      {map.map((row, r) =>
        row.map((val, c) => {
          if (val === 0) {
            return <div key={`${r}-${c}`} />;
          }
          const intensity = Math.abs(val) / max;
          const color = val > 0 ? "0,255,0" : "255,0,0";
          return (
            <div
              key={`${r}-${c}`}
              className="flex items-center justify-center text-xs font-bold"
              style={{
                backgroundColor: `rgba(${color},${intensity * 0.4})`,
                color: "#000",
              }}
            >
              {val}
            </div>
          );
        })
      )}
    </div>
  );
};

export default Heatmap;
