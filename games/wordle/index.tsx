"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import GameShell from "../../components/games/GameShell";
import usePersistentState from "../../hooks/usePersistentState";
import {
  getWordOfTheDay,
  dictionaries,
  buildResultMosaic,
  type DictName,

} from "../../utils/wordle";
import type { GuessEntry, LetterResult } from "./logic";
import { evaluateGuess, hardModeViolation } from "./logic";
import Keyboard from "./components/Keyboard";
import share, { canShare } from "../../utils/share";
import {
  computeWordleShareScore,
  paintWordleShareCanvas,
  renderWordleShareCanvas,
} from "./shareImage";

const WordleGame = () => {
  const [hardMode, setHardMode] = usePersistentState<boolean>(
    "wordle:hard",
    false
  );
  const [dictName, setDictName] = usePersistentState<DictName>(
    "wordle:dict",
    "common"
  );
  const wordList = dictionaries[dictName];
  const solution = useMemo(() => getWordOfTheDay(dictName), [dictName]);

  type GuessWithReveal = GuessEntry & { revealed: number };
  const [guesses, setGuesses] = useState<GuessWithReveal[]>([]);
  const [guess, setGuess] = useState("");
  const [message, setMessage] = useState("");
  const [shareMessage, setShareMessage] = useState("");
  const shareCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    setGuesses([]);
    setGuess("");
    setMessage("");
    setShareMessage("");
  }, [dictName]);

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

  // Track the best known status for each letter to provide colored hints on the
  // virtual keyboard. Later guesses should not downgrade existing hints (e.g.
  // once a letter is marked correct it should stay green even if absent in a
  // subsequent guess).
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
    <div className="space-y-2">
      <label className="flex items-center space-x-2">
        <input
          type="checkbox"
          checked={hardMode}
          onChange={(e) => setHardMode(e.target.checked)}
        />
        <span>Hard Mode</span>
      </label>
      <label className="flex items-center space-x-2">
        <span>Word Pack</span>
        <select
          className="text-black"
          value={dictName}
          onChange={(e) => setDictName(e.target.value as DictName)}
        >
          {(Object.keys(dictionaries) as DictName[]).map((name) => (
            <option key={name} value={name}>
              {name.charAt(0).toUpperCase() + name.slice(1)}
            </option>
          ))}
        </select>
      </label>
    </div>
  );

  const isSolved = guesses.some((g) => g.guess === solution);
  const isGameOver = isSolved || guesses.length === 6;

  useEffect(() => {
    if (!isGameOver) {
      return;
    }

    const canvas = shareCanvasRef.current;
    if (!canvas) {
      return;
    }

    try {
      paintWordleShareCanvas(canvas, guesses, solution);
    } catch (error) {
      console.error("Failed to draw Wordle share preview", error);
    }
  }, [isGameOver, guesses, solution]);

  useEffect(() => {
    if (!isGameOver) {
      setShareMessage("");
    }
  }, [isGameOver]);

  const shareResult = async () => {
    const mosaic = buildResultMosaic(guesses.map((g) => g.result));
    const summary = computeWordleShareScore(guesses, solution);
    const text = `Wordle ${summary.scoreText}\n${mosaic}`;

    setShareMessage("");

    try {
      const { blob, score } = await renderWordleShareCanvas(guesses, solution);
      const fileName = `wordle-${score.scoreText.replace("/", "-")}.png`;
      const file = new File([blob], fileName, { type: "image/png" });
      const sharePayload = {
        files: [file],
        text,
        title: `Wordle ${score.scoreText}`,
      } as const;

      if (canShare(sharePayload) && (await share(sharePayload))) {
        setShareMessage("Share dialog opened.");
        return;
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setShareMessage("PNG downloaded for sharing.");
    } catch (error) {
      console.error("Wordle share export failed", error);
      if (await share(text)) {
        setShareMessage("Shared result text.");
        return;
      }
      try {
        await navigator.clipboard.writeText(text);
        setShareMessage("Result copied to clipboard.");
      } catch {
        setShareMessage("Unable to share result automatically.");
      }
    }
  };

  return (
    <GameShell game="wordle" settings={settings}>
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
          <div className="p-4 bg-gray-800 rounded text-center space-y-3 w-full max-w-md">
            <div className="font-semibold text-lg">Result</div>
            <div className="flex flex-col items-center space-y-3">
              <canvas
                ref={shareCanvasRef}
                className="w-full max-w-xs rounded border border-gray-700 bg-gray-900"
                role="img"
                aria-label="Wordle result share preview"
              />
              <pre className="text-sm leading-4 bg-gray-900 px-3 py-2 rounded border border-gray-700 text-left">
                {buildResultMosaic(guesses.map((g) => g.result))}
              </pre>
              <button
                type="button"
                onClick={shareResult}
                className="px-4 py-2 bg-ubt-blue text-black font-semibold rounded hover:bg-ubt-blue/80 focus:outline-none focus:ring-2 focus:ring-ubt-blue focus:ring-offset-2 focus:ring-offset-gray-800 transition"
              >
                Share PNG
              </button>
              {shareMessage && (
                <div className="text-xs text-gray-300">{shareMessage}</div>
              )}
              <div className="text-xs text-gray-400">
                {isSolved ? `Solution: ${solution}` : `Missed • ${solution}`}
              </div>
            </div>
          </div>
        )}
      </div>
    </GameShell>
  );
};

export default WordleGame;

