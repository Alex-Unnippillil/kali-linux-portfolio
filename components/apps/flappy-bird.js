import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import GameLayout from "./GameLayout";
import useGameLoop from "./Games/common/useGameLoop";
import useCanvasResize from "../../hooks/useCanvasResize";
import usePersistentState from "../../hooks/usePersistentState";
import useGameAudio from "../../hooks/useGameAudio";
import {
  BIRD_ASSETS,
  BIRD_SKINS,
  PIPE_SKINS,
} from "../../apps/games/flappy-bird/skins";
import { loadHighScores, recordScore } from "../../games/flappy-bird/storage";

const WIDTH = 400;
const HEIGHT = 300;
const BIRD_X = 80;
const BIRD_RADIUS = 12;
const PIPE_WIDTH = 52;
const GROUND_HEIGHT = 28;
const PIPE_SPEED = 130; // px per second
const JUMP_VELOCITY = -260; // px per second
const SPAWN_INTERVAL = 1.4; // seconds
const ANGLE_RECOVERY = 2.8; // radians per second toward downward tilt

const DIFFICULTIES = [
  { id: "easy", label: "Easy", gravity: 380, gap: 132 },
  { id: "normal", label: "Normal", gravity: 520, gap: 110 },
  { id: "hard", label: "Hard", gravity: 640, gap: 96 },
];

const DIFFICULTY_IDS = DIFFICULTIES.map((d) => d.id);

const toRgb = ([r, g, b]) => `rgb(${r}, ${g}, ${b})`;

const createInitialState = (gap) => ({
  birdY: HEIGHT / 2,
  birdVelocity: 0,
  birdAngle: 0,
  pipes: [],
  spawnTimer: SPAWN_INTERVAL * 0.5,
  gap,
});

const spawnPipe = (state) => {
  const margin = 48;
  const min = margin + state.gap / 2;
  const max = HEIGHT - GROUND_HEIGHT - margin - state.gap / 2;
  const gapY = min + Math.random() * Math.max(10, max - min);
  state.pipes.push({ x: WIDTH + PIPE_WIDTH, gapY, scored: false });
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const useBirdSprites = () => {
  const spritesRef = useRef([]);
  useEffect(() => {
    spritesRef.current = BIRD_ASSETS.map((src) => {
      const img = new Image();
      img.src = src;
      return img;
    });
  }, []);
  return spritesRef;
};

const FlappyBird = () => {
  const canvasRef = useCanvasResize(WIDTH, HEIGHT);
  const liveRef = useRef(null);
  const gameStateRef = useRef(createInitialState(DIFFICULTIES[1].gap));
  const scoreRef = useRef(0);
  const pausedRef = useRef(false);
  const runningRef = useRef(false);
  const gameOverRef = useRef(false);

  const birdSpritesRef = useBirdSprites();

  const [started, setStarted] = useState(false);
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [scores, setScores] = useState(() => loadHighScores());

  const [skin, setSkin] = usePersistentState(
    "flappy-bird:skin",
    0,
    (value) => typeof value === "number" && Number.isFinite(value),
  );
  const [pipeSkin, setPipeSkin] = usePersistentState(
    "flappy-bird:pipe",
    0,
    (value) => typeof value === "number" && Number.isFinite(value),
  );
  const [difficulty, setDifficulty] = usePersistentState(
    "flappy-bird:difficulty",
    "normal",
    (value) => typeof value === "string" && DIFFICULTY_IDS.includes(value),
  );

  const { context: audioContext, muted, setMuted, volume } = useGameAudio();

  const activeSettings = useMemo(() => {
    const fallback = DIFFICULTIES[1];
    return DIFFICULTIES.find((d) => d.id === difficulty) || fallback;
  }, [difficulty]);

  const highScore = scores[activeSettings.id];

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    runningRef.current = running;
  }, [running]);

  useEffect(() => {
    gameOverRef.current = gameOver;
  }, [gameOver]);

  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  const announce = useCallback((message) => {
    if (liveRef.current) liveRef.current.textContent = message;
  }, []);

  const playTone = useCallback(
    (frequency, duration = 0.18) => {
      if (!audioContext || muted) return;
      const ctx = audioContext;
      const gain = ctx.createGain();
      const osc = ctx.createOscillator();
      const now = ctx.currentTime;
      const baseVolume = volume ?? 1;
      gain.gain.setValueAtTime(Math.max(0.05, baseVolume * 0.25), now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      osc.frequency.value = frequency;
      osc.type = "sine";
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + duration);
    },
    [audioContext, muted, volume],
  );

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const state = gameStateRef.current;

    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    const grad = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    grad.addColorStop(0, "#4facfe");
    grad.addColorStop(1, "#00f2fe");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    const [pipeMain, pipeHighlight] =
      PIPE_SKINS[pipeSkin % PIPE_SKINS.length];
    ctx.fillStyle = toRgb(pipeMain);

    state.pipes.forEach((pipe) => {
      const gapTop = pipe.gapY - state.gap / 2;
      const gapBottom = pipe.gapY + state.gap / 2;
      ctx.fillStyle = toRgb(pipeMain);
      ctx.fillRect(pipe.x, 0, PIPE_WIDTH, gapTop);
      ctx.fillRect(
        pipe.x,
        gapBottom,
        PIPE_WIDTH,
        HEIGHT - gapBottom - GROUND_HEIGHT,
      );
      ctx.fillStyle = toRgb(pipeHighlight);
      ctx.fillRect(pipe.x, gapTop - 4, PIPE_WIDTH, 4);
      ctx.fillRect(pipe.x, gapBottom, PIPE_WIDTH, 4);
    });

    ctx.fillStyle = "#d8cfa6";
    ctx.fillRect(0, HEIGHT - GROUND_HEIGHT, WIDTH, GROUND_HEIGHT);

    const sprite = birdSpritesRef.current[skin % birdSpritesRef.current.length];
    ctx.save();
    ctx.translate(BIRD_X, state.birdY);
    ctx.rotate(state.birdAngle);
    if (sprite && sprite.complete) {
      ctx.drawImage(sprite, -BIRD_RADIUS, -BIRD_RADIUS, 24, 24);
    } else {
      ctx.fillStyle = "#facc15";
      ctx.beginPath();
      ctx.arc(0, 0, BIRD_RADIUS, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    if (gameOverRef.current) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.font = "24px sans-serif";
      ctx.fillText("Game Over", WIDTH / 2, HEIGHT / 2 - 10);
      ctx.font = "16px sans-serif";
      ctx.fillText("Press Space or tap to retry", WIDTH / 2, HEIGHT / 2 + 18);
    } else if (pausedRef.current) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.font = "18px sans-serif";
      ctx.fillText("Paused", WIDTH / 2, HEIGHT / 2);
    }
  }, [canvasRef, birdSpritesRef, pipeSkin, skin]);

  const handleGameOver = useCallback(() => {
    if (gameOverRef.current) return;
    gameOverRef.current = true;
    setGameOver(true);
    setRunning(false);
    announce(`Game over. Final score ${scoreRef.current}`);
    playTone(220, 0.3);
    setScores((prev) => {
      if (scoreRef.current > prev[activeSettings.id]) {
        return recordScore(activeSettings.id, scoreRef.current);
      }
      return prev;
    });
    draw();
  }, [activeSettings.id, announce, draw, playTone]);

  const stepGame = useCallback(
    (delta) => {
      const state = gameStateRef.current;
      state.spawnTimer += delta;
      if (state.spawnTimer >= SPAWN_INTERVAL) {
        state.spawnTimer -= SPAWN_INTERVAL;
        spawnPipe(state);
      }

      state.birdVelocity += activeSettings.gravity * delta;
      state.birdY += state.birdVelocity * delta;
      state.birdY = clamp(
        state.birdY,
        BIRD_RADIUS,
        HEIGHT - GROUND_HEIGHT - BIRD_RADIUS,
      );
      state.birdAngle = Math.min(
        state.birdAngle + ANGLE_RECOVERY * delta,
        0.6,
      );

      state.pipes = state.pipes
        .map((pipe) => ({ ...pipe, x: pipe.x - PIPE_SPEED * delta }))
        .filter((pipe) => pipe.x + PIPE_WIDTH > -10);

      state.pipes.forEach((pipe) => {
        if (!pipe.scored && pipe.x + PIPE_WIDTH < BIRD_X - BIRD_RADIUS) {
          pipe.scored = true;
          scoreRef.current += 1;
          setScore(scoreRef.current);
          announce(`Score ${scoreRef.current}`);
          playTone(720, 0.12);
        }
      });

      const collision = state.pipes.some((pipe) => {
        const withinPipe =
          BIRD_X + BIRD_RADIUS > pipe.x &&
          BIRD_X - BIRD_RADIUS < pipe.x + PIPE_WIDTH;
        if (!withinPipe) return false;
        const gapTop = pipe.gapY - state.gap / 2;
        const gapBottom = pipe.gapY + state.gap / 2;
        return (
          state.birdY - BIRD_RADIUS < gapTop ||
          state.birdY + BIRD_RADIUS > gapBottom
        );
      });

      if (
        collision ||
        state.birdY <= BIRD_RADIUS ||
        state.birdY >= HEIGHT - GROUND_HEIGHT - BIRD_RADIUS
      ) {
        handleGameOver();
        return;
      }

      draw();
    },
    [activeSettings.gravity, announce, draw, handleGameOver, playTone],
  );

  useGameLoop(stepGame, running && !paused && !gameOver);

  const resetState = useCallback(
    (settings) => {
      const next = createInitialState(settings.gap);
      gameStateRef.current = next;
      spawnPipe(next);
      scoreRef.current = 0;
      setScore(0);
      gameOverRef.current = false;
      setGameOver(false);
      pausedRef.current = false;
      setPaused(false);
      runningRef.current = false;
      setRunning(false);
      announce("Ready!");
      draw();
    },
    [announce, draw],
  );

  const startRun = useCallback(() => {
    resetState(activeSettings);
    setRunning(true);
    runningRef.current = true;
  }, [activeSettings, resetState]);

  const handleStart = useCallback(() => {
    setStarted(true);
    startRun();
  }, [startRun]);

  const flap = useCallback(() => {
    if (!started || !runningRef.current || pausedRef.current) return;
    const state = gameStateRef.current;
    state.birdVelocity = JUMP_VELOCITY;
    state.birdAngle = -0.45;
    playTone(540, 0.12);
  }, [playTone, started]);

  const handlePress = useCallback(() => {
    if (!started) return;
    if (gameOverRef.current) {
      startRun();
      return;
    }
    if (pausedRef.current) {
      setPaused(false);
      pausedRef.current = false;
      setRunning(true);
      runningRef.current = true;
      draw();
      return;
    }
    if (!runningRef.current) {
      setRunning(true);
      runningRef.current = true;
    }
    flap();
  }, [draw, flap, startRun, started]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const pointerHandler = (e) => {
      e.preventDefault();
      handlePress();
    };
    canvas.addEventListener("pointerdown", pointerHandler);
    return () => canvas.removeEventListener("pointerdown", pointerHandler);
  }, [canvasRef, handlePress]);

  useEffect(() => {
    if (!started) return undefined;
    const keyHandler = (e) => {
      if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") {
        e.preventDefault();
        handlePress();
      } else if (e.code === "KeyP") {
        e.preventDefault();
        if (gameOverRef.current) return;
        const nextPaused = !pausedRef.current;
        setPaused(nextPaused);
        pausedRef.current = nextPaused;
        if (!nextPaused) {
          setRunning(true);
          runningRef.current = true;
        } else {
          setRunning(false);
          runningRef.current = false;
        }
        announce(nextPaused ? "Paused" : "Resumed");
        draw();
      } else if (e.code === "KeyR") {
        e.preventDefault();
        startRun();
      } else if (e.code === "KeyM") {
        e.preventDefault();
        const nextMuted = !muted;
        setMuted(nextMuted);
        announce(nextMuted ? "Audio muted" : "Audio enabled");
      }
    };
    window.addEventListener("keydown", keyHandler);
    return () => window.removeEventListener("keydown", keyHandler);
  }, [announce, draw, handlePress, muted, setMuted, startRun, started]);

  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    draw();
  }, [pipeSkin, skin, draw]);

  useEffect(() => {
    resetState(activeSettings);
  }, [activeSettings, resetState]);

  return (
    <GameLayout
      gameId="flappy-bird"
      score={score}
      highScore={highScore}
    >
      <div className="relative h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white select-none">
        <div className="relative">
          <canvas
            ref={canvasRef}
            className="bg-black border border-gray-700"
            role="img"
            aria-label="Flappy Bird game"
          />
          {!started && (
            <div className="absolute inset-0 flex flex-col items-center justify-center space-y-4 bg-black bg-opacity-70">
              <div className="text-center space-y-2">
                <label className="flex flex-col items-center text-sm">
                  Bird Skin
                  <select
                    className="mt-1 rounded px-2 py-1 text-black"
                    value={skin}
                    onChange={(e) => setSkin(parseInt(e.target.value, 10))}
                  >
                    {BIRD_SKINS.map((name, index) => (
                      <option key={name} value={index}>
                        {name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col items-center text-sm">
                  Pipe Skin
                  <select
                    className="mt-1 rounded px-2 py-1 text-black"
                    value={pipeSkin}
                    onChange={(e) => setPipeSkin(parseInt(e.target.value, 10))}
                  >
                    {PIPE_SKINS.map((_, index) => (
                      <option key={index} value={index}>
                        {`Skin ${index + 1}`}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col items-center text-sm">
                  Difficulty
                  <select
                    className="mt-1 rounded px-2 py-1 text-black"
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                  >
                    {DIFFICULTIES.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <button
                type="button"
                className="px-6 py-2 rounded bg-gray-700 hover:bg-gray-600"
                onClick={handleStart}
              >
                Start
              </button>
            </div>
          )}
          {gameOver && started && (
            <div
              className="pointer-events-none absolute inset-0 flex items-center justify-center"
              aria-hidden="true"
            >
              <div className="rounded bg-black bg-opacity-50 px-4 py-2">
                <div className="text-lg font-semibold">Game Over</div>
                <div className="text-sm">Tap or press Space to try again</div>
              </div>
            </div>
          )}
          {paused && started && !gameOver && (
            <div
              className="pointer-events-none absolute inset-0 flex items-center justify-center"
              aria-hidden="true"
            >
              <div className="rounded bg-black bg-opacity-50 px-4 py-2">
                Paused
              </div>
            </div>
          )}
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            className="rounded bg-gray-700 px-3 py-1"
            onClick={() => {
              if (!started) {
                handleStart();
                return;
              }
              if (gameOver) {
                startRun();
                return;
              }
              const nextPaused = !pausedRef.current;
              setPaused(nextPaused);
              pausedRef.current = nextPaused;
              if (!nextPaused) {
                setRunning(true);
                runningRef.current = true;
                announce("Resumed");
              } else {
                setRunning(false);
                runningRef.current = false;
                announce("Paused");
              }
              draw();
            }}
          >
            {!started ? "Start" : gameOver ? "Retry" : paused ? "Resume" : "Pause"}
          </button>
          <button
            type="button"
            className="rounded bg-gray-700 px-3 py-1"
            onClick={() => {
              if (!started) return;
              startRun();
            }}
          >
            Reset
          </button>
          <button
            type="button"
            className="rounded bg-gray-700 px-3 py-1"
            onClick={() => {
              const nextMuted = !muted;
              setMuted(nextMuted);
              announce(nextMuted ? "Audio muted" : "Audio enabled");
            }}
          >
            {muted ? "Unmute" : "Mute"}
          </button>
        </div>
        <div ref={liveRef} className="sr-only" aria-live="polite" />
      </div>
    </GameLayout>
  );
};

export default FlappyBird;
