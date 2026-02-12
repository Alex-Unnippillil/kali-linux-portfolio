"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Overlay, useGameLoop } from "../../components/apps/Games/common";
import { useGamePersistence } from "../../components/apps/useGameControls";
import { createPinballWorld, constants, type PinballWorld } from "./physics";
import { useTiltSensor } from "./tilt";

const themes: Record<string, { bg: string; flipper: string }> = {
  classic: { bg: "#0b3d91", flipper: "#ffd700" },
  space: { bg: "#000000", flipper: "#00ffff" },
  forest: { bg: "#064e3b", flipper: "#9acd32" },
};

const formatScore = (value: number) => value.toString().padStart(6, "0");
const MAX_BALLS = 3;

const tonePalette = {
  success: {
    banner:
      "border-[color-mix(in_srgb,var(--game-color-success)_55%,transparent)] bg-[color-mix(in_srgb,var(--game-color-success)_18%,var(--color-surface))] text-white shadow-lg",
    label:
      "text-[color-mix(in_srgb,var(--game-color-success)_70%,#f8fafc)]",
  },
  warning: {
    banner:
      "border-[color-mix(in_srgb,var(--game-color-warning)_55%,transparent)] bg-[color-mix(in_srgb,var(--game-color-warning)_18%,var(--color-surface))] text-white shadow-lg",
    label:
      "text-[color-mix(in_srgb,var(--game-color-warning)_72%,#f8fafc)]",
  },
  danger: {
    banner:
      "border-[color-mix(in_srgb,var(--game-color-danger)_55%,transparent)] bg-[color-mix(in_srgb,var(--game-color-danger)_22%,var(--color-surface))] text-white shadow-lg",
    label:
      "text-[color-mix(in_srgb,var(--game-color-danger)_78%,#f8fafc)]",
  },
} as const;

export default function Pinball() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const worldRef = useRef<PinballWorld | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const [theme, setTheme] = useState<keyof typeof themes>("classic");
  const [flipperPower, setFlipperPower] = useState(1);
  const [bounce, setBounce] = useState(0.5);
  const [tilt, setTilt] = useState(false);
  const [score, setScore] = useState(0);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [ready, setReady] = useState(false);
  const [ballsRemaining, setBallsRemaining] = useState(MAX_BALLS);
  const [ballLocked, setBallLocked] = useState(true);
  const [gameOver, setGameOver] = useState(false);
  const [launchPower, setLaunchPower] = useState(0.8);
  const nudgesRef = useRef<number[]>([]);
  const lastNudgeRef = useRef(0);
  const flipperInputRef = useRef({ left: 0, right: 0 });
  const flipperPowerRef = useRef(flipperPower);
  const { getHighScore, setHighScore } = useGamePersistence("pinball");
  const [highScore, setHighScoreState] = useState(0);
  const scoreHandlerRef = useRef<(value: number) => void>(() => {});
  const ballLostHandlerRef = useRef<() => void>(() => {});
  const initialThemeRef = useRef(themes[theme]);
  const initialBounceRef = useRef(bounce);

  useEffect(() => {
    setHighScoreState(getHighScore());
  }, [getHighScore]);

  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
      setHighScoreState(score);
    }
  }, [score, highScore, setHighScore]);

  const handleTilt = useCallback(() => {
    setTilt(true);
    flipperInputRef.current = { left: 0, right: 0 };
    const power = flipperPowerRef.current;
    worldRef.current?.setLeftFlipperInput(0, power);
    worldRef.current?.setRightFlipperInput(0, power);
    window.setTimeout(() => {
      setTilt(false);
      nudgesRef.current = [];
    }, 3000);
  }, []);

  const playScoreSound = useCallback(() => {
    if (muted) return;
    try {
      const AudioCtor =
        typeof window !== "undefined"
          ? ((window.AudioContext ||
              (window as typeof window & {
                webkitAudioContext?: typeof AudioContext;
              }).webkitAudioContext) as typeof AudioContext | undefined)
          : undefined;
      if (!AudioCtor) return;
      const ctx = audioCtxRef.current || new AudioCtor();
      audioCtxRef.current = ctx;
      if (ctx.state === "suspended") {
        ctx.resume().catch(() => undefined);
      }
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.21);
    } catch {
      /* ignore audio errors */
    }
  }, [muted]);

  const handleScore = useCallback(
    (value: number) => {
      setScore((prev) => prev + value);
      playScoreSound();
    },
    [playScoreSound],
  );

  useEffect(() => {
    scoreHandlerRef.current = handleScore;
  }, [handleScore]);

  const handleBallLost = useCallback(() => {
    setBallsRemaining((prev) => {
      const next = Math.max(prev - 1, 0);
      if (next <= 0) {
        setGameOver(true);
      }
      return next;
    });
    setBallLocked(true);
    worldRef.current?.resetFlippers();
    flipperInputRef.current = { left: 0, right: 0 };
    worldRef.current?.resetBall();
  }, []);

  useEffect(() => {
    ballLostHandlerRef.current = handleBallLost;
  }, [handleBallLost]);

  useTiltSensor(25, handleTilt);

  useEffect(() => {
    if (!canvasRef.current) return undefined;

    const world = createPinballWorld(
      canvasRef.current,
      {
        onScore: (value) => {
          scoreHandlerRef.current(value);
        },
        onBallLost: () => {
          ballLostHandlerRef.current();
        },
      },
      initialThemeRef.current,
      initialBounceRef.current,
    );
    worldRef.current = world;
    world.resetBall();
    world.resetFlippers();
    setBallsRemaining(MAX_BALLS);
    setBallLocked(world.isBallLocked());
    setGameOver(false);
    setReady(true);

    return () => {
      world.destroy();
      worldRef.current = null;
      setReady(false);
    };
  }, []);

  useEffect(() => {
    worldRef.current?.setBounce(bounce);
  }, [bounce]);

  useEffect(() => {
    worldRef.current?.setTheme(themes[theme]);
  }, [theme]);

  useEffect(() => {
    flipperPowerRef.current = flipperPower;
    if (!worldRef.current) return;
    const { left, right } = flipperInputRef.current;
    worldRef.current.setLeftFlipperInput(left, flipperPower);
    worldRef.current.setRightFlipperInput(right, flipperPower);
  }, [flipperPower]);

  const handleNudge = useCallback(() => {
    const now = Date.now();
    nudgesRef.current = nudgesRef.current.filter((t) => now - t < 3000);
    nudgesRef.current.push(now);
    worldRef.current?.nudge({ x: 0.02, y: 0 });
    if (nudgesRef.current.length >= 3) {
      handleTilt();
    }
  }, [handleTilt]);

  const tryNudge = useCallback(() => {
    if (tilt) return;
    const now = Date.now();
    if (now - lastNudgeRef.current < 500) return;
    lastNudgeRef.current = now;
    handleNudge();
  }, [tilt, handleNudge]);

  const handleLaunch = useCallback(() => {
    if (
      !worldRef.current ||
      !ballLocked ||
      ballsRemaining <= 0 ||
      paused ||
      tilt ||
      gameOver
    )
      return;
    worldRef.current.launchBall(launchPower);
    setBallLocked(false);
  }, [ballLocked, ballsRemaining, paused, tilt, gameOver, launchPower]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (tilt) return;
      if (event.code === "ArrowLeft") {
        flipperInputRef.current.left = 1;
        worldRef.current?.setLeftFlipperInput(1, flipperPower);
      } else if (event.code === "ArrowRight") {
        flipperInputRef.current.right = 1;
        worldRef.current?.setRightFlipperInput(1, flipperPower);
      } else if (event.code === "KeyN") {
        tryNudge();
      } else if (event.code === "Space") {
        event.preventDefault();
        handleLaunch();
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === "ArrowLeft") {
        flipperInputRef.current.left = 0;
        worldRef.current?.setLeftFlipperInput(0, flipperPower);
      } else if (event.code === "ArrowRight") {
        flipperInputRef.current.right = 0;
        worldRef.current?.setRightFlipperInput(0, flipperPower);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [flipperPower, tilt, tryNudge, handleLaunch]);

  useEffect(() => {
    let frame = 0;
    let lastPressed = false;
    const poll = () => {
      const gp = navigator.getGamepads ? navigator.getGamepads()[0] : null;
      if (gp) {
        const pressed = gp.buttons[5]?.pressed || gp.axes[1] < -0.8;
        if (pressed && !lastPressed) {
          tryNudge();
        }
        lastPressed = pressed;
      }
      frame = requestAnimationFrame(poll);
    };
    frame = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(frame);
  }, [tryNudge]);

  useGameLoop(
    (delta) => {
      worldRef.current?.step(delta);
    },
    ready && !paused && !gameOver,
  );

  const resetGame = useCallback(() => {
    setScore(0);
    worldRef.current?.resetBall();
    worldRef.current?.resetFlippers();
    flipperInputRef.current = { left: 0, right: 0 };
    setTilt(false);
    nudgesRef.current = [];
    setBallsRemaining(MAX_BALLS);
    setBallLocked(true);
    setGameOver(false);
    setPaused(false);
  }, []);

  const overlay = useMemo(
    () => (
      <Overlay
        onPause={() => setPaused(true)}
        onResume={() => setPaused(false)}
        muted={muted}
        onToggleSound={(next) => setMuted(next)}
        onReset={resetGame}
      />
    ),
    [muted, resetGame],
  );

  const status = useMemo(() => {
    const baseBallSummary = ballLocked
      ? ballsRemaining === MAX_BALLS
        ? `Ready (${ballsRemaining} balls)`
        : `Locked (${ballsRemaining} left)`
      : `In play (${ballsRemaining} left)`;
    const baseObjective = ballLocked
      ? ballsRemaining === MAX_BALLS
        ? "Press Launch or Space to start."
        : "Launch the next ball when you're ready."
      : "Keep the ball alive!";

    if (!ready) {
      return {
        overlay: "Booting table...",
        banner: {
          toneClass: tonePalette.warning.banner,
          ball: "Booting",
          objective: "Initializing table systems.",
          tiltLabel: "Calibrating…",
          tiltTone: tonePalette.warning.label,
        },
      } as const;
    }

    if (gameOver) {
      return {
        overlay: "Game over! Hit reset to start a new run.",
        banner: {
          toneClass: tonePalette.danger.banner,
          ball: "Spent (no balls left)",
          objective: "Hit reset to start a new run.",
          tiltLabel: "Clear",
          tiltTone: tonePalette.danger.label,
        },
      } as const;
    }

    if (tilt) {
      return {
        overlay: "TILT! Controls locked.",
        banner: {
          toneClass: tonePalette.danger.banner,
          ball: ballLocked
            ? `Locked (${ballsRemaining} left)`
            : `Frozen mid-play (${ballsRemaining} left)`,
          objective: "Wait for the table to recover.",
          tiltLabel: "Active",
          tiltTone: tonePalette.danger.label,
        },
      } as const;
    }

    if (paused) {
      return {
        overlay: "Paused.",
        banner: {
          toneClass: tonePalette.warning.banner,
          ball: baseBallSummary,
          objective: ballLocked
            ? "Resume and launch when you're ready."
            : "Resume to keep the run alive.",
          tiltLabel: "Clear",
          tiltTone: tonePalette.success.label,
        },
      } as const;
    }

    return {
      overlay: baseObjective,
      banner: {
        toneClass: ballLocked
          ? tonePalette.warning.banner
          : tonePalette.success.banner,
        ball: baseBallSummary,
        objective: baseObjective,
        tiltLabel: "Clear",
        tiltTone: tonePalette.success.label,
      },
    } as const;
  }, [ballLocked, ballsRemaining, gameOver, paused, ready, tilt]);

  const statusMessage = status.overlay;
  const bannerStatus = status.banner;

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="w-full max-w-xl rounded-lg border border-slate-700/60 bg-slate-900/60 p-4 text-xs text-slate-200 shadow-inner">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
              Flippers
            </h3>
            <label className="flex flex-col gap-2">
              <span className="text-[11px] uppercase tracking-wide text-slate-400">
                Strength
              </span>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={flipperPower}
                onChange={(event) =>
                  setFlipperPower(parseFloat(event.target.value))
                }
                aria-label="Flipper strength"
                className="w-full accent-amber-400"
              />
            </label>
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
              Bounce
            </h3>
            <label className="flex flex-col gap-2">
              <span className="text-[11px] uppercase tracking-wide text-slate-400">
                Elasticity
              </span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={bounce}
                onChange={(event) => setBounce(parseFloat(event.target.value))}
                aria-label="Table elasticity"
                className="w-full accent-sky-400"
              />
            </label>
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
              Launch
            </h3>
            <label className="flex flex-col gap-2">
              <span className="text-[11px] uppercase tracking-wide text-slate-400">
                Power
              </span>
              <input
                type="range"
                min="0.4"
                max="1.4"
                step="0.05"
                value={launchPower}
                onChange={(event) =>
                  setLaunchPower(parseFloat(event.target.value))
                }
                aria-label="Launch power"
                className="w-full accent-emerald-400"
              />
            </label>
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-3 text-xs text-slate-300 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex items-center gap-2">
            <span className="text-[11px] uppercase tracking-wide text-slate-400">
              Theme
            </span>
            <select
              value={theme}
              onChange={(event) =>
                setTheme(event.target.value as keyof typeof themes)
              }
              className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs capitalize text-slate-100 shadow"
            >
              {Object.keys(themes).map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <span className="text-[11px] text-slate-400">
            Tune the table physics to match your style.
          </span>
        </div>
      </div>
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={constants.WIDTH}
          height={constants.HEIGHT}
          aria-label="Pinball playfield"
          className="border"
        />
        <div className="absolute top-3 left-3 rounded bg-[var(--kali-overlay)] px-2 py-1 font-mono text-xs text-[var(--kali-text)]">
          Balls: {ballsRemaining}
        </div>
        <div className="absolute top-3 left-1/2 -translate-x-1/2 font-mono text-2xl text-[var(--kali-text)]">
          {formatScore(score)}
        </div>
        <div className="absolute top-12 left-1/2 -translate-x-1/2 font-mono text-xs tracking-widest text-[color-mix(in_srgb,var(--kali-text)_85%,transparent)]">
          HI {formatScore(highScore)}
        </div>
        <div className="absolute top-3 right-3 flex flex-col items-end space-y-2">
          <div>{overlay}</div>
          <button
            type="button"
            onClick={handleLaunch}
            disabled={!ballLocked || ballsRemaining <= 0 || paused || tilt || gameOver}
            className="rounded bg-[var(--kali-control-overlay)] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--kali-text)] transition hover:bg-[color-mix(in_srgb,var(--kali-control)_30%,var(--kali-control-overlay))] disabled:opacity-40"
          >
            Launch Ball
          </button>
        </div>
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center text-center text-[var(--kali-text)]">
          <div className="rounded bg-[color-mix(in_srgb,var(--kali-overlay)_92%,transparent)] px-3 py-2 text-sm text-[var(--kali-text)] shadow-lg">
            {statusMessage}
          </div>
          {!gameOver && !tilt && (
            <div className="mt-2 rounded bg-[color-mix(in_srgb,var(--kali-overlay)_78%,transparent)] px-2 py-1 text-xs uppercase tracking-wide text-[color-mix(in_srgb,var(--kali-text)_85%,transparent)]">
              Space to launch • N / RB to nudge
            </div>
          )}
        </div>
        {tilt && (
          <div className="absolute inset-0 flex items-center justify-center bg-[color-mix(in_srgb,var(--game-color-danger)_42%,var(--kali-bg))]">
            <div className="rounded border-4 border-[color-mix(in_srgb,var(--game-color-danger)_70%,#f8fafc)] bg-[color-mix(in_srgb,var(--game-color-danger)_48%,var(--color-surface))] px-6 py-3 text-4xl font-bold text-white shadow-lg">
              TILT
            </div>
          </div>
        )}
      </div>
      <div
        className={`w-full max-w-xl rounded-lg border px-4 py-3 transition-colors ${bannerStatus.toneClass}`}
        data-testid="pinball-status-banner"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="block text-[11px] uppercase tracking-wide opacity-75">
              Ball
            </span>
            <span className="text-sm font-semibold sm:text-base">
              {bannerStatus.ball}
            </span>
          </div>
          <div>
            <span className="block text-[11px] uppercase tracking-wide opacity-75">
              Tilt
            </span>
            <span className={`text-sm font-semibold sm:text-base ${bannerStatus.tiltTone}`}>
              {bannerStatus.tiltLabel}
            </span>
          </div>
          <div className="sm:flex-1">
            <span className="block text-[11px] uppercase tracking-wide opacity-75">
              Objective
            </span>
            <span className="text-sm font-medium sm:text-base">
              {bannerStatus.objective}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
