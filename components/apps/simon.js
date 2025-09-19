import React, { useState, useRef, useEffect, useCallback } from "react";
import { Howl } from "howler";
import seedrandom from "seedrandom";
import GameLayout from "./GameLayout";
import usePersistentState from "../../hooks/usePersistentState";
import { vibrate } from "./Games/common/haptics";
import {
  getAudioContext,
  playColorTone,
  createToneSchedule,
} from "@/utils";

const padStyles = [
  {
    id: "green",
    color: { base: "bg-green-700", active: "bg-green-500" },
    colorblind: { base: "bg-emerald-700", active: "bg-emerald-500" },
    symbol: "▲",
    label: "green",
    pattern:
      "repeating-linear-gradient(45deg, rgba(255,255,255,0.2) 0, rgba(255,255,255,0.2) 10px, transparent 10px, transparent 20px)",
  },
  {
    id: "red",
    color: { base: "bg-red-700", active: "bg-red-500" },
    colorblind: { base: "bg-orange-700", active: "bg-orange-500" },
    symbol: "■",
    label: "red",
    pattern:
      "repeating-linear-gradient(-45deg, rgba(255,255,255,0.2) 0, rgba(255,255,255,0.2) 10px, transparent 10px, transparent 20px)",
  },
  {
    id: "yellow",
    color: { base: "bg-yellow-500", active: "bg-yellow-300" },
    colorblind: { base: "bg-purple-700", active: "bg-purple-500" },
    symbol: "●",
    label: "yellow",
    pattern:
      "repeating-linear-gradient(0deg, rgba(255,255,255,0.2) 0, rgba(255,255,255,0.2) 10px, transparent 10px, transparent 20px)",
  },
  {
    id: "blue",
    color: { base: "bg-blue-700", active: "bg-blue-500" },
    colorblind: { base: "bg-teal-700", active: "bg-teal-500" },
    symbol: "◆",
    label: "blue",
    pattern:
      "repeating-linear-gradient(90deg, rgba(255,255,255,0.2) 0, rgba(255,255,255,0.2) 10px, transparent 10px, transparent 20px)",
  },
];

const ERROR_SOUND_SRC =
  "data:audio/wav;base64,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";

/**
 * Generate a sequence of pad indexes.
 *
 * @param {number} length length of the sequence
 * @param {string|number} seed optional seed for deterministic results
 * @returns {number[]} sequence of numbers between 0 and 3
 */
export const generateSequence = (length, seed) => {
  if (seed) {
    const rng = seedrandom(seed);
    const seq = new Array(length);
    for (let i = 0; i < length; i += 1) {
      seq[i] = Math.floor(rng() * 4);
    }
    return seq;
  }

  const values = new Uint8Array(length);
  if (typeof globalThis.crypto?.getRandomValues === "function") {
    globalThis.crypto.getRandomValues(values);
  } else {
    for (let i = 0; i < length; i += 1) {
      values[i] = Math.floor(Math.random() * 256);
    }
  }

  for (let i = 0; i < length; i += 1) {
    values[i] &= 3;
  }

  return Array.from(values);
};

const Simon = () => {
  const [pads, setPads] = useState(padStyles);
  const [sequence, setSequence] = useState([]);
  const [step, setStep] = useState(0);
  const [isPlayerTurn, setIsPlayerTurn] = useState(false);
  const [activePad, setActivePad] = useState(null);
  const [status, setStatus] = useState("Press Start");
  const [mode, setMode] = usePersistentState("simon_mode", "classic");
  const [tempo, setTempo] = usePersistentState("simon_tempo", 100);
  const [striped, setStriped] = usePersistentState("simon_striped", false);
  const [thickOutline, setThickOutline] = usePersistentState(
    "simon_thick_outline",
    false,
  );
  const [audioOnly, setAudioOnly] = usePersistentState(
    "simon_audio_only",
    false,
  );
  const [colorblindPalette, setColorblindPalette] = usePersistentState(
    "simon_colorblind_palette",
    false,
  );
  const [seed, setSeed] = usePersistentState("simon_seed", "");
  const [playMode, setPlayMode] = usePersistentState(
    "simon_play_mode",
    "normal",
  );
  const [timing, setTiming] = usePersistentState("simon_timing", "relaxed");
  const [randomPalette, setRandomPalette] = usePersistentState(
    "simon_random_palette",
    false,
  );
  const [leaderboard, setLeaderboard] = usePersistentState(
    "simon_leaderboard",
    {},
  );
  const errorSound = useRef(null);
  const rngRef = useRef(Math.random);
  const timeoutRef = useRef(null);
  const [errorFlash, setErrorFlash] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleChange = () => setPrefersReducedMotion(media.matches);
    handleChange();
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);

  const updateHighScores = useCallback(
    (score) => {
      const key = `${mode}-${timing}`;
      setLeaderboard((prev) => {
        const current = Array.isArray(prev[key]) ? [...prev[key]] : [];
        current.push(score);
        current.sort((a, b) => b - a);
        return { ...prev, [key]: current.slice(0, 5) };
      });
    },
    [mode, timing, setLeaderboard],
  );

  const flashPad = useCallback(
    (idx, duration) => {
      if (!prefersReducedMotion) vibrate(50);
      if (audioOnly) return;
      window.requestAnimationFrame(() => setActivePad(idx));
      setTimeout(
        () => window.requestAnimationFrame(() => setActivePad(null)),
        duration * 1000,
      );
    },
    [audioOnly, prefersReducedMotion],
  );

  const stepDuration = useCallback(() => {
    const base = 60 / tempo;
    if (mode === "endless") return base;
    const reduction = mode === "speed" ? 0.03 : 0.015;
    const level = sequence.length;
    const speedFactor = Math.pow(0.9, Math.floor(level / 5));
    return Math.max((base - level * reduction) * speedFactor, 0.2);
  }, [tempo, mode, sequence.length]);

  const playSequence = useCallback(() => {
    const ctx = getAudioContext();
    setIsPlayerTurn(false);
    setStatus("Listen...");
    const start = ctx.currentTime + 0.1;
    const baseDelta = stepDuration();
    const ramp = 0.97;
    const schedule = createToneSchedule(
      sequence.length,
      start,
      baseDelta,
      ramp,
    );
    let currentDelta = baseDelta;
    let finalDelta = baseDelta;
    schedule.forEach((time, i) => {
      const idx = sequence[i];
      playColorTone(idx, time, currentDelta);
      const delay = (time - ctx.currentTime) * 1000;
      setTimeout(() => flashPad(idx, currentDelta), delay);
      finalDelta = currentDelta;
      currentDelta *= ramp;
    });
    const totalDelay =
      (schedule[schedule.length - 1] - ctx.currentTime + finalDelta) * 1000;
    setTimeout(() => {
      setStatus("Your turn");
      setIsPlayerTurn(true);
      setStep(0);
    }, totalDelay);
  }, [flashPad, sequence, stepDuration]);

  useEffect(() => {
    if (sequence.length && !isPlayerTurn) {
      playSequence();
    }
  }, [sequence, isPlayerTurn, playSequence]);

  useEffect(() => {
    if (timing !== "strict" || !isPlayerTurn) {
      clearTimeout(timeoutRef.current);
      return;
    }
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      if (!errorSound.current) {
        errorSound.current = new Howl({ src: [ERROR_SOUND_SRC] });
      }
      errorSound.current.play();
      if (!prefersReducedMotion) vibrate(100);
      setErrorFlash(true);
      if (playMode === "strict") {
        const streak = Math.max(sequence.length - 1, 0);
        updateHighScores(streak);
      }
      setIsPlayerTurn(false);
      setStatus(
        playMode === "strict" ? "Time up! Game over." : "Time up! Try again.",
      );
      setTimeout(() => {
        setErrorFlash(false);
        if (playMode === "strict") {
          restartGame();
        } else {
          setStep(0);
          setStatus("Listen...");
          playSequence();
        }
      }, 600);
    }, 5000);
    return () => clearTimeout(timeoutRef.current);
  }, [
    timing,
    isPlayerTurn,
    step,
    playMode,
    sequence.length,
    updateHighScores,
    restartGame,
    playSequence,
    prefersReducedMotion,
  ]);

  const startGame = useCallback(() => {
    rngRef.current = seed ? seedrandom(seed) : Math.random;
    if (randomPalette) {
      const shuffled = [...padStyles];
      for (let i = shuffled.length - 1; i > 0; i -= 1) {
        const j = Math.floor(rngRef.current() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      setPads(shuffled);
    } else {
      setPads(padStyles);
    }
    setSequence([Math.floor(rngRef.current() * 4)]);
    setStatus("Listen...");
  }, [seed, randomPalette]);

  const restartGame = useCallback(() => {
    clearTimeout(timeoutRef.current);
    setSequence([]);
    setStep(0);
    setIsPlayerTurn(false);
    setStatus("Press Start");
  }, []);

  const handlePadClick = useCallback(
    (idx) => () => {
      if (!isPlayerTurn) return;
      const duration = stepDuration();
      flashPad(idx, duration);
      const start = getAudioContext().currentTime + 0.001;
      playColorTone(idx, start, duration);

      if (sequence[step] !== idx) {
        if (!errorSound.current) {
          errorSound.current = new Howl({ src: [ERROR_SOUND_SRC] });
        }
        errorSound.current.play();
        if (!prefersReducedMotion) vibrate(100);
        setErrorFlash(true);
        if (playMode === "strict") {
          const streak = Math.max(sequence.length - 1, 0);
          updateHighScores(streak);
        }
        setIsPlayerTurn(false);
        setStatus(
          playMode === "strict"
            ? "Wrong pad! Game over."
            : "Wrong pad! Try again.",
        );
        setTimeout(() => {
          setErrorFlash(false);
          if (playMode === "strict") {
            restartGame();
          } else {
            setStep(0);
            setStatus("Listen...");
            playSequence();
          }
        }, 600);
        return;
      }

      if (step + 1 === sequence.length) {
        setIsPlayerTurn(false);
        setTimeout(() => {
          setSequence((seq) => [...seq, Math.floor(rngRef.current() * 4)]);
        }, 1000);
      } else {
        setStep(step + 1);
      }
    },
    [
      flashPad,
      isPlayerTurn,
      restartGame,
      sequence,
      step,
      stepDuration,
      updateHighScores,
      playMode,
      playSequence,
      prefersReducedMotion,
    ],
  );

  const padClass = useCallback(
    (pad, idx) => {
      const colors =
        mode === "colorblind" || audioOnly
          ? { base: "bg-gray-700", active: "bg-gray-500" }
          : colorblindPalette
            ? pad.colorblind
            : pad.color;
      const isActive = activePad === idx || errorFlash;
      const ring = thickOutline ? "ring-8" : "ring-4";
      const corner =
        idx === 0
          ? "rounded-tl-full"
          : idx === 1
            ? "rounded-tr-full"
            : idx === 2
              ? "rounded-bl-full"
              : "rounded-br-full";
      return `relative h-32 w-32 ${corner} flex items-center justify-center text-3xl transition-shadow ${ring} ring-offset-2 ring-offset-gray-900 ${
        isActive
          ? `${colors.active} ring-white`
          : `${colors.base} ring-transparent`
      } before:content-[''] before:absolute before:inset-0 before:rounded-inherit before:scale-110 before:opacity-0 before:transition before:duration-200 before:blur-lg before:bg-white ${
        isActive ? "before:opacity-50" : ""
      } ${errorFlash ? "animate-pulse" : ""}`;
    },
    [activePad, audioOnly, colorblindPalette, mode, thickOutline, errorFlash],
  );

  const scoreKey = `${mode}-${timing}`;
  const scores = leaderboard[scoreKey] || [];

  return (
    <GameLayout onRestart={restartGame}>
      <div className={errorFlash ? "buzz" : ""}>
        <div className="grid grid-cols-2 gap-[6px] mb-4">
          {pads.map((pad, idx) => (
            <button
              key={pad.id}
              className={padClass(pad, idx)}
              style={striped ? { backgroundImage: pad.pattern } : undefined}
              onPointerDown={handlePadClick(idx)}
              aria-label={`${pad.label} pad`}
            >
              {mode === "colorblind" ? pad.label.toUpperCase() : ""}
            </button>
          ))}
        </div>
        <div className="mb-4" aria-live="polite" role="status">
          {status}
        </div>
        <div className="flex flex-wrap gap-4 items-center">
          <select
            className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
            value={mode}
            onChange={(e) => setMode(e.target.value)}
          >
            <option value="classic">Classic</option>
            <option value="speed">Speed Up</option>
            <option value="colorblind">Colorblind</option>
            <option value="endless">Endless</option>
          </select>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="60"
              max="140"
              value={tempo}
              onChange={(e) => setTempo(Number(e.target.value))}
            />
            <span>{tempo} BPM</span>
          </div>
          <input
            className="px-2 py-1 w-24 bg-gray-700 hover:bg-gray-600 rounded"
            placeholder="Seed"
            value={seed}
            onChange={(e) => setSeed(e.target.value)}
          />
          <div className="flex gap-2">
            {["normal", "strict"].map((m) => (
              <button
                key={m}
                onClick={() => setPlayMode(m)}
                className={`px-2 py-1 rounded-full border ${
                  playMode === m
                    ? "bg-gray-600 border-white"
                    : "bg-gray-700 border-gray-500 hover:bg-gray-600"
                }`}
              >
                {m === "strict" ? "Strict" : "Normal"}
              </button>
            ))}
          </div>
          <select
            className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
            value={timing}
            onChange={(e) => setTiming(e.target.value)}
          >
            <option value="relaxed">Relaxed timing</option>
            <option value="strict">Strict timing</option>
          </select>
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={striped}
              onChange={(e) => setStriped(e.target.checked)}
            />
            Stripes
          </label>
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={thickOutline}
              onChange={(e) => setThickOutline(e.target.checked)}
            />
            Thick outline
          </label>
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={colorblindPalette}
              onChange={(e) => setColorblindPalette(e.target.checked)}
            />
            Colorblind palette
          </label>
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={randomPalette}
              onChange={(e) => setRandomPalette(e.target.checked)}
            />
            Random palette
          </label>
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={audioOnly}
              onChange={(e) => setAudioOnly(e.target.checked)}
            />
            Audio only
          </label>
          <button
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
            onClick={startGame}
          >
            Start
          </button>
        </div>
        <div className="mt-4 text-center">
          <div className="mb-1">Leaderboard</div>
          <ol className="list-decimal list-inside">
            {scores.map((score, i) => (
              <li key={i}>{score}</li>
            ))}
          </ol>
        </div>
      </div>
    </GameLayout>
  );
};

export default Simon;
