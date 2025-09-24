import React, { useEffect, useRef, useState } from 'react';
import usePersistentState from '../../hooks/usePersistentState';
import {
  Player,
  updatePhysics,
  collectCoin,
  movePlayer,
  physics,
} from '../../public/apps/platformer/engine.js';
import useInputMapping from './Games/common/input-remap/useInputMapping';

const TILE_SIZE = 16;

// simple beep for coin collection
function playCoinSound() {
  try {
    const ac = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.frequency.value = 800;
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.2);
    osc.stop(ac.currentTime + 0.2);
  } catch (e) {
    /* ignore */
  }
}

const Platformer = () => {
  const canvasRef = useRef(null);
  const resetRef = useRef(() => {});
  const reduceMotion = useRef(false);
  const [mapping] = useInputMapping('platformer', {
    left: 'ArrowLeft',
    right: 'ArrowRight',
    jump: 'Space',
    pause: 'p',
  });
  const mappingRef = useRef(mapping);
  useEffect(() => {
    mappingRef.current = mapping;
  }, [mapping]);
  const controlsRef = useRef({ left: false, right: false, jump: false });

  const [levels, setLevels] = useState([]);
  const [levelData, setLevelData] = useState(null);
  const [paused, setPaused] = useState(false);
  const [sound, setSound] = useState(true);
  const [ariaMsg, setAriaMsg] = useState('');

  const [progress, setProgress] = usePersistentState(
    'platformer-progress',
    {
      level: 0,
      checkpoint: null,
      highscore: 0,
    }
  );

  // load list of levels
  useEffect(() => {
    fetch('/apps/platformer/levels.json')
      .then((r) => r.json())
      .then((d) => setLevels(d.levels || []));
  }, []);

  // load current level data
  useEffect(() => {
    const path = levels[progress.level];
    if (!path) return;
    fetch(path)
      .then((r) => r.json())
      .then((data) => setLevelData(data));
  }, [levels, progress.level]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    reduceMotion.current = mq.matches;
    const handler = () => {
      reduceMotion.current = mq.matches;
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // main game loop
  useEffect(() => {
    if (!levelData) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    const player = new Player();
    let tiles = levelData.tiles.map((row) => row.slice());
    let spawn = progress.checkpoint || levelData.spawn;
    player.x = spawn.x;
    player.y = spawn.y;
    let score = 0;
    let wasOnGround = true;
    let particles = [];
    const bgLayers = [
      { speed: 15, stars: [] },
      { speed: 30, stars: [] },
    ];
    const bgOffsets = [0, 0];
    const genStars = (count) =>
      Array.from({ length: count }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2 + 1,
      }));
    bgLayers[0].stars = genStars(40);
    bgLayers[1].stars = genStars(20);

    const matches = (binding, event) => {
      if (!binding) return false;
      const normalized = binding.toLowerCase();
      const key = event.key.toLowerCase();
      const code = event.code?.toLowerCase?.() ?? '';
      if (normalized === key || normalized === code) return true;
      if (binding === ' ' && code === 'space') return true;
      if (binding === 'Space' && event.key === ' ') return true;
      return false;
    };

    const handleDown = (e) => {
      const map = mappingRef.current;
      let handled = false;
      if (matches(map.left, e)) {
        controlsRef.current.left = true;
        handled = true;
      }
      if (matches(map.right, e)) {
        controlsRef.current.right = true;
        handled = true;
      }
      if (matches(map.jump, e)) {
        controlsRef.current.jump = true;
        handled = true;
      }
      if (matches(map.pause, e)) {
        setPaused((p) => !p);
        handled = true;
      }
      if (handled) e.preventDefault();
    };
    const handleUp = (e) => {
      const map = mappingRef.current;
      if (matches(map.left, e)) controlsRef.current.left = false;
      if (matches(map.right, e)) controlsRef.current.right = false;
      if (matches(map.jump, e)) controlsRef.current.jump = false;
    };
    window.addEventListener('keydown', handleDown);
    window.addEventListener('keyup', handleUp);

    const respawn = () => {
      player.x = spawn.x;
      player.y = spawn.y;
      player.vx = player.vy = 0;
    };

    const reset = () => {
      tiles = levelData.tiles.map((row) => row.slice());
      spawn = levelData.spawn;
      score = 0;
      setProgress((p) => ({ ...p, checkpoint: null }));
      respawn();
    };
    resetRef.current = reset;

    let last = performance.now();
    let frame;
    const update = (dt) => {
      const input = { ...controlsRef.current };
      const vyBefore = player.vy;
      updatePhysics(player, input, dt);
      movePlayer(player, tiles, TILE_SIZE, dt);

      if (
        player.onGround &&
        !wasOnGround &&
        vyBefore > 200 &&
        !reduceMotion.current
      ) {
        for (let i = 0; i < 6; i++) {
          particles.push({
            x: player.x + player.w / 2,
            y: player.y + player.h,
            vx: (Math.random() - 0.5) * 100,
            vy: -Math.random() * 100,
            life: 0.3,
          });
        }
      }
      wasOnGround = player.onGround;

      if (!reduceMotion.current) {
        particles = particles
          .map((p) => ({
            ...p,
            life: p.life - dt,
            x: p.x + p.vx * dt,
            y: p.y + p.vy * dt,
            vy: p.vy + physics.GRAVITY * dt * 0.5,
          }))
          .filter((p) => p.life > 0);
        bgOffsets.forEach((o, i) => {
          bgOffsets[i] = (o + bgLayers[i].speed * dt) % canvas.width;
        });
      }

      // fall out of world
      if (player.y > levelData.height * TILE_SIZE) respawn();

      const cx = Math.floor((player.x + player.w / 2) / TILE_SIZE);
      const cy = Math.floor((player.y + player.h / 2) / TILE_SIZE);

      if (collectCoin(tiles, cx, cy)) {
        score++;
        setAriaMsg(`Score ${score}`);
        if (sound) playCoinSound();
        if (score > progress.highscore)
          setProgress((p) => ({ ...p, highscore: score }));
      }

      const tile = tiles[cy] && tiles[cy][cx];
      if (tile === 2) respawn(); // hazard tile
      if (tile === 6) {
        spawn = { x: cx * TILE_SIZE, y: cy * TILE_SIZE };
        tiles[cy][cx] = 0;
        setProgress((p) => ({ ...p, checkpoint: spawn }));
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      if (!reduceMotion.current) {
        bgLayers.forEach((layer, i) => {
          ctx.fillStyle = i === 0 ? '#111' : '#222';
          layer.stars.forEach((star) => {
            const x = (star.x - bgOffsets[i] + canvas.width) % canvas.width;
            ctx.fillRect(x, star.y, star.size, star.size);
          });
        });
      }
      for (let y = 0; y < levelData.height; y++) {
        for (let x = 0; x < levelData.width; x++) {
          const t = tiles[y][x];
          const sx = x * TILE_SIZE;
          const sy = y * TILE_SIZE;
          if (t === 1) {
            ctx.fillStyle = '#666';
            ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);
          } else if (t === 5) {
            ctx.fillStyle = 'gold';
            ctx.fillRect(sx + 4, sy + 4, TILE_SIZE - 8, TILE_SIZE - 8);
          } else if (t === 2) {
            ctx.fillStyle = 'red';
            ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);
          } else if (t === 6) {
            ctx.fillStyle = 'green';
            ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);
          }
        }
      }
      ctx.fillStyle = 'white';
      ctx.fillRect(player.x, player.y, player.w, player.h);
      if (!reduceMotion.current) {
        particles.forEach((p) => {
          ctx.globalAlpha = p.life / 0.3;
          ctx.fillRect(p.x, p.y, 4, 4);
          ctx.globalAlpha = 1;
        });
      }
      ctx.fillStyle = 'white';
      ctx.font = '12px monospace';
      ctx.fillText(`Score: ${score} Hi: ${progress.highscore || 0}`, 4, 12);
    };

    const loop = (ts) => {
      const dt = Math.min((ts - last) / 1000, 0.1);
      last = ts;
      if (!paused) update(dt);
      draw();
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('keydown', handleDown);
      window.removeEventListener('keyup', handleUp);
    };
  }, [levelData, paused, sound, setProgress, progress.checkpoint, progress.highscore]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') setPaused(true);
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  useEffect(() => {
    if (!canvasRef.current || typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) setPaused(true);
      },
      { threshold: 0.1 },
    );
    observer.observe(canvasRef.current);
    return () => observer.disconnect();
  }, []);

  const bindControl = (action) => ({
    onTouchStart: (e) => {
      e.preventDefault();
      controlsRef.current[action] = true;
    },
    onTouchEnd: () => {
      controlsRef.current[action] = false;
    },
    onTouchCancel: () => {
      controlsRef.current[action] = false;
    },
    onMouseDown: (e) => {
      e.preventDefault();
      controlsRef.current[action] = true;
    },
    onMouseUp: () => {
      controlsRef.current[action] = false;
    },
    onMouseLeave: () => {
      controlsRef.current[action] = false;
    },
  });

  const levelPath = levels[progress.level];
  if (!levelPath)
    return (
      <div className="w-full h-full flex items-center justify-center">
        All levels complete!
      </div>
    );

  return (
    <div className="w-full h-full relative bg-black">
      <canvas
        ref={canvasRef}
        width={levelData ? levelData.width * TILE_SIZE : 320}
        height={levelData ? levelData.height * TILE_SIZE : 160}
        className="w-full h-full"
      />
      <div className="absolute top-1 left-1 flex gap-2 text-xs">
        <button
          onClick={() => setPaused((p) => !p)}
          className="px-1 bg-gray-700 text-white"
        >
          {paused ? 'Resume' : 'Pause'}
        </button>
        <button
          onClick={() => resetRef.current && resetRef.current()}
          className="px-1 bg-gray-700 text-white"
        >
          Reset
        </button>
        <button
          onClick={() => setSound((s) => !s)}
          className="px-1 bg-gray-700 text-white"
        >
          Sound: {sound ? 'On' : 'Off'}
        </button>
      </div>
      <div className="absolute bottom-4 left-1/2 flex gap-3 md:hidden transform -translate-x-1/2">
        <button
          type="button"
          aria-label="Move left"
          className="w-12 h-12 rounded-full bg-gray-700 bg-opacity-80 text-white text-xl"
          {...bindControl('left')}
        >
          ◀
        </button>
        <button
          type="button"
          aria-label="Jump"
          className="w-12 h-12 rounded-full bg-gray-700 bg-opacity-80 text-white text-sm"
          {...bindControl('jump')}
        >
          Jump
        </button>
        <button
          type="button"
          aria-label="Move right"
          className="w-12 h-12 rounded-full bg-gray-700 bg-opacity-80 text-white text-xl"
          {...bindControl('right')}
        >
          ▶
        </button>
      </div>
      <div aria-live="polite" className="sr-only">{ariaMsg}</div>
    </div>
  );
};

export default Platformer;

