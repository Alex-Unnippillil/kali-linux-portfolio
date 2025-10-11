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

export default function Pinball() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const worldRef = useRef<PinballWorld | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const [theme, setTheme] = useState<keyof typeof themes>("classic");
  const [power, setPower] = useState(1);
  const [bounce, setBounce] = useState(0.5);
  const [tilt, setTilt] = useState(false);
  const [score, setScore] = useState(0);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [ready, setReady] = useState(false);
  const nudgesRef = useRef<number[]>([]);
  const lastNudgeRef = useRef(0);
  const { getHighScore, setHighScore } = useGamePersistence("pinball");
  const [highScore, setHighScoreState] = useState(0);
  const scoreHandlerRef = useRef<(value: number) => void>(() => {});
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

  useTiltSensor(25, handleTilt);

  useEffect(() => {
    if (!canvasRef.current) return undefined;

    const world = createPinballWorld(
      canvasRef.current,
      {
        onScore: (value) => {
          scoreHandlerRef.current(value);
        },
      },
      initialThemeRef.current,
      initialBounceRef.current,
    );
    worldRef.current = world;
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

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (tilt) return;
      if (event.code === "ArrowLeft") {
        worldRef.current?.setLeftFlipper((-Math.PI / 4) * power);
      } else if (event.code === "ArrowRight") {
        worldRef.current?.setRightFlipper((Math.PI / 4) * power);
      } else if (event.code === "KeyN") {
        tryNudge();
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === "ArrowLeft") {
        worldRef.current?.setLeftFlipper(constants.DEFAULT_LEFT_ANGLE);
      } else if (event.code === "ArrowRight") {
        worldRef.current?.setRightFlipper(constants.DEFAULT_RIGHT_ANGLE);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [power, tilt, tryNudge]);

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
    ready && !paused,
  );

  const resetGame = useCallback(() => {
    setScore(0);
    worldRef.current?.resetBall();
    worldRef.current?.resetFlippers();
    setTilt(false);
    nudgesRef.current = [];
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

  return (
    <div className="flex flex-col items-center space-y-2">
      <div className="flex space-x-4">
        <label className="flex flex-col text-xs">
          Power
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            value={power}
            onChange={(event) => setPower(parseFloat(event.target.value))}
          />
        </label>
        <label className="flex flex-col text-xs">
          Bounce
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={bounce}
            onChange={(event) => setBounce(parseFloat(event.target.value))}
          />
        </label>
        <label className="flex flex-col text-xs">
          Theme
          <select
            value={theme}
            onChange={(event) =>
              setTheme(event.target.value as keyof typeof themes)
            }
          >
            {Object.keys(themes).map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={constants.WIDTH}
          height={constants.HEIGHT}
          className="border"
        />
        <div className="absolute top-2 left-1/2 -translate-x-1/2 text-white font-mono text-xl">
          {formatScore(score)}
        </div>
        <div className="absolute top-10 left-1/2 -translate-x-1/2 text-white font-mono text-xs tracking-widest">
          HI {formatScore(highScore)}
        </div>
        {!tilt && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-white text-xs opacity-75">
            Press N or RB to nudge
          </div>
        )}
        {tilt && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-700/80">
            <div className="text-white font-bold text-4xl px-6 py-3 border-4 border-white rounded">
              TILT
            </div>
          </div>
        )}
        <div className="absolute top-2 right-2">{overlay}</div>
      </div>
    </div>
  );
}
