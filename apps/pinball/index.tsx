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
const BALL_SAVER_MS = 6000;
const MULTIPLIER_MS = 10000;
const TILT_LOCKOUT_MS = 3000;
const NUDGE_WINDOW_MS = 3000;
const NUDGE_COOLDOWN_MS = 500;
const MAX_NUDGES = 3;

type HitType = "bumper" | "sling" | "target" | "lane" | "flipper";
type LaneSide = "left" | "right";

type PinballProps = {
  context?: {
    isFocused?: boolean;
    windowId?: string;
  };
  isFocused?: boolean;
  windowId?: string;
};

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

const hitLabelMap: Record<HitType, string> = {
  bumper: "Bumper",
  sling: "Sling",
  target: "Target",
  lane: "Lane",
  flipper: "Flipper",
};

const hitToneMap: Record<HitType, number> = {
  bumper: 880,
  sling: 720,
  target: 1040,
  lane: 620,
  flipper: 540,
};

const isEditableTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") {
    return true;
  }
  return Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
};

export default function Pinball(props: PinballProps = {}) {
  const { context, isFocused: isFocusedProp } = props;
  const resolvedFocus = isFocusedProp ?? context?.isFocused;
  const isFocused = typeof resolvedFocus === "boolean" ? resolvedFocus : true;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<PinballWorld | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const [theme, setTheme] = useState<keyof typeof themes>("classic");
  const [flipperPower, setFlipperPower] = useState(1);
  const [bounce, setBounce] = useState(0.5);
  const [tilt, setTilt] = useState(false);
  const [nudgeCount, setNudgeCount] = useState(0);
  const [score, setScore] = useState(0);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [ready, setReady] = useState(false);
  const [ballsRemaining, setBallsRemaining] = useState(MAX_BALLS);
  const [ballLocked, setBallLocked] = useState(true);
  const [gameOver, setGameOver] = useState(false);
  const [launchPower, setLaunchPower] = useState(0.8);
  const [laneProgress, setLaneProgress] = useState<{ left: boolean; right: boolean }>({
    left: false,
    right: false,
  });
  const [multiplier, setMultiplier] = useState(1);
  const [multiplierEndsAt, setMultiplierEndsAt] = useState(0);
  const [ballSaverActive, setBallSaverActive] = useState(false);
  const [ballSaverEndsAt, setBallSaverEndsAt] = useState(0);
  const [ballSaveFlash, setBallSaveFlash] = useState(false);
  const [lastHit, setLastHit] = useState<{
    label: string;
    points: number;
    type: HitType;
  } | null>(null);
  const [now, setNow] = useState(Date.now());
  const [leftPressed, setLeftPressed] = useState(false);
  const [rightPressed, setRightPressed] = useState(false);
  const nudgesRef = useRef<number[]>([]);
  const lastNudgeRef = useRef(0);
  const tiltTimeoutRef = useRef<number | null>(null);
  const ballSaverTimeoutRef = useRef<number | null>(null);
  const ballSaveFlashTimeoutRef = useRef<number | null>(null);
  const multiplierTimeoutRef = useRef<number | null>(null);
  const lastHitTimeoutRef = useRef<number | null>(null);
  const ballSaverActiveRef = useRef(false);
  const multiplierRef = useRef(1);
  const { getHighScore, setHighScore } = useGamePersistence("pinball");
  const [highScore, setHighScoreState] = useState(0);
  const scoreHandlerRef = useRef<
    (value: number, meta?: { type?: HitType; lane?: LaneSide }) => void
  >(() => {});
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

  useEffect(() => {
    ballSaverActiveRef.current = ballSaverActive;
  }, [ballSaverActive]);

  useEffect(() => {
    multiplierRef.current = multiplier;
  }, [multiplier]);

  useEffect(() => {
    return () => {
      if (tiltTimeoutRef.current) window.clearTimeout(tiltTimeoutRef.current);
      if (ballSaverTimeoutRef.current) {
        window.clearTimeout(ballSaverTimeoutRef.current);
      }
      if (ballSaveFlashTimeoutRef.current) {
        window.clearTimeout(ballSaveFlashTimeoutRef.current);
      }
      if (multiplierTimeoutRef.current) {
        window.clearTimeout(multiplierTimeoutRef.current);
      }
      if (lastHitTimeoutRef.current) {
        window.clearTimeout(lastHitTimeoutRef.current);
      }
      const audioContext = audioCtxRef.current;
      if (audioContext && typeof audioContext.close === "function") {
        audioContext.close().catch(() => undefined);
      }
    };
  }, []);

  const handleTilt = useCallback(() => {
    setTilt(true);
    setNudgeCount(0);
    nudgesRef.current = [];
    if (tiltTimeoutRef.current) {
      window.clearTimeout(tiltTimeoutRef.current);
    }
    tiltTimeoutRef.current = window.setTimeout(() => {
      setTilt(false);
      nudgesRef.current = [];
      setNudgeCount(0);
    }, TILT_LOCKOUT_MS);
  }, []);

  const playScoreSound = useCallback((type: HitType = "bumper") => {
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
      oscillator.frequency.setValueAtTime(hitToneMap[type] ?? 880, ctx.currentTime);
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

  const clearMultiplier = useCallback(() => {
    setMultiplier(1);
    setMultiplierEndsAt(0);
  }, []);

  const activateMultiplier = useCallback(() => {
    setMultiplier(2);
    const expiresAt = Date.now() + MULTIPLIER_MS;
    setMultiplierEndsAt(expiresAt);
    if (multiplierTimeoutRef.current) {
      window.clearTimeout(multiplierTimeoutRef.current);
    }
    multiplierTimeoutRef.current = window.setTimeout(() => {
      clearMultiplier();
      setLaneProgress({ left: false, right: false });
    }, MULTIPLIER_MS);
  }, [clearMultiplier]);

  const handleScore = useCallback(
    (
      value: number,
      meta?: { type?: HitType; lane?: LaneSide },
    ) => {
      const applied = Math.round(value * multiplierRef.current);
      setScore((prev) => prev + applied);
      const type = meta?.type ?? "bumper";
      playScoreSound(type);
      setLastHit({
        label: hitLabelMap[type],
        points: applied,
        type,
      });
      if (lastHitTimeoutRef.current) {
        window.clearTimeout(lastHitTimeoutRef.current);
      }
      lastHitTimeoutRef.current = window.setTimeout(() => {
        setLastHit(null);
      }, 1500);
      if (type === "lane" && meta?.lane) {
        setLaneProgress((prev) => {
          const lane = meta.lane;
          if (!lane) return prev;
          const next = { ...prev, [lane]: true };
          if (next.left && next.right && multiplierRef.current === 1) {
            activateMultiplier();
            return { left: false, right: false };
          }
          return next;
        });
      }
    },
    [activateMultiplier, playScoreSound],
  );

  useEffect(() => {
    scoreHandlerRef.current = handleScore;
  }, [handleScore]);

  const handleBallLost = useCallback(() => {
    if (ballSaverActiveRef.current) {
      setBallLocked(true);
      worldRef.current?.resetFlippers();
      worldRef.current?.resetBall();
      setBallSaverActive(false);
      setBallSaverEndsAt(0);
      if (ballSaverTimeoutRef.current) {
        window.clearTimeout(ballSaverTimeoutRef.current);
        ballSaverTimeoutRef.current = null;
      }
      setBallSaveFlash(true);
      if (ballSaveFlashTimeoutRef.current) {
        window.clearTimeout(ballSaveFlashTimeoutRef.current);
        ballSaveFlashTimeoutRef.current = null;
      }
      ballSaveFlashTimeoutRef.current = window.setTimeout(() => {
        setBallSaveFlash(false);
      }, 1500);
      return;
    }
    setBallsRemaining((prev) => {
      const next = Math.max(prev - 1, 0);
      if (next <= 0) {
        setGameOver(true);
      }
      return next;
    });
    setBallLocked(true);
    setBallSaverActive(false);
    setBallSaverEndsAt(0);
    if (ballSaverTimeoutRef.current) {
      window.clearTimeout(ballSaverTimeoutRef.current);
      ballSaverTimeoutRef.current = null;
    }
    worldRef.current?.resetFlippers();
    worldRef.current?.resetBall();
  }, []);

  useEffect(() => {
    ballLostHandlerRef.current = handleBallLost;
  }, [handleBallLost]);

  const tiltEnabled = isFocused && !paused && !gameOver;

  useTiltSensor(25, handleTilt, tiltEnabled);

  useEffect(() => {
    if (!canvasRef.current) return undefined;

    const world = createPinballWorld(
      canvasRef.current,
      {
        onScore: (value, meta) => {
          scoreHandlerRef.current(value, meta);
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
    setBallSaverActive(false);
    setBallSaverEndsAt(0);
    setMultiplier(1);
    setLaneProgress({ left: false, right: false });
    setNudgeCount(0);
    setLastHit(null);
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

  const handleNudge = useCallback(() => {
    const now = Date.now();
    nudgesRef.current = nudgesRef.current.filter(
      (t) => now - t < NUDGE_WINDOW_MS,
    );
    nudgesRef.current.push(now);
    setNudgeCount(nudgesRef.current.length);
    worldRef.current?.nudge({ x: 0.02, y: 0 });
    if (nudgesRef.current.length >= MAX_NUDGES) {
      handleTilt();
    }
  }, [handleTilt]);

  const tryNudge = useCallback(() => {
    if (tilt || paused || gameOver || !isFocused) return;
    const now = Date.now();
    if (now - lastNudgeRef.current < NUDGE_COOLDOWN_MS) return;
    lastNudgeRef.current = now;
    handleNudge();
  }, [tilt, paused, gameOver, isFocused, handleNudge]);

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
    setBallSaverActive(true);
    setBallSaveFlash(false);
    const expiresAt = Date.now() + BALL_SAVER_MS;
    setBallSaverEndsAt(expiresAt);
    if (ballSaverTimeoutRef.current) {
      window.clearTimeout(ballSaverTimeoutRef.current);
    }
    ballSaverTimeoutRef.current = window.setTimeout(() => {
      setBallSaverActive(false);
      setBallSaverEndsAt(0);
    }, BALL_SAVER_MS);
  }, [ballLocked, ballsRemaining, paused, tilt, gameOver, launchPower]);

  const engageLeftFlipper = useCallback(() => {
    worldRef.current?.setLeftFlipper((-Math.PI / 4) * flipperPower);
    setLeftPressed(true);
  }, [flipperPower]);

  const releaseLeftFlipper = useCallback(() => {
    worldRef.current?.setLeftFlipper(constants.DEFAULT_LEFT_ANGLE);
    setLeftPressed(false);
  }, []);

  const engageRightFlipper = useCallback(() => {
    worldRef.current?.setRightFlipper((Math.PI / 4) * flipperPower);
    setRightPressed(true);
  }, [flipperPower]);

  const releaseRightFlipper = useCallback(() => {
    worldRef.current?.setRightFlipper(constants.DEFAULT_RIGHT_ANGLE);
    setRightPressed(false);
  }, []);

  useEffect(() => {
    if (!isFocused) {
      releaseLeftFlipper();
      releaseRightFlipper();
    }
  }, [isFocused, releaseLeftFlipper, releaseRightFlipper]);

  useEffect(() => {
    if (paused || tilt || gameOver) {
      releaseLeftFlipper();
      releaseRightFlipper();
    }
  }, [paused, tilt, gameOver, releaseLeftFlipper, releaseRightFlipper]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (!isFocused || paused || gameOver) return;
      if (isEditableTarget(event.target)) return;
      if (tilt) return;
      if (event.code === "ArrowLeft") {
        event.preventDefault();
        engageLeftFlipper();
      } else if (event.code === "ArrowRight") {
        event.preventDefault();
        engageRightFlipper();
      } else if (event.code === "KeyN") {
        event.preventDefault();
        tryNudge();
      } else if (event.code === "Space") {
        event.preventDefault();
        handleLaunch();
      }
    },
    [
      isFocused,
      paused,
      gameOver,
      tilt,
      engageLeftFlipper,
      engageRightFlipper,
      tryNudge,
      handleLaunch,
    ],
  );

  const handleKeyUp = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (!isFocused) return;
      if (isEditableTarget(event.target)) return;
      if (event.code === "ArrowLeft") {
        event.preventDefault();
        releaseLeftFlipper();
      } else if (event.code === "ArrowRight") {
        event.preventDefault();
        releaseRightFlipper();
      }
    },
    [isFocused, releaseLeftFlipper, releaseRightFlipper],
  );

  useEffect(() => {
    if (!isFocused) return undefined;
    let frame = 0;
    let lastLaunch = false;
    let lastNudge = false;
    let lastLeft = false;
    let lastRight = false;
    const poll = () => {
      const gp = navigator.getGamepads ? navigator.getGamepads()[0] : null;
      if (!gp || paused || gameOver) {
        if (lastLeft) releaseLeftFlipper();
        if (lastRight) releaseRightFlipper();
        lastLeft = false;
        lastRight = false;
      } else {
        const leftPressed = gp.buttons[6]?.pressed || gp.buttons[4]?.pressed;
        const rightPressed = gp.buttons[7]?.pressed || gp.buttons[5]?.pressed;
        const launchPressed = gp.buttons[0]?.pressed;
        const nudgePressed = gp.buttons[1]?.pressed;

        if (leftPressed && !lastLeft && !tilt) {
          engageLeftFlipper();
        }
        if (!leftPressed && lastLeft) {
          releaseLeftFlipper();
        }
        if (rightPressed && !lastRight && !tilt) {
          engageRightFlipper();
        }
        if (!rightPressed && lastRight) {
          releaseRightFlipper();
        }
        if (launchPressed && !lastLaunch) {
          handleLaunch();
        }
        if (nudgePressed && !lastNudge) {
          tryNudge();
        }

        lastLeft = Boolean(leftPressed);
        lastRight = Boolean(rightPressed);
        lastLaunch = Boolean(launchPressed);
        lastNudge = Boolean(nudgePressed);
      }
      frame = requestAnimationFrame(poll);
    };
    frame = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(frame);
  }, [
    isFocused,
    paused,
    gameOver,
    tilt,
    tryNudge,
    handleLaunch,
    engageLeftFlipper,
    engageRightFlipper,
    releaseLeftFlipper,
    releaseRightFlipper,
  ]);

  const isRunning = ready && !paused && !gameOver && isFocused;

  useGameLoop(
    (delta) => {
      worldRef.current?.step(delta);
    },
    isRunning,
  );

  useEffect(() => {
    if (!multiplierEndsAt && !ballSaverEndsAt) return;
    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 250);
    return () => window.clearInterval(interval);
  }, [multiplierEndsAt, ballSaverEndsAt]);

  const multiplierRemaining = Math.max(0, multiplierEndsAt - now);
  const ballSaverRemaining = Math.max(0, ballSaverEndsAt - now);

  const resetGame = useCallback(() => {
    setScore(0);
    worldRef.current?.resetBall();
    worldRef.current?.resetFlippers();
    setTilt(false);
    setNudgeCount(0);
    nudgesRef.current = [];
    setBallsRemaining(MAX_BALLS);
    setBallLocked(true);
    setGameOver(false);
    setPaused(false);
    setBallSaverActive(false);
    setBallSaverEndsAt(0);
    setBallSaveFlash(false);
    clearMultiplier();
    setLaneProgress({ left: false, right: false });
    setLastHit(null);
    setLeftPressed(false);
    setRightPressed(false);
    if (ballSaverTimeoutRef.current) {
      window.clearTimeout(ballSaverTimeoutRef.current);
      ballSaverTimeoutRef.current = null;
    }
    if (ballSaveFlashTimeoutRef.current) {
      window.clearTimeout(ballSaveFlashTimeoutRef.current);
      ballSaveFlashTimeoutRef.current = null;
    }
    if (multiplierTimeoutRef.current) {
      window.clearTimeout(multiplierTimeoutRef.current);
      multiplierTimeoutRef.current = null;
    }
    if (lastHitTimeoutRef.current) {
      window.clearTimeout(lastHitTimeoutRef.current);
      lastHitTimeoutRef.current = null;
    }
    if (tiltTimeoutRef.current) {
      window.clearTimeout(tiltTimeoutRef.current);
      tiltTimeoutRef.current = null;
    }
  }, [clearMultiplier]);

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
    const saverSeconds = ballSaverRemaining ? Math.ceil(ballSaverRemaining / 1000) : 0;
    const multiplierSeconds = multiplierRemaining
      ? Math.ceil(multiplierRemaining / 1000)
      : 0;
    const saverLabel = ballSaverActive
      ? `Active (${saverSeconds}s)`
      : "Idle";
    const multiplierLabel =
      multiplier > 1 ? `${multiplier}x (${multiplierSeconds}s)` : "1x";
    const nudgeLabel = tilt ? "Locked" : `${nudgeCount}/${MAX_NUDGES}`;

    if (!ready) {
      return {
        overlay: "Booting table...",
        banner: {
          toneClass: tonePalette.warning.banner,
          ball: "Booting",
          objective: "Initializing table systems.",
          tiltLabel: "Calibrating…",
          tiltTone: tonePalette.warning.label,
          saverLabel: "Warmup",
          saverTone: tonePalette.warning.label,
          multiplierLabel: "1x",
          multiplierTone: tonePalette.warning.label,
          nudgeLabel: "0/3",
          nudgeTone: tonePalette.warning.label,
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
          saverLabel: "Offline",
          saverTone: tonePalette.danger.label,
          multiplierLabel: "1x",
          multiplierTone: tonePalette.danger.label,
          nudgeLabel: "Locked",
          nudgeTone: tonePalette.danger.label,
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
          saverLabel: saverLabel,
          saverTone: tonePalette.danger.label,
          multiplierLabel: multiplierLabel,
          multiplierTone: tonePalette.danger.label,
          nudgeLabel,
          nudgeTone: tonePalette.danger.label,
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
          saverLabel,
          saverTone: tonePalette.warning.label,
          multiplierLabel,
          multiplierTone: tonePalette.warning.label,
          nudgeLabel,
          nudgeTone: tonePalette.warning.label,
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
        saverLabel,
        saverTone: ballSaverActive ? tonePalette.success.label : tonePalette.warning.label,
        multiplierLabel,
        multiplierTone: multiplier > 1 ? tonePalette.success.label : tonePalette.warning.label,
        nudgeLabel,
        nudgeTone: tonePalette.warning.label,
      },
    } as const;
  }, [
    ballLocked,
    ballsRemaining,
    ballSaverActive,
    ballSaverRemaining,
    gameOver,
    multiplier,
    multiplierRemaining,
    nudgeCount,
    paused,
    ready,
    tilt,
  ]);

  const statusMessage = ballSaveFlash
    ? "Ball saved! Launch again to keep the run alive."
    : status.overlay;
  const bannerStatus = status.banner;
  const controlsDisabled = paused || tilt || gameOver || !isFocused;
  const launchDisabled = !ballLocked || ballsRemaining <= 0 || controlsDisabled;

  const handlePlayfieldPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (isEditableTarget(event.target)) return;
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (target?.closest("button, input, select, textarea")) return;
      containerRef.current?.focus({ preventScroll: true });
    },
    [containerRef],
  );

  return (
    <div className="flex flex-col items-center space-y-4" data-testid="pinball-root">
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
      <div className="w-full max-w-xl rounded-lg border border-slate-700/60 bg-slate-950/70 p-4 text-xs text-slate-200 shadow-inner">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
          How to play
        </h3>
        <ul className="mt-2 space-y-1 text-xs text-slate-300">
          <li>
            Left/Right arrows (or touch flippers) to flip, Space or Launch to
            serve, N or gamepad B to nudge.
          </li>
          <li>Light both lanes to earn 2x scoring for 10 seconds.</li>
          <li>Ball saver protects the first drain for a few seconds after launch.</li>
        </ul>
      </div>
      <div className="w-full max-w-xl rounded-lg border border-slate-700/60 bg-slate-950/70 p-4 text-xs text-slate-200 shadow-inner">
        <div className="grid gap-3 sm:grid-cols-4">
          <div>
            <span className="block text-[11px] uppercase tracking-wide text-slate-400">
              Score
            </span>
            <span className="font-mono text-lg text-slate-100" data-testid="pinball-score">
              {formatScore(score)}
            </span>
          </div>
          <div>
            <span className="block text-[11px] uppercase tracking-wide text-slate-400">
              Balls
            </span>
            <span className="text-sm font-semibold text-slate-100" data-testid="pinball-balls">
              {ballsRemaining}
            </span>
          </div>
          <div>
            <span className="block text-[11px] uppercase tracking-wide text-slate-400">
              High Score
            </span>
            <span className="font-mono text-sm text-slate-100" data-testid="pinball-high-score">
              {formatScore(highScore)}
            </span>
          </div>
          <div>
            <span className="block text-[11px] uppercase tracking-wide text-slate-400">
              Multiplier
            </span>
            <span
              className={`text-sm font-semibold ${multiplier > 1 ? "text-emerald-300" : "text-slate-100"}`}
              data-testid="pinball-multiplier"
            >
              {multiplier > 1
                ? `${multiplier}x (${Math.ceil(multiplierRemaining / 1000)}s)`
                : "1x"}
            </span>
          </div>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div>
            <span className="block text-[11px] uppercase tracking-wide text-slate-400">
              Ball saver
            </span>
            <span
              className={`text-sm font-semibold ${ballSaverActive ? "text-emerald-300" : "text-slate-100"}`}
              data-testid="pinball-ball-saver"
            >
              {ballSaverActive
                ? `Active (${Math.ceil(ballSaverRemaining / 1000)}s)`
                : "Idle"}
            </span>
          </div>
          <div>
            <span className="block text-[11px] uppercase tracking-wide text-slate-400">
              Nudges
            </span>
            <span className="text-sm font-semibold text-slate-100">
              {tilt ? "Locked" : `${nudgeCount}/${MAX_NUDGES}`}
            </span>
          </div>
          <div>
            <span className="block text-[11px] uppercase tracking-wide text-slate-400">
              Last hit
            </span>
            <span className="text-sm font-semibold text-slate-100" aria-live="polite">
              {lastHit ? `${lastHit.label} +${lastHit.points}` : "—"}
            </span>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] uppercase tracking-wide text-slate-400">
          <div className="flex items-center gap-2" aria-label="Lane lights status">
            <span
              className={`h-2 w-2 rounded-full ${laneProgress.left ? "bg-emerald-400" : "bg-slate-600"}`}
              aria-hidden="true"
            />
            <span
              className={`h-2 w-2 rounded-full ${laneProgress.right ? "bg-emerald-400" : "bg-slate-600"}`}
              aria-hidden="true"
            />
            <span>Lanes</span>
          </div>
          <span>{isFocused ? "Focused" : "Click the table to focus"}</span>
        </div>
      </div>
      <div
        ref={containerRef}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        onPointerDown={handlePlayfieldPointerDown}
        aria-label="Pinball game area"
        data-testid="pinball-playfield"
        className="relative outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70"
      >
        <canvas
          ref={canvasRef}
          width={constants.WIDTH}
          height={constants.HEIGHT}
          aria-label="Pinball playfield"
          className="border"
        />
        <div className="absolute top-3 right-3 flex flex-col items-end space-y-2">
          <div>{overlay}</div>
          <button
            type="button"
            onClick={handleLaunch}
            disabled={launchDisabled}
            data-testid="pinball-launch-button"
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
      <div className="w-full max-w-xl rounded-lg border border-slate-700/60 bg-slate-950/70 p-4 text-xs text-slate-200 shadow-inner">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="block text-[11px] uppercase tracking-wide text-slate-400">
              Touch controls
            </span>
            <span className="text-xs text-slate-300">
              Use the buttons below on mobile or touch screens.
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <button
              type="button"
              onPointerDown={(event) => {
                event.preventDefault();
                engageLeftFlipper();
              }}
              onPointerUp={releaseLeftFlipper}
              onPointerLeave={releaseLeftFlipper}
              onPointerCancel={releaseLeftFlipper}
              disabled={controlsDisabled}
              aria-pressed={leftPressed}
              aria-label="Left flipper"
              className="rounded border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-100 transition hover:bg-slate-700 disabled:opacity-40"
            >
              Left
            </button>
            <button
              type="button"
              onPointerDown={(event) => {
                event.preventDefault();
                engageRightFlipper();
              }}
              onPointerUp={releaseRightFlipper}
              onPointerLeave={releaseRightFlipper}
              onPointerCancel={releaseRightFlipper}
              disabled={controlsDisabled}
              aria-pressed={rightPressed}
              aria-label="Right flipper"
              className="rounded border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-100 transition hover:bg-slate-700 disabled:opacity-40"
            >
              Right
            </button>
            <button
              type="button"
              onClick={handleLaunch}
              disabled={launchDisabled}
              aria-label="Launch ball"
              data-testid="pinball-launch-touch"
              className="rounded border border-emerald-400/40 bg-emerald-500/20 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-emerald-100 transition hover:bg-emerald-500/30 disabled:opacity-40"
            >
              Launch
            </button>
            <button
              type="button"
              onClick={tryNudge}
              disabled={controlsDisabled}
              aria-label="Nudge table"
              className="rounded border border-sky-400/40 bg-sky-500/20 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-sky-100 transition hover:bg-sky-500/30 disabled:opacity-40"
            >
              Nudge
            </button>
          </div>
        </div>
      </div>
      <div
        className={`w-full max-w-xl rounded-lg border px-4 py-3 transition-colors ${bannerStatus.toneClass}`}
        data-testid="pinball-status-banner"
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
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
          <div>
            <span className="block text-[11px] uppercase tracking-wide opacity-75">
              Saver
            </span>
            <span className={`text-sm font-semibold sm:text-base ${bannerStatus.saverTone}`}>
              {bannerStatus.saverLabel}
            </span>
          </div>
          <div>
            <span className="block text-[11px] uppercase tracking-wide opacity-75">
              Multiplier
            </span>
            <span className={`text-sm font-semibold sm:text-base ${bannerStatus.multiplierTone}`}>
              {bannerStatus.multiplierLabel}
            </span>
          </div>
          <div>
            <span className="block text-[11px] uppercase tracking-wide opacity-75">
              Nudges
            </span>
            <span className={`text-sm font-semibold sm:text-base ${bannerStatus.nudgeTone}`}>
              {bannerStatus.nudgeLabel}
            </span>
          </div>
        </div>
        <div className="mt-3">
          <span className="block text-[11px] uppercase tracking-wide opacity-75">
            Objective
          </span>
          <span className="text-sm font-medium sm:text-base">
            {bannerStatus.objective}
          </span>
        </div>
      </div>
    </div>
  );
}
