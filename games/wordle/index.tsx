"use client";

import React, { useEffect, useMemo, useState } from "react";
import GameShell from "../../components/games/GameShell";
import usePersistentState from "../../hooks/usePersistentState";
import {
  getWordOfTheDay,
  dictionaries,
  buildResultMosaic,
} from "../../utils/wordle";
import type { GuessEntry, LetterResult } from "./logic";
import { evaluateGuess, hardModeViolation } from "./logic";
import Keyboard from "./components/Keyboard";
import share from "../../utils/share";

const WordleGame = () => {
  const [hardMode, setHardMode] = usePersistentState<boolean>("wordle:hard", false);
  const wordList = dictionaries.common; // single dictionary for now
  const solution = useMemo(() => getWordOfTheDay("common"), []);

  type GuessWithReveal = GuessEntry & { revealed: number };
  const [guesses, setGuesses] = useState<GuessWithReveal[]>([]);
  const [guess, setGuess] = useState("");
  const [message, setMessage] = useState("");

  const revealRow = (row: number) => {
    for (let i = 0; i < 5; i += 1) {
      setTimeout(() => {
        setGuesses((g) => {
          const copy = [...g];
          const entry = copy[row];
          if (entry) entry.revealed = i + 1;
          return copy;
        });
      }, i * 300);
    }
  };

  const handleSubmit = () => {
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
    setGuesses([...guesses, { guess: upper, result, revealed: 0 }]);
    revealRow(guesses.length);
    setGuess("");
    setMessage("");
  };

  const renderCell = (row: number, col: number) => {
    const entry = guesses[row];
    const letter = entry ? entry.guess[col] : "";
    const revealed = entry ? entry.revealed > col : false;
    const res: LetterResult | undefined = revealed ? entry?.result[col] : undefined;
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
        className={`w-10 h-10 border border-gray-700 flex items-center justify-center text-xl font-bold transition-transform transition-colors duration-300 ${color}`}
        style={{
          transform: revealed ? "rotateX(0deg)" : "rotateX(90deg)",
          transitionDelay: `${col * 300}ms`,
        }}
      >
        {letter}
      </div>
    );
  };

  const letterHints = useMemo(() => {
    const map: Record<string, LetterResult> = {};
    const priority: Record<LetterResult, number> = {
      absent: 0,
      present: 1,
      correct: 2,
    };
    guesses.forEach(({ guess: g, result }) => {
      for (let i = 0; i < g.length; i += 1) {
        const ch = g[i];
        const res = result[i];
        if (!map[ch] || priority[res] > priority[map[ch]]) {
          map[ch] = res;
        }
      }
    });
    return map;
  }, [guesses]);

  const handleKey = (key: string) => {
    if (key === "ENTER") {
      handleSubmit();
    } else if (key === "BACK") {
      setGuess((g) => g.slice(0, -1));
    } else if (/^[A-Z]$/.test(key) && guess.length < 5) {
      setGuess((g) => (g + key).toUpperCase());
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const key = e.key.toUpperCase();
      if (key === "ENTER" || key === "BACKSPACE") {
        e.preventDefault();
      }
      handleKey(key === "BACKSPACE" ? "BACK" : key);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

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

  const isSolved = guesses.some((g) => g.guess === solution);
  const isGameOver = isSolved || guesses.length === 6;

  const shareResult = async () => {
    const mosaic = buildResultMosaic(guesses.map((g) => g.result));
    const text = `Wordle ${guesses.length}/6\n${mosaic}`;
    if (!(await share(text))) {
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        /* ignore */
      }
    }
  };

  return (
    <GameShell settings={settings}>
      <div className="h-full w-full flex flex-col items-center justify-start bg-ub-cool-grey text-white p-4 space-y-4 overflow-y-auto">
        <div className="w-full bg-gray-800 text-center py-1 text-sm">
          Daily Mode
        </div>
        <h1 className="text-xl font-bold">Wordle</h1>

        <div className="grid grid-rows-6 gap-1" role="grid" aria-label="Wordle board">
          {Array.from({ length: 6 }).map((_, row) => (
            <div key={row} className="grid grid-cols-5 gap-1" role="row">
              {Array.from({ length: 5 }).map((_, col) => renderCell(row, col))}
            </div>
          ))}
        </div>

        <Keyboard onKey={handleKey} letterHints={letterHints} />

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
        >
          <input
            type="text"
            maxLength={5}
            value={guess}
            onChange={(e) => setGuess(e.target.value.toUpperCase())}
            className="sr-only"
            placeholder="Guess"
          />
        </form>

        {message && <div className="text-sm text-red-400">{message}</div>}

        {isGameOver && (
          <div className="p-4 bg-gray-800 rounded text-center space-y-2">
            <div className="font-semibold">Result</div>
            <pre className="text-sm leading-4">
              {buildResultMosaic(guesses.map((g) => g.result))}
            </pre>
            <button
              type="button"
              onClick={shareResult}
              className="px-4 py-2 bg-gray-700 rounded"
            >
              Share
            </button>
          </div>
        )}
      </div>
    </GameShell>
  );
};

export default WordleGame;

