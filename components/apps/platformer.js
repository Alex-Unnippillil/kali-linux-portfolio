import React, { useCallback, useEffect, useRef, useState } from 'react';
import GameLayout from './GameLayout';
import { Overlay, useGameLoop } from './Games/common';
import usePersistentState from '../../hooks/usePersistentState';
import usePrefersReducedMotion from '../../hooks/usePrefersReducedMotion';
import {
  Player,
  updatePhysics,
  collectCoin,
  movePlayer,
  physics,
  countCoins,
  cloneTiles,
} from '../../public/apps/platformer/engine.js';

const TILE_SIZE = 16;

const isEditableTarget = (target) => {
  if (!target) return false;
  const tag = target.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    target.isContentEditable ||
    target.getAttribute?.('role') === 'textbox'
  );
};

const createBackground = (width, height) => {
  const genStars = (count) =>
    Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 2 + 1,
    }));
  return {
    layers: [
      { speed: 15, stars: genStars(40) },
      { speed: 30, stars: genStars(20) },
    ],
    offsets: [0, 0],
  };
};

const normalizeLevelPath = (path) =>
  path.startsWith('/') ? path : `/apps/platformer/${path}`;

const getAudioContext = (ref) => {
  if (ref.current) return ref.current;
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return null;
  const ctx = new Ctor();
  ref.current = ctx;
  return ctx;
};

const playCoinSound = (ctxRef) => {
  try {
    const ctx = getAudioContext(ctxRef);
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 800;
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  } catch {
    // ignore audio errors
  }
};

const Platformer = () => {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const playerRef = useRef(new Player());
  const tilesRef = useRef([]);
  const spawnRef = useRef({ x: 0, y: 0 });
  const totalCoinsRef = useRef(0);
  const particlesRef = useRef([]);
  const wasOnGroundRef = useRef(true);
  const backgroundRef = useRef({ layers: [], offsets: [0, 0] });
  const keysRef = useRef({ left: false, right: false, jump: false });
  const levelRef = useRef(null);
  const levelsRef = useRef([]);
  const checkpointRef = useRef(null);
  const scoreRef = useRef(0);
  const highScoreRef = useRef(0);
  const completedRef = useRef(false);
  const audioCtxRef = useRef(null);

  const prefersReducedMotion = usePrefersReducedMotion();

  const [levels, setLevels] = useState([]);
  const [levelData, setLevelData] = useState(null);
  const [loadingLevel, setLoadingLevel] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [score, setScore] = useState(0);
  const [ariaMsg, setAriaMsg] = useState('');
  const [gameFinished, setGameFinished] = useState(false);

  const [progress, setProgress] = usePersistentState(
    'platformer-progress',
    () => ({
      level: 0,
      checkpoint: null,
      highscore: 0,
    }),
  );

  useEffect(() => {
    levelsRef.current = levels;
  }, [levels]);

  useEffect(() => {
    checkpointRef.current = progress.checkpoint || null;
  }, [progress.checkpoint]);

  useEffect(() => {
    highScoreRef.current = progress.highscore || 0;
  }, [progress.highscore]);

  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  useEffect(() => {
    let cancelled = false;
    fetch('/apps/platformer/levels.json')
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data.levels) ? data.levels : [];
        setLevels(list);
      })
      .catch(() => {
        if (!cancelled) setLevels([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!levels.length) return;
    setProgress((prev) => {
      if (prev.level < levels.length) return prev;
      return { ...prev, level: Math.max(0, levels.length - 1), checkpoint: null };
    });
  }, [levels, setProgress]);

  useEffect(() => {
    const path = levels[progress.level];
    if (!path) {
      levelRef.current = null;
      setLevelData(null);
      return;
    }
    let cancelled = false;
    setLoadingLevel(true);
    setLoadError('');
    fetch(normalizeLevelPath(path))
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load level');
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        levelRef.current = data;
        setLevelData(data);
        setGameFinished(false);
      })
      .catch(() => {
        if (cancelled) return;
        setLoadError('Failed to load level data.');
        levelRef.current = null;
        setLevelData(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingLevel(false);
      });
    return () => {
      cancelled = true;
    };
  }, [levels, progress.level]);

  const prepareLevel = useCallback(
    (data, { preserveCheckpoint = true } = {}) => {
      const canvas = canvasRef.current;
      if (!data || !canvas) return;

      const nextSpawn =
        preserveCheckpoint && checkpointRef.current
          ? checkpointRef.current
          : data.spawn;

      if (!preserveCheckpoint) {
        checkpointRef.current = null;
        setProgress((prev) => ({ ...prev, checkpoint: null }));
      }

      spawnRef.current = { x: nextSpawn.x, y: nextSpawn.y };

      const player = playerRef.current;
      player.x = spawnRef.current.x;
      player.y = spawnRef.current.y;
      player.vx = 0;
      player.vy = 0;
      player.onGround = false;
      player.coyoteTimer = 0;
      player.jumpBufferTimer = 0;

      tilesRef.current = cloneTiles(data.tiles || []);
      totalCoinsRef.current = countCoins(tilesRef.current);
      scoreRef.current = 0;
      setScore(0);
      setAriaMsg('');
      wasOnGroundRef.current = true;
      particlesRef.current = [];
      completedRef.current = false;
      setGameFinished(false);
      setPaused(false);

      const levelWidth = (data.width || (data.tiles?.[0]?.length || 0)) * TILE_SIZE;
      const levelHeight = (data.height || data.tiles?.length || 0) * TILE_SIZE;
      canvas.width = levelWidth;
      canvas.height = levelHeight;
      ctxRef.current = canvas.getContext('2d');
      backgroundRef.current = createBackground(levelWidth || TILE_SIZE, levelHeight || TILE_SIZE);
    },
    [setProgress],
  );

  useEffect(() => {
    if (!levelData) return;
    prepareLevel(levelData);
  }, [levelData, prepareLevel]);

  const respawn = useCallback(() => {
    const player = playerRef.current;
    const spawn = spawnRef.current;
    player.x = spawn.x;
    player.y = spawn.y;
    player.vx = 0;
    player.vy = 0;
    player.onGround = false;
    player.coyoteTimer = 0;
    player.jumpBufferTimer = 0;
  }, []);

  const mutedRef = useRef(muted);
  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  const updateHighScore = useCallback(
    (value) => {
      if (value <= highScoreRef.current) return;
      highScoreRef.current = value;
      setProgress((prev) => {
        if ((prev.highscore || 0) >= value) return prev;
        return { ...prev, highscore: value };
      });
    },
    [setProgress],
  );

  const advanceLevel = useCallback(() => {
    let finished = false;
    setProgress((prev) => {
      const high = Math.max(prev.highscore || 0, scoreRef.current);
      const nextLevel = prev.level + 1;
      if (nextLevel >= levelsRef.current.length) {
        finished = true;
        return { ...prev, highscore: high };
      }
      return { ...prev, level: nextLevel, checkpoint: null, highscore: high };
    });
    if (finished) {
      setGameFinished(true);
      setPaused(true);
    }
  }, [setProgress]);

  const update = useCallback(
    (dt) => {
      const data = levelRef.current;
      if (!data) return;

      const player = playerRef.current;
      const tiles = tilesRef.current;

      const vyBefore = player.vy;
      updatePhysics(player, keysRef.current, dt);
      movePlayer(player, tiles, TILE_SIZE, dt);

      if (
        player.onGround &&
        !wasOnGroundRef.current &&
        vyBefore > 200 &&
        !prefersReducedMotion
      ) {
        const px = player.x + player.w / 2;
        const py = player.y + player.h;
        for (let i = 0; i < 6; i += 1) {
          particlesRef.current.push({
            x: px,
            y: py,
            vx: (Math.random() - 0.5) * 100,
            vy: -Math.random() * 100,
            life: 0.3,
          });
        }
      }
      wasOnGroundRef.current = player.onGround;

      if (!prefersReducedMotion) {
        particlesRef.current = particlesRef.current
          .map((p) => ({
            ...p,
            life: p.life - dt,
            x: p.x + p.vx * dt,
            y: p.y + p.vy * dt,
            vy: p.vy + physics.GRAVITY * dt * 0.5,
          }))
          .filter((p) => p.life > 0);
        backgroundRef.current.layers.forEach((layer, index) => {
          const width = (data.width || tiles[0]?.length || 0) * TILE_SIZE || TILE_SIZE;
          const offset = backgroundRef.current.offsets[index] || 0;
          backgroundRef.current.offsets[index] = (offset + layer.speed * dt) % width;
        });
      }

      if (player.y > data.height * TILE_SIZE) {
        respawn();
        return;
      }

      const cx = Math.floor((player.x + player.w / 2) / TILE_SIZE);
      const cy = Math.floor((player.y + player.h / 2) / TILE_SIZE);

      if (collectCoin(tiles, cx, cy)) {
        scoreRef.current += 1;
        setScore(scoreRef.current);
        setAriaMsg(`Score ${scoreRef.current}`);
        if (!mutedRef.current) {
          playCoinSound(audioCtxRef);
        }
        updateHighScore(scoreRef.current);
        if (
          !completedRef.current &&
          totalCoinsRef.current > 0 &&
          scoreRef.current >= totalCoinsRef.current
        ) {
          completedRef.current = true;
          setAriaMsg('Level complete');
          advanceLevel();
        }
      }

      const tile = tiles[cy] && tiles[cy][cx];
      if (tile === 2) {
        respawn();
      } else if (tile === 6) {
        const newSpawn = { x: cx * TILE_SIZE, y: cy * TILE_SIZE };
        tiles[cy][cx] = 0;
        spawnRef.current = newSpawn;
        if (
          !checkpointRef.current ||
          checkpointRef.current.x !== newSpawn.x ||
          checkpointRef.current.y !== newSpawn.y
        ) {
          checkpointRef.current = newSpawn;
          setProgress((prev) => ({ ...prev, checkpoint: newSpawn }));
        }
        setAriaMsg('Checkpoint reached');
      }
    },
    [advanceLevel, prefersReducedMotion, respawn, setProgress, updateHighScore],
  );

  const draw = useCallback(() => {
    const ctx = ctxRef.current;
    const data = levelRef.current;
    if (!ctx || !data) return;

    const width = data.width * TILE_SIZE;
    const height = data.height * TILE_SIZE;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);

    if (!prefersReducedMotion) {
      backgroundRef.current.layers.forEach((layer, index) => {
        ctx.fillStyle = index === 0 ? '#111' : '#222';
        const offset = backgroundRef.current.offsets[index] || 0;
        layer.stars.forEach((star) => {
          const x = ((star.x - offset) % width + width) % width;
          ctx.fillRect(x, star.y, star.size, star.size);
        });
      });
    }

    const tiles = tilesRef.current;
    for (let y = 0; y < data.height; y += 1) {
      for (let x = 0; x < data.width; x += 1) {
        const t = tiles[y][x];
        if (!t) continue;
        const sx = x * TILE_SIZE;
        const sy = y * TILE_SIZE;
        if (t === 1) {
          ctx.fillStyle = '#4b5563';
          ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);
        } else if (t === 5) {
          ctx.fillStyle = '#facc15';
          ctx.fillRect(sx + 4, sy + 4, TILE_SIZE - 8, TILE_SIZE - 8);
        } else if (t === 2) {
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);
        } else if (t === 6) {
          ctx.fillStyle = '#22c55e';
          ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);
        }
      }
    }

    const player = playerRef.current;
    ctx.fillStyle = '#f9fafb';
    ctx.fillRect(player.x, player.y, player.w, player.h);

    if (!prefersReducedMotion) {
      ctx.fillStyle = '#a855f7';
      particlesRef.current.forEach((p) => {
        const alpha = Math.max(0, Math.min(1, p.life / 0.3));
        ctx.globalAlpha = alpha;
        ctx.fillRect(p.x, p.y, 4, 4);
      });
      ctx.globalAlpha = 1;
    }

    ctx.fillStyle = '#f9fafb';
    ctx.font = '12px monospace';
    ctx.fillText(`Score: ${scoreRef.current} Hi: ${highScoreRef.current}`, 4, 12);
  }, [prefersReducedMotion]);

  useGameLoop(
    (delta) => {
      if (!levelRef.current || !ctxRef.current) return;
      const dt = Math.min(delta, 0.1);
      if (!paused) update(dt);
      draw();
    },
    Boolean(levelData && !loadingLevel && !loadError),
  );

  const handleReset = useCallback(() => {
    if (!levelRef.current) return;
    prepareLevel(levelRef.current, { preserveCheckpoint: false });
    setAriaMsg('Level reset');
  }, [prepareLevel]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isEditableTarget(e.target)) return;
      if (e.code === 'ArrowLeft') keysRef.current.left = true;
      if (e.code === 'ArrowRight') keysRef.current.right = true;
      if (e.code === 'Space') {
        keysRef.current.jump = true;
        e.preventDefault();
      }
      if (e.code === 'KeyP') {
        e.preventDefault();
        setPaused((p) => !p);
      }
      if (e.code === 'KeyR') {
        e.preventDefault();
        handleReset();
      }
      if (e.code === 'KeyM') {
        e.preventDefault();
        setMuted((m) => !m);
      }
    };
    const handleKeyUp = (e) => {
      if (isEditableTarget(e.target)) return;
      if (e.code === 'ArrowLeft') keysRef.current.left = false;
      if (e.code === 'ArrowRight') keysRef.current.right = false;
      if (e.code === 'Space') keysRef.current.jump = false;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleReset]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') setPaused(true);
    };
    const handleBlur = () => setPaused(true);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('blur', handleBlur);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  useEffect(() => () => {
    const ctx = audioCtxRef.current;
    if (ctx?.close) {
      try {
        ctx.close();
      } catch {
        // ignore
      }
    }
  }, []);

  const stage = levels.length ? Math.min(progress.level + 1, levels.length) : undefined;
  const highScore = progress.highscore || 0;

  return (
    <GameLayout gameId="platformer" stage={stage} score={score} highScore={highScore}>
      <div className="relative h-full w-full bg-black text-white">
        <canvas
          ref={canvasRef}
          className="h-full w-full"
          role="img"
          aria-label="Platformer gameplay canvas"
        />
        <Overlay
          paused={paused}
          onPause={() => setPaused(true)}
          onResume={() => setPaused(false)}
          muted={muted}
          onToggleSound={setMuted}
        />
        <div className="absolute top-2 left-2 z-20 flex gap-2 text-xs">
          <button
            type="button"
            onClick={handleReset}
            className="rounded bg-gray-700 px-2 py-1"
            aria-label="Reset the current level to the starting checkpoint"
          >
            Reset Level
          </button>
        </div>
        {loadingLevel && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/70 text-sm">
            Loading level…
          </div>
        )}
        {loadError && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/70 px-4 text-center text-sm">
            {loadError}
          </div>
        )}
        {gameFinished && !loadingLevel && !loadError && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/70 px-4 text-center">
            <p className="text-lg font-semibold">All levels complete!</p>
            <p className="mt-2 text-sm">
              Reset progress to replay the campaign and chase a new high score.
            </p>
            <button
              type="button"
              className="mt-4 rounded bg-gray-700 px-3 py-2 text-sm"
              onClick={() => {
                setProgress((prev) => ({ ...prev, level: 0, checkpoint: null }));
                setGameFinished(false);
              }}
              aria-label="Restart the platformer campaign"
            >
              Restart Campaign
            </button>
          </div>
        )}
        <div aria-live="polite" className="sr-only">
          {ariaMsg}
        </div>
      </div>
    </GameLayout>
  );
};

export default Platformer;
