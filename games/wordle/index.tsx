"use client";

import React, { useMemo, useState } from "react";
import GameShell from "../../components/games/GameShell";
import usePersistentState from "../../hooks/usePersistentState";
import { getWordOfTheDay, dictionaries } from "../../utils/wordle";
import type { GuessEntry, LetterResult } from "./logic";
import { evaluateGuess, hardModeViolation } from "./logic";

const WordleGame = () => {
  const [hardMode, setHardMode] = usePersistentState<boolean>("wordle:hard", false);
  const wordList = dictionaries.common; // single dictionary for now
  const solution = useMemo(() => getWordOfTheDay("common"), []);

  const [guesses, setGuesses] = useState<GuessEntry[]>([]);
  const [guess, setGuess] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const upper = guess.toUpperCase();
    if (upper.length !== 5) return;

    if (!wordList.includes(upper)) {
      setMessage("Word not in dictionary.");
      return;
    }

    if (hardMode) {
      const violation = hardModeViolation(upper, guesses);
      if (violation) {
        setMessage(violation);
        return;
      }
    }

    const result = evaluateGuess(upper, solution);
    setGuesses([...guesses, { guess: upper, result }]);
    setGuess("");
    setMessage("");
  };

  const renderCell = (row: number, col: number) => {
    const entry = guesses[row];
    const letter = entry ? entry.guess[col] : "";
    const res: LetterResult | undefined = entry?.result[col];
    const color =
      res === "correct"
        ? "bg-green-600"
        : res === "present"
        ? "bg-yellow-500"
        : res === "absent"
        ? "bg-gray-700"
        : "bg-gray-900";
    return (
      <div
        key={col}
        className={`w-10 h-10 border border-gray-700 flex items-center justify-center text-xl font-bold ${color}`}
      >
        {letter}
      </div>
    );
  };

  const settings = (
    <label className="flex items-center space-x-2">
      <input
        type="checkbox"
        checked={hardMode}
        onChange={(e) => setHardMode(e.target.checked)}
      />
      <span>Hard Mode</span>
    </label>
  );

  return (
    <GameShell settings={settings}>
      <div className="h-full w-full flex flex-col items-center justify-start bg-ub-cool-grey text-white p-4 space-y-4 overflow-y-auto">
        <h1 className="text-xl font-bold">Wordle</h1>

        <div className="grid grid-rows-6 gap-1" role="grid" aria-label="Wordle board">
          {Array.from({ length: 6 }).map((_, row) => (
            <div key={row} className="grid grid-cols-5 gap-1" role="row">
              {Array.from({ length: 5 }).map((_, col) => renderCell(row, col))}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex space-x-2">
          <input
            type="text"
            maxLength={5}
            value={guess}
            onChange={(e) => setGuess(e.target.value.toUpperCase())}
            className="w-32 p-2 text-black text-center uppercase"
            placeholder="Guess"
          />
          <button type="submit" className="px-4 py-2 bg-gray-700 rounded">
            Enter
          </button>
        </form>

        {message && <div className="text-sm text-red-400">{message}</div>}
      </div>
    </GameShell>
  );
};

export default WordleGame;

