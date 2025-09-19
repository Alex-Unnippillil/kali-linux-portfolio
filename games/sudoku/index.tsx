"use client";

import React, { useEffect, useRef, useState } from "react";
import GameShell from "../../components/games/GameShell";
import {
  generateSudoku,
  SIZE,
  isValidPlacement,
} from "../../apps/games/sudoku";
import {
  type Cell,
  createCell,
  cloneCell,
  toggleCandidate,
  cellsToBoard,
} from "../../apps/games/sudoku/cell";
import PencilMarks from "./components/PencilMarks";

const formatTime = (s: number) =>
  `${Math.floor(s / 60)}:${("0" + (s % 60)).slice(-2)}`;

const hasConflict = (board: Cell[][], r: number, c: number, val: number) => {
  if (val === 0) return false;
  for (let i = 0; i < SIZE; i++) {
    if (i !== c && board[r][i].value === val) return true;
    if (i !== r && board[i][c].value === val) return true;
  }
  const br = Math.floor(r / 3) * 3;
  const bc = Math.floor(c / 3) * 3;
  for (let rr = 0; rr < 3; rr++) {
    for (let cc = 0; cc < 3; cc++) {
      const cell = board[br + rr][bc + cc];
      if ((br + rr !== r || bc + cc !== c) && cell.value === val) return true;
    }
  }
  return false;
};

const SudokuGame: React.FC = () => {
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">(
    "easy",
  );
  const [puzzle, setPuzzle] = useState<number[][]>([]);
  const [board, setBoard] = useState<Cell[][]>([]);
  const [solution, setSolution] = useState<number[][]>([]);
  const [pencilMode, setPencilMode] = useState(false);
  const [selected, setSelected] = useState<{ r: number; c: number } | null>(
    null,
  );
  const [time, setTime] = useState(0);
  const [ariaMessage, setAriaMessage] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[][]>([]);

  const startGame = () => {
    const { puzzle, solution } = generateSudoku(difficulty);
    setPuzzle(puzzle);
    setBoard(puzzle.map((row) => row.map((v) => createCell(v))));
    setSolution(solution);
    setTime(0);
  };

  useEffect(() => {
    startGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [difficulty]);

  useEffect(() => {
    const id = setInterval(() => setTime((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const handleValue = (
    r: number,
    c: number,
    value: string,
    forcePencil = false,
  ) => {
    if (puzzle[r][c] !== 0) return;
    const v = parseInt(value, 10);
    const newBoard = board.map((row) => row.map((cell) => cloneCell(cell)));
    const cell = newBoard[r][c];
    if ((pencilMode || forcePencil) && v >= 1 && v <= 9) {
      toggleCandidate(cell, v);
    } else {
      const val = isNaN(v) ? 0 : v;
      if (
        val !== 0 &&
        !isValidPlacement(cellsToBoard(newBoard), r, c, val)
      ) {
        setAriaMessage(`Move at row ${r + 1}, column ${c + 1} invalid`);
        return;
      }
      cell.value = val;
      cell.candidates = [];
      if (hasConflict(newBoard, r, c, cell.value)) {
        setAriaMessage(`Conflict at row ${r + 1}, column ${c + 1}`);
      } else if (
        cell.value !== 0 &&
        solution.length > 0 &&
        cell.value !== solution[r][c]
      ) {
        setAriaMessage(`Incorrect value at row ${r + 1}, column ${c + 1}`);
      } else {
        setAriaMessage("");
      }
    }
    setBoard(newBoard);
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    r: number,
    c: number,
  ) => {
    if (e.key >= "1" && e.key <= "9") {
      if (pencilMode || e.shiftKey) {
        e.preventDefault();
        handleValue(r, c, e.key, true);
      }
      return;
    }
    if (e.key === "Backspace" || e.key === "Delete") {
      handleValue(r, c, "0");
      return;
    }
    if (
      e.key === "ArrowUp" ||
      e.key === "ArrowDown" ||
      e.key === "ArrowLeft" ||
      e.key === "ArrowRight"
    ) {
      e.preventDefault();
      let nr = r;
      let nc = c;
      if (e.key === "ArrowUp") nr = Math.max(0, r - 1);
      if (e.key === "ArrowDown") nr = Math.min(SIZE - 1, r + 1);
      if (e.key === "ArrowLeft") nc = Math.max(0, c - 1);
      if (e.key === "ArrowRight") nc = Math.min(SIZE - 1, c + 1);
      inputRefs.current[nr][nc]?.focus();
    }
  };

  const completed = board.every((row, r) =>
    row.every((cell, c) => cell.value === solution[r][c]),
  );

  return (
    <GameShell game="sudoku">
      <div className="sr-only" aria-live="polite">
        {ariaMessage}
      </div>
      <div className="flex flex-col items-center space-y-2">
        <div className="flex w-full items-center justify-between">
          <div className="space-x-2">
            {(["easy", "medium", "hard"] as const).map((d) => (
              <button
                key={d}
                className={`px-2 py-1 rounded-full text-sm text-white ${
                  difficulty === d ? "bg-blue-600" : "bg-gray-700"
                }`}
                onClick={() => setDifficulty(d)}
              >
                {d}
              </button>
            ))}
          </div>
          <div className="font-mono">{formatTime(time)}</div>
          <button
            className={`ml-2 px-2 py-1 rounded text-white ${
              pencilMode ? "bg-gray-500" : "bg-gray-700"
            }`}
            onClick={() => setPencilMode((p) => !p)}
          >
            ✏️
          </button>
        </div>
        <div className="grid grid-cols-9 gap-[2px]" role="grid">
          {board.map((row, r) =>
            row.map((cell, c) => {
              const original = puzzle[r][c] !== 0;
              const val = cell.value;
              const conflict = hasConflict(board, r, c, val);
              const wrong =
                !original && val !== 0 && val !== solution[r][c];
              const correct =
                !original && val !== 0 && val === solution[r][c];
              const inHighlight =
                selected &&
                (selected.r === r ||
                  selected.c === c ||
                  (Math.floor(selected.r / 3) === Math.floor(r / 3) &&
                    Math.floor(selected.c / 3) === Math.floor(c / 3)));
              const isSelected =
                selected && selected.r === r && selected.c === c;
              return (
                <div
                  key={`${r}-${c}`}
                  className={`relative border w-8 h-8 sm:w-10 sm:h-10 ${
                    original ? "bg-gray-200" : "bg-white"
                  } ${inHighlight ? "bg-yellow-100" : ""} ${
                    isSelected ? "bg-yellow-200" : ""
                  } ${
                    conflict
                      ? "bg-red-200"
                      : correct
                      ? "bg-green-100"
                      : wrong
                      ? "bg-red-100"
                      : ""
                  }`}
                >
                  <input
                    ref={(el) => {
                      if (!inputRefs.current[r]) inputRefs.current[r] = [];
                      inputRefs.current[r][c] = el;
                    }}
                    className="w-full h-full text-center bg-transparent outline-none"
                    value={val === 0 ? "" : val}
                    onChange={(e) => handleValue(r, c, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, r, c)}
                    onFocus={() => setSelected({ r, c })}
                    onBlur={() => setSelected(null)}
                    maxLength={1}
                    disabled={original}
                    inputMode="numeric"
                  />
                  {val === 0 && (
                    <PencilMarks
                      marks={cell.candidates}
                      hidden={cell.candidates.length === 0}
                      onChange={(marks) => {
                        const nb = board.map((row) =>
                          row.map((cell) => cloneCell(cell))
                        );
                        nb[r][c].candidates = marks;
                        setBoard(nb);
                      }}
                    />
                  )}
                </div>
              );
            }),
          )}
        </div>
        {completed && <div className="mt-2">Completed!</div>}
      </div>
    </GameShell>
  );
};

export default SudokuGame;

