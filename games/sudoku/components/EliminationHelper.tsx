"use client";

import React from "react";
import { SIZE, getCandidates } from "../../../apps/games/sudoku";

export interface Elimination {
  r: number;
  c: number;
  value: number;
  reason: string;
}

export const analyzeEliminations = (board: number[][]): Elimination[] => {
  const eliminations: Elimination[] = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board[r][c] !== 0) continue;
      const candidates = getCandidates(board, r, c);
      for (let v = 1; v <= SIZE; v++) {
        if (candidates.includes(v)) continue;
        let reason = "";
        if (board[r].includes(v)) {
          reason = `Row ${r + 1} already has ${v}`;
        } else {
          let colHas = false;
          for (let rr = 0; rr < SIZE; rr++) {
            if (board[rr][c] === v) {
              colHas = true;
              break;
            }
          }
          if (colHas) {
            reason = `Column ${c + 1} already has ${v}`;
          } else {
            const br = Math.floor(r / 3) * 3;
            const bc = Math.floor(c / 3) * 3;
            for (let rr = 0; rr < 3; rr++) {
              for (let cc = 0; cc < 3; cc++) {
                if (board[br + rr][bc + cc] === v) {
                  colHas = true;
                }
              }
            }
            if (colHas) {
              reason = `Box ${Math.floor(r / 3) + 1}-${Math.floor(c / 3) + 1} already has ${v}`;
            }
          }
        }
        eliminations.push({ r, c, value: v, reason });
      }
    }
  }
  return eliminations;
};

interface Props {
  board: number[][];
}

const EliminationHelper: React.FC<Props> = ({ board }) => {
  const eliminations = analyzeEliminations(board);
  if (eliminations.length === 0) return <div>No eliminations available</div>;
  return (
    <div>
      <h3 className="font-bold mb-2">Eliminations</h3>
      <ul className="list-disc pl-5">
        {eliminations.map((e, i) => (
          <li key={i}>
            Cell ({e.r + 1},{e.c + 1}) cannot be {e.value}
            {e.reason ? ` – ${e.reason}` : ""}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default EliminationHelper;

