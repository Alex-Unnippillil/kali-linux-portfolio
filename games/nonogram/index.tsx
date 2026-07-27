"use client";

import React, { useEffect, useState } from "react";
import GameShell from "../../components/games/GameShell";
import Board from "./components/Board";
import HintSystem from "./components/HintSystem";
import { loadPackFromJSON } from "../../apps/games/nonogram/packs";
import samplePack from "../../apps/games/nonogram/sample-pack.json";
import { loadProgress, saveProgress } from "../../apps/games/nonogram/progress";
import type { Grid } from "../../apps/games/nonogram/logic";

const pack = loadPackFromJSON(JSON.stringify(samplePack));

const NonogramGame: React.FC = () => {
  const [index, setIndex] = useState(0);
  const puzzle = pack.puzzles[index];
  const [grid, setGrid] = useState<Grid>(() =>
    Array.from({ length: puzzle.rows.length }, () =>
      Array(puzzle.cols.length).fill(0)
    ) as Grid
  );
  const [hintsUsed, setHintsUsed] = useState(0);

  useEffect(() => {
    const progress = loadProgress(puzzle.name);
    if (progress) {
      setGrid(progress.grid);
      setHintsUsed(progress.hintsUsed);
    } else {
      setGrid(
        Array.from({ length: puzzle.rows.length }, () =>
          Array(puzzle.cols.length).fill(0)
        ) as Grid
      );
      setHintsUsed(0);
    }
  }, [index, puzzle]);

  const handleGridChange = (g: Grid) => {
    setGrid(g);
    saveProgress(puzzle.name, { grid: g, hintsUsed });
  };

  const handleHint = (hint: { i: number; j: number; value: 1 }) => {
    const ng = grid.map((row) => row.slice()) as Grid;
    ng[hint.i][hint.j] = hint.value;
    const newHints = hintsUsed + 1;
    setHintsUsed(newHints);
    saveProgress(puzzle.name, { grid: ng, hintsUsed: newHints });
    setGrid(ng);
  };

  const settings = (
    <div className="space-y-2">
      <label className="flex items-center gap-2">
        <span>Puzzle</span>
        <select
          value={index}
          onChange={(e) => setIndex(parseInt(e.target.value, 10))}
        >
          {pack.puzzles.map((p, i) => (
            <option key={p.name} value={i}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );

  return (
    <GameShell game="nonogram" settings={settings}>
      <div className="space-y-4">
        <Board
          rows={puzzle.rows}
          cols={puzzle.cols}
          solution={puzzle.grid}
          grid={grid}
          onChange={handleGridChange}
        />
        <HintSystem
          rows={puzzle.rows}
          cols={puzzle.cols}
          grid={grid}
          solution={puzzle.grid}
          maxHints={3}
          onHint={handleHint}
        />
      </div>
    </GameShell>
  );
};

export default NonogramGame;

