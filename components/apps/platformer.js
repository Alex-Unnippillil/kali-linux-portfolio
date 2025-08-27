import React, { useEffect, useRef, useState } from 'react';
import usePersistentState from '../usePersistentState';
import {
  Player,
  updatePhysics,
  collectCoin,
  movePlayer,
} from '../../public/apps/platformer/engine.js';

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

  const [levels, setLevels] = useState([]);
  const [levelData, setLevelData] = useState(null);
  const [paused, setPaused] = useState(false);
  const [sound, setSound] = useState(true);

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

    const keys = {};
    const handleDown = (e) => {
      keys[e.code] = true;
      if (e.code === 'KeyP') setPaused((p) => !p);
    };
    const handleUp = (e) => {
      keys[e.code] = false;
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
      const input = {
        left: keys['ArrowLeft'],
        right: keys['ArrowRight'],
        jump: keys['Space'],
      };
      updatePhysics(player, input, dt);
      movePlayer(player, tiles, TILE_SIZE, dt);

      // fall out of world
      if (player.y > levelData.height * TILE_SIZE) respawn();

      const cx = Math.floor((player.x + player.w / 2) / TILE_SIZE);
      const cy = Math.floor((player.y + player.h / 2) / TILE_SIZE);

      if (collectCoin(tiles, cx, cy)) {
        score++;
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
  }, [levelData, paused, sound, setProgress]);

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
    </div>
  );
};

export default Platformer;

