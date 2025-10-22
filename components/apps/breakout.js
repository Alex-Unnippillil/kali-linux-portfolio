"use client";

import React, { useRef, useEffect, useState, useCallback } from 'react';
import seedrandom from 'seedrandom';
import GameLayout from './GameLayout';
import useCanvasResize from '../../hooks/useCanvasResize';
import BreakoutEditor from './breakoutEditor';
import BreakoutLevels from './breakoutLevels';

const WIDTH = 400;
const HEIGHT = 300;
const HUD_HEIGHT = 20;
const PADDLE_WIDTH = WIDTH * 0.15;
const PADDLE_HEIGHT = HEIGHT * 0.033;
const PADDLE_Y = HEIGHT - PADDLE_HEIGHT * 2;
const BALL_RADIUS = 5;
const ROWS = 5;
const COLS = 10;
const BRICK_WIDTH = WIDTH / COLS;
const BRICK_HEIGHT = HEIGHT * 0.05;
const DEFAULT_LAYOUT = Array.from({ length: ROWS }, () => Array(COLS).fill(1));
const TRAIL_LENGTH = 12;
const PADDLE_BOUNCE_FRAMES = 18;
const MAGNET_DURATION = 420;
const PARTICLE_COUNT = 18;
const PARTICLE_LIFE = 28;
const HIGHSCORE_KEY = 'breakout:high-score';
const POWER_LABELS = {
  magnet: 'Magnet Grip',
  multi: 'Multi-ball',
};

const BRICK_STYLES = {
  1: {
    colors: ['#38bdf8', '#0ea5e9', '#2563eb'],
    glow: 'rgba(56,189,248,0.55)',
    particleColor: 'rgba(56,189,248,0.55)',
    value: 120,
  },
  2: {
    colors: ['#f472b6', '#a855f7', '#7c3aed'],
    glow: 'rgba(168,85,247,0.6)',
    particleColor: 'rgba(244,114,182,0.55)',
    value: 200,
  },
  3: {
    colors: ['#facc15', '#f97316', '#fb923c'],
    glow: 'rgba(250,204,21,0.55)',
    particleColor: 'rgba(249,115,22,0.55)',
    value: 160,
  },
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const createBricks = (layout) => {
  const bricks = [];
  for (let r = 0; r < layout.length; r += 1) {
    for (let c = 0; c < layout[r].length; c += 1) {
      const type = layout[r][c];
      if (type > 0) {
        bricks.push({
          x: c * BRICK_WIDTH + 2,
          y: HUD_HEIGHT + r * (BRICK_HEIGHT + 3) + 2,
          w: BRICK_WIDTH - 4,
          h: BRICK_HEIGHT,
          type,
          alive: true,
        });
      }
    }
  }
  return bricks;
};

const Breakout = () => {
  const canvasRef = useCanvasResize(WIDTH, HEIGHT);
  const paddleX = useRef(WIDTH / 2 - PADDLE_WIDTH / 2);
  const ballsRef = useRef([]);
  const bricksRef = useRef([]);
  const levelRef = useRef(DEFAULT_LAYOUT);
  const magnetRef = useRef(0);
  const animationRef = useRef(0);
  const particlesRef = useRef([]);
  const paddleBounceRef = useRef(0);
  const livesRef = useRef(3);
  const levelNumRef = useRef(1);
  const scoreRef = useRef(0);
  const highScoreRef = useRef(0);
  const pausedRef = useRef(false);
  const powerStateRef = useRef({ magnet: false, multi: false });

  const [selecting, setSelecting] = useState(true);
  const [paused, setPaused] = useState(false);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [powerUps, setPowerUps] = useState([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(HIGHSCORE_KEY);
    if (stored) {
      const value = Number(stored);
      if (!Number.isNaN(value) && value > 0) {
        highScoreRef.current = value;
        setHighScore(value);
      }
    }
  }, []);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  const dispatchTogglePause = useCallback(() => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new Event('game-layout:toggle-pause'));
  }, []);

  const dispatchSetPause = useCallback((value) => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('game-layout:set-pause', { detail: value }));
  }, []);

  const updatePowerUps = useCallback(() => {
    const next = {
      magnet: magnetRef.current > 0,
      multi: ballsRef.current.length > 1,
    };
    if (
      next.magnet !== powerStateRef.current.magnet ||
      next.multi !== powerStateRef.current.multi
    ) {
      powerStateRef.current = next;
      const labels = [];
      if (next.magnet) labels.push(POWER_LABELS.magnet);
      if (next.multi) labels.push(POWER_LABELS.multi);
      setPowerUps(labels);
    }
  }, []);

  const resetBallToPaddle = useCallback(() => {
    const baseX = WIDTH / 2;
    paddleX.current = WIDTH / 2 - PADDLE_WIDTH / 2;
    ballsRef.current = [
      {
        x: baseX,
        y: PADDLE_Y - BALL_RADIUS * 1.5,
        vx: 0,
        vy: -3,
        stuck: true,
        offset: PADDLE_WIDTH / 2,
        trail: [],
      },
    ];
  }, []);

  const spawnParticles = useCallback((x, y, style) => {
    const palette = style || {};
    const color = palette.particleColor || 'rgba(148,163,255,0.55)';
    for (let i = 0; i < PARTICLE_COUNT; i += 1) {
      const angle = (Math.PI * 2 * i) / PARTICLE_COUNT + Math.random() * 0.4;
      const speed = 1.5 + Math.random() * 1.8;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: PARTICLE_LIFE,
        maxLife: PARTICLE_LIFE,
        color,
      });
    }
    if (particlesRef.current.length > 600) {
      particlesRef.current.splice(0, particlesRef.current.length - 600);
    }
  }, []);

  const startLevel = useCallback(
    (layout, options = {}) => {
      const { fresh = false } = options;
      const grid = layout || levelRef.current || DEFAULT_LAYOUT;
      levelRef.current = grid;
      bricksRef.current = createBricks(grid);
      magnetRef.current = 0;
      particlesRef.current = [];
      powerStateRef.current = { magnet: false, multi: false };
      if (fresh) {
        livesRef.current = 3;
        levelNumRef.current = 1;
        scoreRef.current = 0;
        setLives(3);
        setLevel(1);
        setScore(0);
      } else {
        setLives(livesRef.current);
        setLevel(levelNumRef.current);
        setScore(scoreRef.current);
      }
      resetBallToPaddle();
      updatePowerUps();
      setSelecting(false);
    },
    [resetBallToPaddle, updatePowerUps],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || selecting) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    const releaseBalls = () => {
      if (pausedRef.current) return;
      ballsRef.current.forEach((ball) => {
        if (ball.stuck) {
          ball.stuck = false;
          const horizontal = ball.vx || (Math.random() - 0.5) * 4;
          ball.vx = clamp(horizontal, -3.6, 3.6);
          ball.vy = -Math.abs(ball.vy || 3);
        }
      });
    };

    const handleMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      paddleX.current = clamp(x - PADDLE_WIDTH / 2, 0, WIDTH - PADDLE_WIDTH);
    };

    const handleKey = (e) => {
      const active = document.activeElement;
      const isTyping =
        active &&
        (active.tagName === 'INPUT' ||
          active.tagName === 'TEXTAREA' ||
          active.isContentEditable);
      if (isTyping) return;
      if (e.key === 'ArrowLeft') {
        paddleX.current = clamp(paddleX.current - 18, 0, WIDTH - PADDLE_WIDTH);
      } else if (e.key === 'ArrowRight') {
        paddleX.current = clamp(paddleX.current + 18, 0, WIDTH - PADDLE_WIDTH);
      } else if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        releaseBalls();
      } else if (e.key.toLowerCase() === 'p') {
        e.preventDefault();
        dispatchTogglePause();
      }
    };

    const handleClick = () => releaseBalls();

    const draw = () => {
      ctx.clearRect(0, 0, WIDTH, HEIGHT);
      const bg = ctx.createLinearGradient(0, 0, 0, HEIGHT);
      bg.addColorStop(0, '#020617');
      bg.addColorStop(1, '#0f172a');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      if (!pausedRef.current && magnetRef.current > 0) {
        magnetRef.current = Math.max(0, magnetRef.current - 1);
      }
      if (!pausedRef.current && paddleBounceRef.current > 0) {
        paddleBounceRef.current -= 1;
      }

      updatePowerUps();

      bricksRef.current.forEach((br) => {
        if (!br.alive) return;
        const style = BRICK_STYLES[br.type] || BRICK_STYLES[1];
        ctx.save();
        const gradient = ctx.createLinearGradient(br.x, br.y, br.x, br.y + br.h);
        gradient.addColorStop(0, style.colors[0]);
        gradient.addColorStop(0.5, style.colors[1]);
        gradient.addColorStop(1, style.colors[2]);
        ctx.shadowColor = style.glow;
        ctx.shadowBlur = 14;
        ctx.fillStyle = gradient;
        ctx.fillRect(br.x, br.y, br.w, br.h);
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(br.x, br.y, br.w, br.h * 0.2);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = 'rgba(15,23,42,0.4)';
        ctx.strokeRect(br.x + 0.5, br.y + 0.5, br.w - 1, br.h - 1);
        ctx.restore();
      });

      const nextParticles = [];
      particlesRef.current.forEach((particle) => {
        const p = { ...particle };
        if (!pausedRef.current) {
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.04;
          p.life -= 1;
        }
        if (p.life > 0) {
          const alpha = p.life / p.maxLife;
          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 1.5 + alpha * 2.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          nextParticles.push(p);
        }
      });
      particlesRef.current = nextParticles;

      ctx.save();
      const bounceProgress = paddleBounceRef.current / PADDLE_BOUNCE_FRAMES;
      const scaleY = 1 + Math.sin(bounceProgress * Math.PI) * 0.35;
      ctx.translate(paddleX.current + PADDLE_WIDTH / 2, PADDLE_Y + PADDLE_HEIGHT / 2);
      ctx.scale(1, scaleY);
      const paddleGrad = ctx.createLinearGradient(-PADDLE_WIDTH / 2, 0, PADDLE_WIDTH / 2, 0);
      paddleGrad.addColorStop(0, '#38bdf8');
      paddleGrad.addColorStop(0.5, '#60a5fa');
      paddleGrad.addColorStop(1, '#a855f7');
      ctx.fillStyle = paddleGrad;
      ctx.shadowColor = 'rgba(96,165,250,0.6)';
      ctx.shadowBlur = 18;
      ctx.fillRect(-PADDLE_WIDTH / 2, -PADDLE_HEIGHT / 2, PADDLE_WIDTH, PADDLE_HEIGHT);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(-PADDLE_WIDTH / 2, -PADDLE_HEIGHT / 2, PADDLE_WIDTH, PADDLE_HEIGHT * 0.3);
      ctx.restore();

      const remainingBalls = [];
      let lostBallThisFrame = false;

      ballsRef.current.forEach((ball) => {
        if (ball.stuck) {
          ball.x = clamp(paddleX.current + ball.offset, BALL_RADIUS, WIDTH - BALL_RADIUS);
          ball.y = PADDLE_Y - BALL_RADIUS * 1.5;
          ball.trail = [];
        } else if (!pausedRef.current) {
          ball.trail.push({ x: ball.x, y: ball.y });
          if (ball.trail.length > TRAIL_LENGTH) ball.trail.shift();
          ball.x += ball.vx;
          ball.y += ball.vy;
        }

        if (!ball.stuck && !pausedRef.current) {
          if (ball.x <= BALL_RADIUS || ball.x >= WIDTH - BALL_RADIUS) {
            ball.vx *= -1;
            ball.x = clamp(ball.x, BALL_RADIUS, WIDTH - BALL_RADIUS);
          }
          if (ball.y <= HUD_HEIGHT + BALL_RADIUS) {
            ball.vy = Math.abs(ball.vy);
            ball.y = HUD_HEIGHT + BALL_RADIUS;
          }

          if (
            ball.vy > 0 &&
            ball.y >= PADDLE_Y - BALL_RADIUS &&
            ball.y <= PADDLE_Y + PADDLE_HEIGHT &&
            ball.x >= paddleX.current - BALL_RADIUS &&
            ball.x <= paddleX.current + PADDLE_WIDTH + BALL_RADIUS
          ) {
            const offsetRatio =
              (ball.x - (paddleX.current + PADDLE_WIDTH / 2)) / (PADDLE_WIDTH / 2);
            ball.vx = clamp(offsetRatio * 4.2, -4.8, 4.8);
            ball.vy = -Math.abs(ball.vy);
            paddleBounceRef.current = PADDLE_BOUNCE_FRAMES;
            spawnParticles(ball.x, PADDLE_Y, {
              particleColor: 'rgba(96,165,250,0.45)',
            });
            if (magnetRef.current > 0) {
              ball.stuck = true;
              ball.offset = clamp(ball.x - paddleX.current, BALL_RADIUS, PADDLE_WIDTH - BALL_RADIUS);
            }
          }
        }

        if (!ball.stuck && !pausedRef.current) {
          for (const br of bricksRef.current) {
            if (!br.alive) continue;
            if (
              ball.x > br.x - BALL_RADIUS &&
              ball.x < br.x + br.w + BALL_RADIUS &&
              ball.y > br.y - BALL_RADIUS &&
              ball.y < br.y + br.h + BALL_RADIUS
            ) {
              br.alive = false;
              ball.vy *= -1;
              const style = BRICK_STYLES[br.type] || BRICK_STYLES[1];
              spawnParticles(ball.x, ball.y, style);
              scoreRef.current += style.value || 100;
              setScore(scoreRef.current);
              if (scoreRef.current > highScoreRef.current) {
                highScoreRef.current = scoreRef.current;
                setHighScore(highScoreRef.current);
                if (typeof window !== 'undefined') {
                  window.localStorage.setItem(HIGHSCORE_KEY, String(highScoreRef.current));
                }
              }
              if (br.type === 2) {
                ballsRef.current.push({
                  x: ball.x,
                  y: ball.y,
                  vx: -(ball.vx || 2.5),
                  vy: ball.vy,
                  stuck: false,
                  offset: 0,
                  trail: [],
                });
              } else if (br.type === 3) {
                magnetRef.current = MAGNET_DURATION;
              }
              break;
            }
          }
        }

        ball.trail.forEach((point, index) => {
          const alpha = (index + 1) / ball.trail.length;
          ctx.save();
          ctx.globalAlpha = alpha * 0.35;
          ctx.fillStyle = 'rgba(148,163,255,0.85)';
          ctx.beginPath();
          ctx.arc(point.x, point.y, BALL_RADIUS * 0.9, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        });

        ctx.save();
        ctx.shadowColor = 'rgba(148,163,255,0.85)';
        ctx.shadowBlur = 16;
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        if (ball.y > HEIGHT + BALL_RADIUS * 2) {
          lostBallThisFrame = true;
        } else {
          remainingBalls.push(ball);
        }
      });

      ballsRef.current = remainingBalls;

      if (!pausedRef.current && lostBallThisFrame && remainingBalls.length === 0) {
        livesRef.current -= 1;
        setLives(livesRef.current);
        if (livesRef.current > 0) {
          resetBallToPaddle();
          updatePowerUps();
        } else {
          livesRef.current = 3;
          levelNumRef.current = 1;
          scoreRef.current = 0;
          setLives(3);
          setLevel(1);
          setScore(0);
          startLevel(levelRef.current, { fresh: true });
        }
      }

      if (
        !pausedRef.current &&
        bricksRef.current.length > 0 &&
        bricksRef.current.every((br) => !br.alive)
      ) {
        levelNumRef.current += 1;
        setLevel(levelNumRef.current);
        const currentLayout = levelRef.current;
        startLevel(currentLayout, { fresh: false });
        ballsRef.current.forEach((ball) => {
          if (!ball.stuck) {
            ball.vx *= 1.05;
            ball.vy *= 1.05;
          }
        });
        animationRef.current = requestAnimationFrame(draw);
        return;
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    canvas.addEventListener('mousemove', handleMove);
    canvas.addEventListener('click', handleClick);
    window.addEventListener('keydown', handleKey);
    animationRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animationRef.current);
      canvas.removeEventListener('mousemove', handleMove);
      canvas.removeEventListener('click', handleClick);
      window.removeEventListener('keydown', handleKey);
    };
    }, [canvasRef, selecting, dispatchTogglePause, resetBallToPaddle, spawnParticles, startLevel, updatePowerUps]);

  const handleSelect = useCallback(
    (layout) => {
      startLevel(layout, { fresh: true });
      dispatchSetPause(false);
    },
    [dispatchSetPause, startLevel],
  );

  const resumeGame = useCallback(() => dispatchSetPause(false), [dispatchSetPause]);

  const restartRun = useCallback(() => {
    startLevel(levelRef.current, { fresh: true });
    dispatchSetPause(false);
  }, [dispatchSetPause, startLevel]);

  return (
    <GameLayout
      gameId="breakout"
      stage={level}
      lives={lives}
      score={score}
      highScore={highScore}
      editor={<BreakoutEditor onLoad={handleSelect} />}
      onPauseChange={setPaused}
      showHud={false}
    >
      {selecting && <BreakoutLevels onSelect={handleSelect} />}
      <div className="relative h-full w-full">
        <canvas
          ref={canvasRef}
          className="h-full w-full rounded-xl bg-black shadow-inner"
          aria-label="Breakout playfield"
        />
        <div className="pointer-events-none absolute inset-0">
          {powerUps.length > 0 && (
            <div className="absolute top-4 left-1/2 flex -translate-x-1/2 gap-3">
              {powerUps.map((label) => (
                <span
                  key={label}
                  className="rounded-full border border-cyan-200/40 bg-cyan-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-cyan-100 shadow-lg backdrop-blur"
                >
                  {label}
                </span>
              ))}
            </div>
          )}
          <div className="absolute top-4 left-4 flex flex-col gap-2 text-xs text-slate-100">
            <div className="w-max rounded-lg border border-sky-400/40 bg-sky-500/20 px-3 py-1 font-mono text-[0.75rem] tracking-widest text-sky-100 shadow-md backdrop-blur">
              Stage {level.toString().padStart(2, '0')}
            </div>
            <div className="flex items-center gap-2">
              <span className="uppercase tracking-wide text-slate-300">Lives</span>
              <div className="flex gap-1">
                {Array.from({ length: 3 }).map((_, idx) => (
                  <span
                    key={idx}
                    className={
                      idx < lives
                        ? 'h-3 w-3 rounded-full bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.7)]'
                        : 'h-3 w-3 rounded-full bg-slate-600/60'
                    }
                  />
                ))}
              </div>
            </div>
            <div className="rounded-lg border border-slate-500/40 bg-slate-900/60 px-3 py-1 font-mono text-[0.75rem] tracking-widest shadow-md backdrop-blur">
              Score {score.toString().padStart(5, '0')}
            </div>
            <div className="rounded-lg border border-amber-200/40 bg-amber-500/10 px-3 py-1 font-mono text-[0.75rem] tracking-widest text-amber-100 shadow-md backdrop-blur">
              High {highScore.toString().padStart(5, '0')}
            </div>
          </div>
          <div className="absolute bottom-4 left-4 flex flex-col gap-1 rounded-lg border border-slate-600/40 bg-slate-900/70 px-3 py-2 text-[0.7rem] text-slate-200 shadow-md backdrop-blur">
            <div className="flex items-center gap-2">
              <span className="rounded bg-slate-800/70 px-2 py-0.5 font-mono">← →</span>
              <span>Move paddle</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-slate-800/70 px-2 py-0.5 font-mono">Mouse</span>
              <span>Glide to aim</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-slate-800/70 px-2 py-0.5 font-mono">Space / Click</span>
              <span>Launch ball</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-slate-800/70 px-2 py-0.5 font-mono">P</span>
              <span>Pause menu</span>
            </div>
          </div>
          {paused && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm">
              <div className="pointer-events-auto w-72 rounded-3xl border border-slate-600/40 bg-slate-900/90 p-6 text-slate-100 shadow-2xl">
                <h2 className="text-lg font-semibold tracking-wide">Paused</h2>
                <p className="mt-1 text-xs text-slate-300">
                  Take a breather, adjust your aim, then dive back in.
                </p>
                <div className="mt-5 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={resumeGame}
                    className="rounded-full bg-sky-500/80 px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-sky-500"
                  >
                    Resume
                  </button>
                  <button
                    type="button"
                    onClick={restartRun}
                    className="rounded-full border border-slate-500/50 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-400/80 hover:bg-slate-800"
                  >
                    Restart Stage
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </GameLayout>
  );
};

export default Breakout;

export const createRng = (seed) => (seed ? seedrandom(seed) : Math.random);
