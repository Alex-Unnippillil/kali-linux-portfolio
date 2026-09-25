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
import usePrefersReducedMotion from "../../hooks/usePrefersReducedMotion";
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
  currentDateString,
  getDailySeed,
} from "../../utils/dailySeed";
import {
  handleInput,
  handleTimeout,
  initialSimonState,
  inputWindowMs,
  playbackComplete,
  replayAfterStrike,
  replaySequence,
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

const SIMON_MODES = ["classic", "speed", "colorblind", "endless"];
const PLAY_MODES = ["normal", "strict"];
const TIMING_MODES = ["relaxed", "strict"];

const isOneOf = (values) => (value) =>
  typeof value === "string" && values.includes(value);
const isSimonMode = isOneOf(SIMON_MODES);
const isPlayMode = isOneOf(PLAY_MODES);
const isTiming = isOneOf(TIMING_MODES);

const getLeaderboardKey = (opts) =>
  `${opts.mode}-${opts.timing}-${opts.playMode}`;

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
    case "REPLAY_SEQUENCE":
      return replaySequence(state);
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

const isUsableNumber = (value) =>
  typeof value === "number" && Number.isFinite(value);

const normalizeLeaderboard = (prev) => {
  if (!prev || typeof prev !== "object") return {};
  const next = {};
  for (const [key, value] of Object.entries(prev)) {
    if (Array.isArray(value)) {
      next[key] = value.filter(isUsableNumber);
    }
  }
  return next;
};

const Simon = () => {
  const prefersReducedMotion = usePrefersReducedMotion();

  const [pads, setPads] = useState(padStyles);
  const [gameState, dispatch] = useReducer(reducer, initialSimonState);
  const [activePad, setActivePad] = useState(null);
  const [paused, setPaused] = useState(false);

  const [mode, setMode] = usePersistentState(
    "simon_mode",
    "classic",
    isSimonMode,
  );
  const [tempo, setTempo] = usePersistentState(
    "simon:tempo",
    100,
    isValidTempo,
  );
  const [seed, setSeed] = usePersistentState("simon_seed", "");
  const [playMode, setPlayMode] = usePersistentState(
    "simon_play_mode",
    "normal",
    isPlayMode,
  );
  const [timing, setTiming] = usePersistentState(
    "simon_timing",
    "relaxed",
    isTiming,
  );
  const [randomPalette, setRandomPalette] = usePersistentState(
    "simon_random_palette",
    false,
  );

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

  const [leaderboard, setLeaderboard] = usePersistentState(
    "simon_leaderboard",
    {},
  );
  const [errorFlash, setErrorFlash] = useState(false);
  const [audioError, setAudioError] = useState(null);
  const [copyStatus, setCopyStatus] = useState("");
  const dailyLabel = useMemo(() => currentDateString(), []);

  const errorSound = useRef(null);
  const timersRef = useRef([]);
  const inputTimerRef = useRef(null);
  const roundRef = useRef(gameState.roundId);
  const lastPointerDownRef = useRef(0);
  const didHydrateFromUrlRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);

    const modeParam = params.get("mode");
    if (modeParam && isSimonMode(modeParam)) setMode(modeParam);

    const tempoParam = params.get("tempo");
    if (tempoParam) {
      const parsedTempo = Number.parseInt(tempoParam, 10);
      if (isValidTempo(parsedTempo)) setTempo(parsedTempo);
    }

    const playParam = params.get("play");
    if (playParam && isPlayMode(playParam)) setPlayMode(playParam);

    const timingParam = params.get("timing");
    if (timingParam && isTiming(timingParam)) setTiming(timingParam);

    const seedParam = params.get("seed");
    if (typeof seedParam === "string") setSeed(seedParam.trim());

    const randomPaletteParam = params.get("rp");
    if (randomPaletteParam !== null) {
      if (["1", "true"].includes(randomPaletteParam.toLowerCase())) {
        setRandomPalette(true);
      } else if (["0", "false"].includes(randomPaletteParam.toLowerCase())) {
        setRandomPalette(false);
      }
    }

    didHydrateFromUrlRef.current = true;
  }, [setMode, setPlayMode, setRandomPalette, setSeed, setTempo, setTiming]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!didHydrateFromUrlRef.current) return;
    if (["playback", "input", "strike"].includes(gameState.phase)) return;

    const url = new URL(window.location.href);
    url.searchParams.set("mode", mode);
    url.searchParams.set("tempo", String(tempo));
    url.searchParams.set("play", playMode);
    url.searchParams.set("timing", timing);

    const trimmedSeed = typeof seed === "string" ? seed.trim() : "";
    if (trimmedSeed) {
      url.searchParams.set("seed", trimmedSeed);
    } else {
      url.searchParams.delete("seed");
    }

    if (randomPalette) {
      url.searchParams.set("rp", "1");
    } else {
      url.searchParams.delete("rp");
    }

    window.history.replaceState({}, "", url.toString());
  }, [gameState.phase, mode, playMode, randomPalette, seed, tempo, timing]);

  useEffect(() => {
    roundRef.current = gameState.roundId;
  }, [gameState.roundId]);

  const pendingOptions = useMemo(
    () => ({
      mode,
      tempoBpm: tempo,
      playMode,
      timing,
      seed: typeof seed === "string" ? seed.trim() : "",
    }),
    [mode, tempo, playMode, timing, seed],
  );

  const [activeOptions, setActiveOptions] = useState(pendingOptions);

  const activeKey = useMemo(
    () => getLeaderboardKey(activeOptions),
    [activeOptions],
  );
  const scores = useMemo(() => {
    const normalized = normalizeLeaderboard(leaderboard);
    const list = normalized[activeKey];
    return Array.isArray(list) ? list.slice(0, 5) : [];
  }, [leaderboard, activeKey]);

  const gameBusy =
    gameState.phase !== "idle" && gameState.phase !== "gameover";
  const canPress = !paused && gameState.phase === "input";
  const canReplay =
    !paused && gameState.phase === "input" && gameState.sequence.length > 0;

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
    if (!paused) return;
    clearTimers();
    setActivePad(null);
    try {
      const ctx = getAudioContext();
      if (ctx && ctx.state !== "suspended") {
        ctx.suspend?.();
      }
    } catch {
      // ignore
    }
  }, [paused, clearTimers]);

  const ensureAudioReady = useCallback(() => {
    try {
      const ctx = getAudioContext();
      ctx?.resume?.();
      setAudioError(null);
      return ctx;
    } catch {
      setAudioError(
        "Audio is blocked or unavailable. Visual-only playback will be used.",
      );
      return null;
    }
  }, []);

  const flashPad = useCallback((idx, durationSeconds) => {
    setActivePad(idx);
    const handle = setTimeout(
      () => setActivePad(null),
      Math.max(durationSeconds, 0) * 1000,
    );
    timersRef.current.push(handle);
  }, []);

  const updateHighScores = useCallback(
    (score, opts) => {
      if (!isUsableNumber(score) || score <= 0) return;
      const key = getLeaderboardKey(opts || activeOptions);
      setLeaderboard((prev) => {
        const normalized = normalizeLeaderboard(prev);
        const current = Array.isArray(normalized[key])
          ? [...normalized[key]]
          : [];
        current.push(score);
        current.sort((a, b) => b - a);
        return { ...normalized, [key]: current.slice(0, 5) };
      });
    },
    [activeOptions, setLeaderboard],
  );

  const commitScoreIfNeeded = useCallback(() => {
    if (
      gameState.score > 0 &&
      gameState.phase !== "idle" &&
      gameState.phase !== "gameover"
    ) {
      updateHighScores(gameState.score, activeOptions);
    }
  }, [activeOptions, gameState.phase, gameState.score, updateHighScores]);

  useEffect(() => {
    if (paused) return;
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

    if (gameState.phase === "strike" && activeOptions.playMode === "normal") {
      const replayTimer = setTimeout(() => dispatch({ type: "REPLAY" }), 600);
      timersRef.current.push(replayTimer);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [
    activeOptions.playMode,
    gameState.phase,
    gameState.lastError,
    paused,
    prefersReducedMotion,
  ]);

  const prevPhaseRef = useRef(gameState.phase);
  useEffect(() => {
    if (prevPhaseRef.current !== "gameover" && gameState.phase === "gameover") {
      updateHighScores(gameState.score, activeOptions);
    }
    prevPhaseRef.current = gameState.phase;
  }, [activeOptions, gameState.phase, gameState.score, updateHighScores]);

  useEffect(() => {
    if (paused) return;
    if (gameState.phase !== "playback" || gameState.sequence.length === 0) return;

    clearTimers();
    setAudioError(null);

    const duration = stepSeconds(activeOptions, gameState.sequence.length);
    const ramp = 0.97;

    const ctx = ensureAudioReady();

    if (ctx) {
      const start = ctx.currentTime + 0.1;
      const schedule = createToneSchedule(
        gameState.sequence.length,
        start,
        duration,
        ramp,
      );

      let currentDuration = duration;
      let lastDuration = duration;

      schedule.forEach((time, i) => {
        const idx = gameState.sequence[i];
        const stepDuration = currentDuration;
        lastDuration = stepDuration;

        try {
          playColorTone(idx, time, stepDuration);
        } catch {
          setAudioError(
            "Audio playback failed. Visual-only playback will be used.",
          );
        }

        const delay = Math.max((time - ctx.currentTime) * 1000, 0);
        const handle = setTimeout(() => {
          if (roundRef.current !== gameState.roundId) return;
          flashPad(idx, stepDuration);
        }, delay);

        timersRef.current.push(handle);
        currentDuration *= ramp;
      });

      const finalDelay =
        (schedule[schedule.length - 1] -
          ctx.currentTime +
          Math.max(lastDuration, 0)) *
          1000 +
        80;

      const completion = setTimeout(() => {
        if (roundRef.current !== gameState.roundId) return;
        dispatch({ type: "PLAYBACK_DONE" });
      }, Math.max(finalDelay, 0));

      timersRef.current.push(completion);
      return;
    }

    let currentDuration = duration;
    let tMs = 120;

    for (let i = 0; i < gameState.sequence.length; i += 1) {
      const idx = gameState.sequence[i];
      const stepDuration = currentDuration;

      const handle = setTimeout(() => {
        if (roundRef.current !== gameState.roundId) return;
        flashPad(idx, stepDuration);
      }, tMs);

      timersRef.current.push(handle);
      tMs += Math.max(stepDuration, 0) * 1000;
      currentDuration *= ramp;
    }

    const completion = setTimeout(() => {
      if (roundRef.current !== gameState.roundId) return;
      dispatch({ type: "PLAYBACK_DONE" });
    }, tMs + 80);

    timersRef.current.push(completion);
  }, [
    activeOptions,
    clearTimers,
    ensureAudioReady,
    flashPad,
    gameState.phase,
    gameState.roundId,
    gameState.sequence,
    paused,
  ]);

  useEffect(() => {
    if (paused || gameState.phase !== "input") {
      if (inputTimerRef.current) {
        clearTimeout(inputTimerRef.current);
        inputTimerRef.current = null;
      }
      return;
    }

    const windowMs = inputWindowMs(activeOptions, gameState.sequence.length);
    if (!windowMs) return;

    if (inputTimerRef.current) clearTimeout(inputTimerRef.current);
    const roundId = gameState.roundId;

    const timer = setTimeout(() => {
      if (roundRef.current !== roundId) return;
      dispatch({ type: "TIMEOUT", options: activeOptions });
    }, windowMs);

    inputTimerRef.current = timer;
  }, [
    activeOptions,
    gameState.phase,
    gameState.inputIndex,
    gameState.roundId,
    gameState.sequence.length,
    paused,
  ]);

  const pressPad = useCallback(
    (idx) => {
      if (!canPress) return;

      const duration = stepSeconds(activeOptions, gameState.sequence.length);
      flashPad(idx, duration);

      const ctx = ensureAudioReady();
      if (ctx) {
        try {
          const start = ctx.currentTime + 0.001;
          playColorTone(idx, start, duration);
        } catch {
          setAudioError(
            "Audio playback failed. Visual-only playback will be used.",
          );
        }
      }

      dispatch({ type: "INPUT", pad: idx, options: activeOptions });
    },
    [
      activeOptions,
      canPress,
      ensureAudioReady,
      flashPad,
      gameState.sequence.length,
    ],
  );

  const handlePadPointerDown = useCallback(
    (idx) => (event) => {
      event.preventDefault();
      lastPointerDownRef.current = Date.now();
      pressPad(idx);
    },
    [pressPad],
  );

  const handlePadClick = useCallback(
    (idx) => () => {
      if (Date.now() - lastPointerDownRef.current < 300) return;
      pressPad(idx);
    },
    [pressPad],
  );

  const handlePadKeyDown = useCallback(
    (idx) => (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        pressPad(idx);
      }
    },
    [pressPad],
  );

  const handleStart = useCallback(() => {
    commitScoreIfNeeded();
    clearTimers();
    setActivePad(null);
    setAudioError(null);

    const nextOptions = pendingOptions;
    setActiveOptions(nextOptions);
    setPads(randomPalette ? shufflePads(nextOptions.seed) : padStyles);

    ensureAudioReady();
    dispatch({ type: "START", options: nextOptions });
  }, [
    clearTimers,
    commitScoreIfNeeded,
    ensureAudioReady,
    pendingOptions,
    randomPalette,
  ]);

  const handleRestart = useCallback(() => {
    commitScoreIfNeeded();
    clearTimers();
    setActivePad(null);
    setAudioError(null);
    dispatch({ type: "RESET" });
    setActiveOptions(pendingOptions);
    setPads(padStyles);
  }, [clearTimers, commitScoreIfNeeded, pendingOptions]);

  const handleReplay = useCallback(() => {
    if (!canReplay) return;
    clearTimers();
    setActivePad(null);
    dispatch({ type: "REPLAY_SEQUENCE" });
  }, [canReplay, clearTimers]);

  const buildChallengeUrl = useCallback(
    (seedValue) => {
      if (typeof window === "undefined") return "";
      const url = new URL(window.location.href);
      const trimmedSeed = typeof seedValue === "string" ? seedValue.trim() : "";

      url.searchParams.set("mode", mode);
      url.searchParams.set("tempo", String(tempo));
      url.searchParams.set("play", playMode);
      url.searchParams.set("timing", timing);

      if (trimmedSeed) {
        url.searchParams.set("seed", trimmedSeed);
      } else {
        url.searchParams.delete("seed");
      }

      if (randomPalette) {
        url.searchParams.set("rp", "1");
      } else {
        url.searchParams.delete("rp");
      }

      return url.toString();
    },
    [mode, playMode, randomPalette, tempo, timing],
  );

  const copyText = useCallback(async (text) => {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    if (typeof document === "undefined") return false;

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "absolute";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();

    const copied = document.execCommand("copy");
    document.body.removeChild(textarea);
    return copied;
  }, []);

  const handleDailyChallenge = useCallback(async () => {
    const daily = await getDailySeed("simon");
    setSeed(daily);
  }, [setSeed]);

  const handleCopyChallengeLink = useCallback(async () => {
    let challengeSeed = typeof seed === "string" ? seed.trim() : "";
    if (!challengeSeed) {
      challengeSeed = Math.random().toString(36).slice(2, 10);
      setSeed(challengeSeed);
    }

    const challengeUrl = buildChallengeUrl(challengeSeed);

    try {
      const copied = await copyText(challengeUrl);
      setCopyStatus(copied ? "Challenge link copied!" : "Copy failed.");
    } catch {
      setCopyStatus("Copy failed.");
    }
  }, [buildChallengeUrl, copyText, seed, setSeed]);

  useEffect(() => {
    if (!copyStatus) return undefined;
    const timer = setTimeout(() => setCopyStatus(""), 1500);
    return () => clearTimeout(timer);
  }, [copyStatus]);

  useEffect(() => {
    const isModalOpen = () =>
      typeof document !== "undefined" &&
      !!document.querySelector('[role="dialog"][aria-modal="true"]');

    const isTypingTarget = (target) => {
      if (!target || !(target instanceof HTMLElement)) return false;
      const tag = target.tagName?.toLowerCase();
      if (!tag) return false;
      return (
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        target.isContentEditable
      );
    };

    const keyToPad = {
      1: 0,
      2: 1,
      3: 2,
      4: 3,
      q: 0,
      w: 1,
      a: 2,
      s: 3,
    };

    const onKeyDown = (event) => {
      if (event.repeat) return;
      if (paused) return;
      if (isModalOpen()) return;
      if (isTypingTarget(event.target)) return;

      const key = (event.key || "").toLowerCase();

      if (key === "n") {
        event.preventDefault();
        handleStart();
        return;
      }
      if (key === "r") {
        event.preventDefault();
        handleRestart();
        return;
      }

      const idx = keyToPad[key];
      if (typeof idx === "number") {
        event.preventDefault();
        pressPad(idx);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleRestart, handleStart, paused, pressPad]);

  const padClass = useCallback(
    (pad, idx) => {
      const colors =
        audioOnly || activeOptions.mode === "colorblind"
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

      return `relative h-28 w-28 sm:h-32 sm:w-32 ${corner} flex items-center justify-center text-3xl select-none ${ring} ring-offset-2 ring-offset-gray-950 transition-shadow shadow-inner disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950 ${
        isActive
          ? `${colors.active} ring-white`
          : `${colors.base} ring-transparent`
      } before:content-[''] before:absolute before:inset-0 before:rounded-[inherit] before:scale-110 before:opacity-0 before:transition before:duration-200 before:blur-lg before:bg-white ${
        isActive ? "before:opacity-50" : ""
      } ${errorFlash && !prefersReducedMotion ? "animate-pulse" : ""}`;
    },
    [
      activeOptions.mode,
      activePad,
      audioOnly,
      colorblindPalette,
      errorFlash,
      prefersReducedMotion,
      thickOutline,
    ],
  );

  const status = useMemo(() => {
    if (paused) return "Paused";
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
  }, [gameState.lastError, gameState.phase, paused]);

  const settingsPanel = (
    <div className="space-y-3">
      <fieldset className="space-y-3" disabled={gameBusy}>
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm">Mode</label>
          <select
            className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
            value={mode}
            onChange={(event) => setMode(event.target.value)}
          >
            <option value="classic">Classic</option>
            <option value="speed">Speed Up</option>
            <option value="colorblind">Colorblind</option>
            <option value="endless">Endless</option>
          </select>

          <div className={gameBusy ? "opacity-60 pointer-events-none" : ""}>
            <TempoSelector tempo={tempo} onTempoChange={setTempo} />
          </div>

          <input
            className="px-2 py-1 w-32 bg-gray-700 hover:bg-gray-600 rounded"
            placeholder="Seed"
            aria-label="Seed"
            value={seed}
            onChange={(event) => setSeed(event.target.value)}
          />

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              aria-label="Random palette"
              checked={randomPalette}
              onChange={(event) => setRandomPalette(event.target.checked)}
            />
            Random palette
          </label>

          <button
            type="button"
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded"
            onClick={handleDailyChallenge}
          >
            Daily Challenge ({dailyLabel})
          </button>

          <button
            type="button"
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded"
            onClick={handleCopyChallengeLink}
          >
            Copy Challenge Link
          </button>

          {copyStatus ? (
            <span className="text-xs text-emerald-300">{copyStatus}</span>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-2">
            {["normal", "strict"].map((value) => (
              <button
                key={value}
                onClick={() => setPlayMode(value)}
                className={`px-2 py-1 rounded-full border ${
                  playMode === value
                    ? "bg-gray-600 border-white"
                    : "bg-gray-700 border-gray-500 hover:bg-gray-600"
                }`}
                type="button"
              >
                {value === "strict" ? "Strict" : "Normal"}
              </button>
            ))}
          </div>

          <select
            className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
            value={timing}
            onChange={(event) => setTiming(event.target.value)}
          >
            <option value="relaxed">Relaxed timing</option>
            <option value="strict">Strict timing</option>
          </select>

          <span className="text-xs text-white/70">
            Changes apply next Start.
          </span>
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              aria-label="Stripes"
              checked={striped}
              onChange={(event) => setStriped(event.target.checked)}
            />
            Stripes
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              aria-label="Thick outline"
              checked={thickOutline}
              onChange={(event) => setThickOutline(event.target.checked)}
            />
            Thick outline
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              aria-label="Colorblind palette"
              checked={colorblindPalette}
              onChange={(event) => setColorblindPalette(event.target.checked)}
              disabled={audioOnly || activeOptions.mode === "colorblind"}
            />
            Colorblind palette
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              aria-label="Audio-only visuals"
              checked={audioOnly}
              onChange={(event) => setAudioOnly(event.target.checked)}
            />
            Audio-only visuals
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded"
            onClick={() => setLeaderboard({})}
          >
            Clear all scores
          </button>

          <button
            type="button"
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded"
            onClick={() =>
              setLeaderboard((prev) => {
                const normalized = normalizeLeaderboard(prev);
                const next = { ...normalized };
                delete next[activeKey];
                return next;
              })
            }
          >
            Clear this mode
          </button>
        </div>
      </fieldset>

      <div className="text-xs text-white/70">
        Current run: <span className="text-white">{activeKey}</span>
      </div>
    </div>
  );

  return (
    <GameLayout
      gameId="simon"
      onRestart={handleRestart}
      onPauseChange={setPaused}
      stage={gameState.sequence.length}
      score={gameState.score}
      highScore={scores[0] ?? 0}
      settingsPanel={settingsPanel}
    >
      <div className={errorFlash ? "buzz" : ""}>
        <div className="mx-auto w-fit">
          <div className="grid grid-cols-2 gap-[6px] p-2 rounded-full bg-slate-950/30 border border-slate-700/70 shadow-inner">
            {pads.map((pad, idx) => {
              const showLabel =
                activeOptions.mode === "colorblind" || audioOnly;
              const labelText =
                activeOptions.mode === "colorblind"
                  ? pad.label.toUpperCase()
                  : String(idx + 1);

              return (
                <button
                  key={pad.id}
                  className={padClass(pad, idx)}
                  style={
                    striped && !audioOnly
                      ? { backgroundImage: pad.pattern }
                      : undefined
                  }
                  onPointerDown={handlePadPointerDown(idx)}
                  onClick={handlePadClick(idx)}
                  onKeyDown={handlePadKeyDown(idx)}
                  aria-label={`${pad.label} pad`}
                  aria-keyshortcuts={
                    idx === 0
                      ? "1 Q"
                      : idx === 1
                        ? "2 W"
                        : idx === 2
                          ? "3 A"
                          : "4 S"
                  }
                  disabled={!canPress}
                >
                  {showLabel ? (
                    <span className="font-semibold tracking-wide drop-shadow-sm">
                      {labelText}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4 flex flex-col items-center gap-3 text-center">
          <div className="text-sm text-slate-200/90" aria-live="polite" role="status">
            {status}
          </div>

          {audioError ? (
            <div className="text-xs text-rose-200 bg-rose-950/30 border border-rose-700/40 rounded px-2 py-1">
              {audioError}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2 justify-center">
            <button
              type="button"
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
              onClick={handleStart}
            >
              {gameState.phase === "idle" ? "Start" : "New game"}
            </button>

            <button
              type="button"
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded disabled:opacity-60 disabled:cursor-not-allowed"
              onClick={handleReplay}
              disabled={!canReplay}
            >
              Replay
            </button>
          </div>

          <div className="text-xs text-slate-300/80">
            Keyboard: 1-4 or Q-W-A-S. N starts a new game. R resets.
          </div>
        </div>

        <div className="mt-6 text-center">
          <div className="mb-2 text-sm text-white/80">
            Leaderboard (this mode)
          </div>
          {scores.length ? (
            <ol className="list-decimal list-inside text-sm">
              {scores.map((score, i) => (
                <li key={`${score}-${i}`}>{score}</li>
              ))}
            </ol>
          ) : (
            <div className="text-sm text-white/60">No scores yet.</div>
          )}
        </div>
      </div>
    </GameLayout>
  );
};

export default Simon;
