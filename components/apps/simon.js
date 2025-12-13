import React, {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { Howl } from "howler";
import seedrandom from "seedrandom";
import GameLayout from "./GameLayout";
import usePersistentState from "../../hooks/usePersistentState";
import { vibrate } from "./Games/common/haptics";
import {
  getAudioContext,
  playColorTone,
  createToneSchedule,
} from "../../utils/audio";
import TempoSelector, {
  isValidTempo,
} from "../../games/simon/components/TempoSelector";
import {
  handleInput,
  handleTimeout,
  initialSimonState,
  inputWindowMs,
  playbackComplete,
  replayAfterStrike,
  startGame,
  stepSeconds,
} from "../../games/simon/logic";

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

const reducer = (state, action) => {
  switch (action.type) {
    case "RESET":
      return initialSimonState;
    case "START":
      return startGame(state, action.options);
    case "PLAYBACK_DONE":
      return playbackComplete(state);
    case "INPUT":
      return handleInput(state, action.pad, action.options);
    case "TIMEOUT":
      return handleTimeout(state, action.options);
    case "REPLAY":
      return replayAfterStrike(state);
    default:
      return state;
  }
};

const shufflePads = (seed) => {
  const rng = seedrandom(seed || undefined);
  const shuffled = [...padStyles];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const Simon = () => {
  const [pads, setPads] = useState(padStyles);
  const [gameState, dispatch] = useReducer(reducer, initialSimonState);
  const [activePad, setActivePad] = useState(null);
  const [mode, setMode] = usePersistentState("simon_mode", "classic");
  const [tempo, setTempo] = usePersistentState("simon:tempo", 100, isValidTempo);
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
  const [errorFlash, setErrorFlash] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const errorSound = useRef(null);
  const timersRef = useRef([]);
  const inputTimerRef = useRef(null);
  const roundRef = useRef(gameState.roundId);

  useEffect(() => {
    roundRef.current = gameState.roundId;
  }, [gameState.roundId]);

  const options = useMemo(
    () => ({ mode, tempoBpm: tempo, playMode, timing, seed }),
    [mode, tempo, playMode, timing, seed],
  );

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((id) => clearTimeout(id));
    timersRef.current = [];
    if (inputTimerRef.current) {
      clearTimeout(inputTimerRef.current);
      inputTimerRef.current = null;
    }
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleChange = () => setPrefersReducedMotion(media.matches);
    handleChange();
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);

  const flashPad = useCallback(
    (idx, duration) => {
      setActivePad(idx);
      const handle = setTimeout(() => setActivePad(null), duration * 1000);
      timersRef.current.push(handle);
    },
    [],
  );

  const updateHighScores = useCallback(
    (score) => {
      const key = `${mode}-${timing}-${playMode}`;
      setLeaderboard((prev) => {
        const current = Array.isArray(prev[key]) ? [...prev[key]] : [];
        current.push(score);
        current.sort((a, b) => b - a);
        return { ...prev, [key]: current.slice(0, 5) };
      });
    },
    [mode, playMode, timing, setLeaderboard],
  );

  useEffect(() => {
    let timer;
    if (
      (gameState.phase === "strike" || gameState.phase === "gameover") &&
      gameState.lastError
    ) {
      if (!errorSound.current) {
        errorSound.current = new Howl({ src: [ERROR_SOUND_SRC] });
      }
      errorSound.current.play();
      if (!prefersReducedMotion) vibrate(100);
      setErrorFlash(true);
      timer = setTimeout(() => setErrorFlash(false), 600);
      timersRef.current.push(timer);
    }

    if (gameState.phase === "strike" && playMode === "normal") {
      const replayTimer = setTimeout(() => dispatch({ type: "REPLAY" }), 600);
      timersRef.current.push(replayTimer);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [gameState.phase, gameState.lastError, playMode, prefersReducedMotion]);

  useEffect(() => {
    if (gameState.phase !== "playback" || gameState.sequence.length === 0) {
      return;
    }
    clearTimers();
    const ctx = getAudioContext();
    const duration = stepSeconds(options, gameState.sequence.length);
    const ramp = 0.97;
    const start = ctx.currentTime + 0.1;
    const schedule = createToneSchedule(
      gameState.sequence.length,
      start,
      duration,
      ramp,
    );
    let currentDuration = duration;
    schedule.forEach((time, i) => {
      const idx = gameState.sequence[i];
      playColorTone(idx, time, currentDuration);
      const delay = Math.max((time - ctx.currentTime) * 1000, 0);
      const handle = setTimeout(() => {
        if (roundRef.current !== gameState.roundId) return;
        flashPad(idx, currentDuration);
      }, delay);
      timersRef.current.push(handle);
      currentDuration *= ramp;
    });
    const finalDelay =
      (schedule[schedule.length - 1] - ctx.currentTime + currentDuration) * 1000 +
      50;
    const completion = setTimeout(() => {
      if (roundRef.current !== gameState.roundId) return;
      dispatch({ type: "PLAYBACK_DONE" });
    }, finalDelay);
    timersRef.current.push(completion);
  }, [
    clearTimers,
    flashPad,
    gameState.phase,
    gameState.sequence,
    gameState.roundId,
    options,
  ]);

  useEffect(() => {
    if (gameState.phase !== "input") {
      if (inputTimerRef.current) {
        clearTimeout(inputTimerRef.current);
        inputTimerRef.current = null;
      }
      return;
    }
    const windowMs = inputWindowMs(options, gameState.sequence.length);
    if (!windowMs) return;
    if (inputTimerRef.current) clearTimeout(inputTimerRef.current);
    const roundId = gameState.roundId;
    const timer = setTimeout(() => {
      if (roundRef.current !== roundId) return;
      dispatch({ type: "TIMEOUT", options });
    }, windowMs);
    inputTimerRef.current = timer;
    timersRef.current.push(timer);
  }, [gameState.phase, gameState.inputIndex, gameState.sequence.length, options]);

  const handlePadClick = useCallback(
    (idx) => () => {
      if (gameState.phase !== "input") return;
      const duration = stepSeconds(options, gameState.sequence.length);
      flashPad(idx, duration);
      const start = getAudioContext().currentTime + 0.001;
      playColorTone(idx, start, duration);
      dispatch({ type: "INPUT", pad: idx, options });
    },
    [
      dispatch,
      flashPad,
      gameState.phase,
      gameState.sequence.length,
      options,
    ],
  );

  const handleStart = useCallback(() => {
    clearTimers();
    setActivePad(null);
    setPads(randomPalette ? shufflePads(seed) : padStyles);
    dispatch({ type: "START", options });
  }, [clearTimers, options, randomPalette, seed]);

  const handleRestart = useCallback(() => {
    clearTimers();
    if (gameState.score > 0 && gameState.phase !== "gameover") {
      updateHighScores(gameState.score);
    }
    setActivePad(null);
    dispatch({ type: "RESET" });
  }, [clearTimers, gameState.phase, gameState.score, updateHighScores]);

  const prevPhaseRef = useRef(gameState.phase);
  useEffect(() => {
    if (
      prevPhaseRef.current !== "gameover" &&
      gameState.phase === "gameover"
    ) {
      updateHighScores(gameState.score);
    }
    prevPhaseRef.current = gameState.phase;
  }, [gameState.phase, gameState.score, updateHighScores]);

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

  const scores = leaderboard[`${mode}-${timing}-${playMode}`] || [];
  const canPress = gameState.phase === "input";
  const status = (() => {
    if (gameState.phase === "idle") return "Press Start";
    if (gameState.phase === "playback") return "Listen...";
    if (gameState.phase === "input") return "Your turn";
    if (gameState.phase === "strike") {
      return gameState.lastError === "timeout"
        ? "Time up! Try again."
        : "Wrong pad! Try again.";
    }
    if (gameState.phase === "gameover") {
      return gameState.lastError === "timeout"
        ? "Time up! Game over."
        : "Wrong pad! Game over.";
    }
    return "";
  })();

  return (
    <GameLayout onRestart={handleRestart}>
      <div className={errorFlash ? "buzz" : ""}>
        <div className="grid grid-cols-2 gap-[6px] mb-4">
          {pads.map((pad, idx) => (
            <button
              key={pad.id}
              className={padClass(pad, idx)}
              style={striped ? { backgroundImage: pad.pattern } : undefined}
              onPointerDown={handlePadClick(idx)}
              aria-label={`${pad.label} pad`}
              disabled={!canPress}
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
          <TempoSelector tempo={tempo} onTempoChange={setTempo} />
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
            onClick={handleStart}
          >
            Start
          </button>
        </div>
        <div className="mt-4 text-center">
          <div className="mb-1">Leaderboard</div>
          <ol className="list-decimal list-inside">
            {scores.map((score, i) => (
              <li key={`${score}-${i}`}>{score}</li>
            ))}
          </ol>
        </div>
      </div>
    </GameLayout>
  );
};

export default Simon;
