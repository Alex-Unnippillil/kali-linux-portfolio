import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
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

const padStyles = [
  {
    id: "green",
    label: "green",
    symbol: "▲",
    pattern:
      "repeating-linear-gradient(45deg, rgba(255,255,255,0.2) 0, rgba(255,255,255,0.2) 10px, transparent 10px, transparent 20px)",
    palette: {
      normal: {
        base: "from-emerald-600/80 to-emerald-400/70",
        active: "from-emerald-400/90 to-lime-300/80",
        glow: {
          base: "rgba(16, 185, 129, 0.55)",
          active: "rgba(163, 230, 53, 0.85)",
        },
      },
      colorblind: {
        base: "from-teal-600/80 to-cyan-500/70",
        active: "from-cyan-400/90 to-sky-300/80",
        glow: {
          base: "rgba(20, 184, 166, 0.55)",
          active: "rgba(103, 232, 249, 0.85)",
        },
      },
    },
  },
  {
    id: "red",
    label: "red",
    symbol: "■",
    pattern:
      "repeating-linear-gradient(-45deg, rgba(255,255,255,0.2) 0, rgba(255,255,255,0.2) 10px, transparent 10px, transparent 20px)",
    palette: {
      normal: {
        base: "from-rose-600/80 to-orange-500/70",
        active: "from-orange-400/90 to-amber-300/80",
        glow: {
          base: "rgba(248, 113, 113, 0.6)",
          active: "rgba(251, 191, 36, 0.85)",
        },
      },
      colorblind: {
        base: "from-amber-600/80 to-orange-500/70",
        active: "from-amber-400/90 to-yellow-300/80",
        glow: {
          base: "rgba(251, 191, 36, 0.6)",
          active: "rgba(253, 224, 71, 0.85)",
        },
      },
    },
  },
  {
    id: "yellow",
    label: "yellow",
    symbol: "●",
    pattern:
      "repeating-linear-gradient(0deg, rgba(255,255,255,0.2) 0, rgba(255,255,255,0.2) 10px, transparent 10px, transparent 20px)",
    palette: {
      normal: {
        base: "from-amber-400/80 to-yellow-300/70",
        active: "from-yellow-300/90 to-lime-200/80",
        glow: {
          base: "rgba(250, 204, 21, 0.6)",
          active: "rgba(190, 242, 100, 0.85)",
        },
      },
      colorblind: {
        base: "from-violet-600/80 to-purple-500/70",
        active: "from-violet-400/90 to-fuchsia-300/80",
        glow: {
          base: "rgba(167, 139, 250, 0.65)",
          active: "rgba(240, 171, 252, 0.85)",
        },
      },
    },
  },
  {
    id: "blue",
    label: "blue",
    symbol: "◆",
    pattern:
      "repeating-linear-gradient(90deg, rgba(255,255,255,0.2) 0, rgba(255,255,255,0.2) 10px, transparent 10px, transparent 20px)",
    palette: {
      normal: {
        base: "from-sky-600/80 to-blue-500/70",
        active: "from-sky-400/90 to-cyan-300/80",
        glow: {
          base: "rgba(56, 189, 248, 0.6)",
          active: "rgba(165, 243, 252, 0.85)",
        },
      },
      colorblind: {
        base: "from-teal-600/80 to-emerald-500/70",
        active: "from-emerald-400/90 to-lime-300/80",
        glow: {
          base: "rgba(45, 212, 191, 0.65)",
          active: "rgba(163, 230, 53, 0.85)",
        },
      },
    },
  },
];

const difficultyPresets = {
  chill: {
    label: "Chill",
    tempo: 85,
    timing: "relaxed",
    playMode: "normal",
    description: "Gentle tempo with relaxed timing windows.",
  },
  classic: {
    label: "Classic",
    tempo: 100,
    timing: "relaxed",
    playMode: "normal",
    description: "Authentic Simon pacing with forgiving retries.",
  },
  turbo: {
    label: "Turbo",
    tempo: 115,
    timing: "strict",
    playMode: "normal",
    description: "Faster playback and stricter timing windows.",
  },
  expert: {
    label: "Expert",
    tempo: 125,
    timing: "strict",
    playMode: "strict",
    description: "High speed with strict mode — one mistake ends the run.",
  },
};

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
  const [pads, setPads] = useState(() => [...padStyles]);
  const [sequence, setSequence] = useState([]);
  const [playerStep, setPlayerStep] = useState(0);
  const [isPlayerTurn, setIsPlayerTurn] = useState(false);
  const [activePad, setActivePad] = useState(null);
  const [status, setStatus] = useState("Press Start");
  const [mode, setMode] = usePersistentState("simon_mode", "classic");
  const [tempo, setTempo] = usePersistentState("simon_tempo", 100);
  const [patternOverlay, setPatternOverlay] = usePersistentState(
    "simon_striped",
    false,
  );
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
  const [showSymbols, setShowSymbols] = usePersistentState(
    "simon_show_symbols",
    true,
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
  const [difficulty, setDifficulty] = usePersistentState(
    "simon_difficulty",
    "classic",
  );
  const [currentStreak, setCurrentStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [ripples, setRipples] = useState([]);
  const [errorFlash, setErrorFlash] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const errorSound = useRef(null);
  const rngRef = useRef(Math.random);
  const timeoutRef = useRef(null);
  const difficultyRef = useRef(difficulty);

  const scoreKey = useMemo(
    () => `${difficulty}-${mode}-${timing}-${playMode}`,
    [difficulty, mode, timing, playMode],
  );

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleChange = () => setPrefersReducedMotion(media.matches);
    handleChange();
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    const storedTop = leaderboard[scoreKey]?.[0] ?? 0;
    setBestStreak((prev) => (prev === storedTop ? prev : storedTop));
  }, [leaderboard, scoreKey]);

  useEffect(() => {
    if (difficultyRef.current === difficulty) return;
    const preset = difficultyPresets[difficulty];
    if (!preset) return;
    difficultyRef.current = difficulty;
    if (tempo !== preset.tempo) setTempo(preset.tempo);
    if (timing !== preset.timing) setTiming(preset.timing);
    if (playMode !== preset.playMode) setPlayMode(preset.playMode);
  }, [difficulty, playMode, setPlayMode, setTempo, setTiming, tempo, timing]);

  useEffect(
    () => () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    },
    [],
  );

  const spawnRipple = useCallback(
    (idx) => {
      if (prefersReducedMotion) return;
      const id =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${idx}-${Date.now()}-${Math.random()}`;
      setRipples((prev) => [...prev, { id, pad: idx }]);
      setTimeout(() => {
        setRipples((prev) => prev.filter((ripple) => ripple.id !== id));
      }, 450);
    },
    [prefersReducedMotion],
  );

  const flashPad = useCallback(
    (idx, duration) => {
      if (!prefersReducedMotion) vibrate(50);
      if (audioOnly) return;
      spawnRipple(idx);
      setActivePad(idx);
      setTimeout(() => {
        setActivePad((current) => (current === idx ? null : current));
      }, duration * 1000);
    },
    [audioOnly, prefersReducedMotion, spawnRipple],
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
    if (!sequence.length) return;
    const ctx = getAudioContext();
    setIsPlayerTurn(false);
    setStatus("Listen...");
    setPlayerStep(0);
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
      const delay = Math.max((time - ctx.currentTime) * 1000, 0);
      setTimeout(() => flashPad(idx, currentDelta), delay);
      finalDelta = currentDelta;
      currentDelta *= ramp;
    });
    const lastDelay = schedule.length
      ? (schedule[schedule.length - 1] - ctx.currentTime + finalDelta) * 1000
      : 0;
    setTimeout(() => {
      setStatus("Your turn");
      setIsPlayerTurn(true);
      setPlayerStep(0);
    }, Math.max(lastDelay, 250));
  }, [flashPad, sequence, stepDuration]);

  const updateHighScores = useCallback(
    (score) => {
      if (!score) return;
      setLeaderboard((prev) => {
        const current = Array.isArray(prev[scoreKey]) ? [...prev[scoreKey]] : [];
        current.push(score);
        current.sort((a, b) => b - a);
        return { ...prev, [scoreKey]: current.slice(0, 5) };
      });
      setBestStreak((prev) => (score > prev ? score : prev));
    },
    [scoreKey, setLeaderboard],
  );

  const restartGame = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setSequence([]);
    setPlayerStep(0);
    setIsPlayerTurn(false);
    setStatus("Press Start");
    setActivePad(null);
    setRipples([]);
    setErrorFlash(false);
    setCurrentStreak(0);
  }, []);

  const handleFailure = useCallback(
    (message) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (!errorSound.current) {
        errorSound.current = new Howl({ src: [ERROR_SOUND_SRC] });
      }
      errorSound.current.play();
      if (!prefersReducedMotion) vibrate(120);
      updateHighScores(currentStreak);
      setCurrentStreak(0);
      setIsPlayerTurn(false);
      setStatus(message);
      setErrorFlash(true);
      setActivePad(null);
      setRipples([]);
      setTimeout(() => {
        setErrorFlash(false);
        if (playMode === "strict") {
          restartGame();
        } else {
          setPlayerStep(0);
          setStatus("Listen...");
          playSequence();
        }
      }, 700);
    },
    [
      currentStreak,
      playMode,
      playSequence,
      prefersReducedMotion,
      restartGame,
      updateHighScores,
    ],
  );

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
      setPads([...padStyles]);
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setSequence([Math.floor(rngRef.current() * 4)]);
    setStatus("Listen...");
    setActivePad(null);
    setRipples([]);
    setCurrentStreak(0);
    setErrorFlash(false);
  }, [randomPalette, seed]);

  const handlePadActivate = useCallback(
    (idx) => {
      if (!isPlayerTurn) return;
      const duration = stepDuration();
      flashPad(idx, duration);
      const start = getAudioContext().currentTime + 0.001;
      playColorTone(idx, start, duration);

      if (sequence[playerStep] !== idx) {
        handleFailure(
          playMode === "strict"
            ? "Wrong pad! Game over."
            : "Wrong pad! Try again.",
        );
        return;
      }

      const nextStep = playerStep + 1;
      if (nextStep === sequence.length) {
        const completed = sequence.length;
        setCurrentStreak(completed);
        updateHighScores(completed);
        setIsPlayerTurn(false);
        setStatus("Great! Listen for the next pattern.");
        setPlayerStep(0);
        setTimeout(() => {
          setSequence((prev) => [...prev, Math.floor(rngRef.current() * 4)]);
        }, Math.max(350, duration * 650));
      } else {
        setPlayerStep(nextStep);
      }
    },
    [
      flashPad,
      handleFailure,
      isPlayerTurn,
      playMode,
      playerStep,
      sequence,
      stepDuration,
      updateHighScores,
    ],
  );

  useEffect(() => {
    if (!sequence.length) return;
    playSequence();
  }, [sequence, playSequence]);

  useEffect(() => {
    if (timing !== "strict" || !isPlayerTurn) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      handleFailure(
        playMode === "strict"
          ? "Time up! Game over."
          : "Time up! Try again.",
      );
    }, 5000);
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [handleFailure, isPlayerTurn, playMode, playerStep, timing]);

  const padClass = useCallback(
    (pad, idx) => {
      const palette = colorblindPalette
        ? pad.palette.colorblind
        : pad.palette.normal;
      const isMuted = mode === "colorblind" || audioOnly;
      const isActive = activePad === idx;
      const glow = isMuted
        ? {
            base: "rgba(148, 163, 184, 0.4)",
            active: "rgba(226, 232, 240, 0.6)",
          }
        : palette.glow;
      const gradient = isMuted
        ? "bg-slate-800/70"
        : `bg-gradient-to-br ${isActive ? palette.active : palette.base}`;
      const ring = thickOutline
        ? "ring-4 ring-white/60"
        : "ring-2 ring-white/30";
      return `relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-3xl border border-white/20 ${gradient} ${ring} text-3xl font-semibold uppercase tracking-wide text-white shadow-[0_25px_50px_rgba(15,23,42,0.45)] transition-all duration-300 ease-out focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-200/60 ${
        errorFlash ? "animate-[pulse_0.7s_ease-in-out]" : ""
      }`;
    },
    [activePad, audioOnly, colorblindPalette, errorFlash, mode, thickOutline],
  );

  const scores = leaderboard[scoreKey] || [];
  const activeDifficulty = difficultyPresets[difficulty];

  return (
    <GameLayout
      gameId="simon"
      onRestart={restartGame}
      score={currentStreak}
      highScore={bestStreak}
      stage={sequence.length}
    >
      <div className="flex h-full flex-col gap-6 overflow-y-auto p-4 text-white md:flex-row">
        <div className="flex flex-1 flex-col items-center justify-center">
          <div className="relative w-full max-w-xl">
            <div
              className={`relative rounded-[3rem] border border-white/10 bg-white/10 p-6 shadow-[0_0_60px_rgba(45,212,191,0.25)] backdrop-blur-2xl transition-all duration-300 ${
                errorFlash ? "ring-2 ring-rose-400/70" : "ring-1 ring-cyan-400/40"
              }`}
            >
              <div className="grid grid-cols-2 gap-4 sm:gap-6" role="grid">
                {pads.map((pad, idx) => {
                  const palette = colorblindPalette
                    ? pad.palette.colorblind
                    : pad.palette.normal;
                  const isMuted = mode === "colorblind" || audioOnly;
                  const isActive = activePad === idx;
                  const glow = isMuted
                    ? {
                        base: "rgba(148, 163, 184, 0.4)",
                        active: "rgba(226, 232, 240, 0.6)",
                      }
                    : palette.glow;
                  return (
                    <button
                      key={pad.id}
                      type="button"
                      className={padClass(pad, idx)}
                      style={{
                        boxShadow: `inset 0 0 25px rgba(15,23,42,0.45), 0 0 30px ${
                          isActive ? glow.active : glow.base
                        }`,
                      }}
                      onPointerDown={(event) => {
                        event.preventDefault();
                        handlePadActivate(idx);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          handlePadActivate(idx);
                        }
                      }}
                      aria-label={`${pad.label} pad`}
                      role="gridcell"
                      tabIndex={0}
                      data-pad={pad.id}
                    >
                      {showSymbols ? (
                        <div className="relative z-10 flex flex-col items-center gap-1 text-center">
                          <span className="text-3xl sm:text-4xl drop-shadow-lg">
                            {pad.symbol}
                          </span>
                          <span className="text-xs font-semibold tracking-widest text-white/90">
                            {pad.label.toUpperCase()}
                          </span>
                        </div>
                      ) : (
                        <span className="relative z-10 text-2xl font-semibold drop-shadow-lg">
                          {pad.label.toUpperCase()}
                        </span>
                      )}
                      {(patternOverlay || mode === "colorblind") && (
                        <span
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-60 mix-blend-overlay"
                          style={{ backgroundImage: pad.pattern }}
                        />
                      )}
                      {!prefersReducedMotion &&
                        ripples
                          .filter((ripple) => ripple.pad === idx)
                          .map((ripple) => (
                            <span
                              key={ripple.id}
                              aria-hidden="true"
                              className="pointer-events-none absolute inset-0 rounded-[inherit] border-2 border-white/60 opacity-75 [animation:ping_0.6s_ease-out]"
                            />
                          ))}
                    </button>
                  );
                })}
              </div>
              <div
                className="pointer-events-none absolute inset-0 rounded-[3rem] border border-white/10 shadow-[inset_0_0_45px_rgba(148,163,184,0.35)]"
                aria-hidden="true"
              />
            </div>
          </div>
          <div
            className="mt-4 text-center text-base font-medium text-slate-100"
            role="status"
            aria-live="polite"
          >
            {status}
          </div>
        </div>
        <div className="flex w-full flex-col gap-4 pb-6 md:w-80 md:pb-0">
          <section className="rounded-3xl border border-white/10 bg-white/10 p-4 shadow-[0_30px_70px_rgba(15,23,42,0.45)] backdrop-blur-2xl">
            <h2 className="mb-3 text-lg font-semibold text-cyan-200">Difficulty</h2>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(difficultyPresets).map(([key, config]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setDifficulty(key)}
                  className={`rounded-2xl border px-3 py-2 text-left text-sm transition ${
                    difficulty === key
                      ? "border-cyan-300 bg-cyan-500/30 text-white shadow-[0_0_20px_rgba(34,211,238,0.45)]"
                      : "border-white/20 bg-white/5 text-slate-100 hover:border-cyan-200/60 hover:bg-cyan-400/20"
                  }`}
                >
                  <div className="font-semibold">{config.label}</div>
                  <div className="text-xs text-slate-200/80">{config.description}</div>
                </button>
              ))}
            </div>
            {activeDifficulty && (
              <p className="mt-3 text-xs text-slate-200/80">
                Tempo {activeDifficulty.tempo} BPM · {activeDifficulty.timing} timing · {activeDifficulty.playMode === "strict" ? "Strict" : "Normal"} mode
              </p>
            )}
          </section>
          <section className="space-y-3 rounded-3xl border border-white/10 bg-white/10 p-4 shadow-[0_30px_70px_rgba(15,23,42,0.45)] backdrop-blur-2xl">
            <h2 className="text-lg font-semibold text-cyan-200">Game settings</h2>
            <label className="flex flex-col gap-1 text-sm text-slate-100">
              Mode
              <select
                className="rounded-xl border border-white/20 bg-slate-900/60 px-3 py-2 text-sm focus:border-cyan-300 focus:outline-none"
                value={mode}
                onChange={(e) => setMode(e.target.value)}
              >
                <option value="classic">Classic</option>
                <option value="speed">Speed Up</option>
                <option value="colorblind">Colorblind</option>
                <option value="endless">Endless</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm text-slate-100">
              Tempo: {tempo} BPM
              <input
                type="range"
                min="60"
                max="140"
                value={tempo}
                onChange={(e) => setTempo(Number(e.target.value))}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-slate-100">
              Seed
              <input
                className="rounded-xl border border-white/20 bg-slate-900/60 px-3 py-2 text-sm focus:border-cyan-300 focus:outline-none"
                placeholder="Seed"
                value={seed}
                onChange={(e) => setSeed(e.target.value)}
              />
            </label>
            <div className="flex gap-2">
              {["normal", "strict"].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPlayMode(m)}
                  className={`flex-1 rounded-full border px-3 py-2 text-sm transition ${
                    playMode === m
                      ? "border-cyan-300 bg-cyan-500/30 text-white"
                      : "border-white/20 bg-white/5 text-slate-100 hover:border-cyan-200/60 hover:bg-cyan-400/20"
                  }`}
                >
                  {m === "strict" ? "Strict" : "Normal"}
                </button>
              ))}
            </div>
            <label className="flex flex-col gap-1 text-sm text-slate-100">
              Timing window
              <select
                className="rounded-xl border border-white/20 bg-slate-900/60 px-3 py-2 text-sm focus:border-cyan-300 focus:outline-none"
                value={timing}
                onChange={(e) => setTiming(e.target.value)}
              >
                <option value="relaxed">Relaxed timing</option>
                <option value="strict">Strict timing</option>
              </select>
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={startGame}
                className="rounded-full bg-cyan-500/70 px-4 py-2 text-sm font-semibold text-slate-950 shadow-[0_0_25px_rgba(34,211,238,0.65)] transition hover:bg-cyan-300/80"
              >
                Start sequence
              </button>
              <button
                type="button"
                onClick={restartGame}
                className="rounded-full border border-white/30 bg-white/10 px-4 py-2 text-sm text-white transition hover:border-cyan-200/60 hover:bg-cyan-400/20"
              >
                Reset
              </button>
            </div>
          </section>
          <section className="space-y-2 rounded-3xl border border-white/10 bg-white/10 p-4 shadow-[0_30px_70px_rgba(15,23,42,0.45)] backdrop-blur-2xl">
            <h2 className="text-lg font-semibold text-cyan-200">Accessibility</h2>
            <label className="flex items-center gap-2 text-sm text-slate-100">
              <input
                type="checkbox"
                checked={colorblindPalette}
                onChange={(e) => setColorblindPalette(e.target.checked)}
              />
              Colorblind palette
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-100">
              <input
                type="checkbox"
                checked={patternOverlay}
                onChange={(e) => setPatternOverlay(e.target.checked)}
              />
              Pattern overlay
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-100">
              <input
                type="checkbox"
                checked={showSymbols}
                onChange={(e) => setShowSymbols(e.target.checked)}
              />
              Symbols and labels
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-100">
              <input
                type="checkbox"
                checked={thickOutline}
                onChange={(e) => setThickOutline(e.target.checked)}
              />
              Thick outline glow
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-100">
              <input
                type="checkbox"
                checked={randomPalette}
                onChange={(e) => setRandomPalette(e.target.checked)}
              />
              Randomize pad order
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-100">
              <input
                type="checkbox"
                checked={audioOnly}
                onChange={(e) => setAudioOnly(e.target.checked)}
              />
              Audio & haptic cues only
            </label>
          </section>
          <section className="space-y-3 rounded-3xl border border-white/10 bg-white/10 p-4 shadow-[0_30px_70px_rgba(15,23,42,0.45)] backdrop-blur-2xl">
            <h2 className="text-lg font-semibold text-cyan-200">Scoreboard</h2>
            <div className="flex items-center justify-between text-sm text-slate-100">
              <span>Current streak</span>
              <span className="font-semibold text-cyan-200">{currentStreak}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-slate-100">
              <span>Best streak</span>
              <span className="font-semibold text-cyan-200">{bestStreak}</span>
            </div>
            <ol className="space-y-1 text-sm text-slate-100">
              {scores.length ? (
                scores.map((score, index) => (
                  <li
                    key={`${score}-${index}`}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                  >
                    <span>#{index + 1}</span>
                    <span className="font-semibold text-cyan-200">{score}</span>
                  </li>
                ))
              ) : (
                <li className="rounded-xl border border-dashed border-white/20 px-3 py-2 text-center text-slate-300">
                  No streaks recorded yet.
                </li>
              )}
            </ol>
            {activeDifficulty && (
              <p className="text-xs text-slate-200/80">
                Scores tracked for {activeDifficulty.label} · {mode} mode · {timing} timing
              </p>
            )}
          </section>
        </div>
      </div>
    </GameLayout>
  );
};

export default Simon;

