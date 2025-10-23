import React, { useEffect, useRef, useState } from 'react';
import usePersistentState from '../../hooks/usePersistentState';
import {
  Player,
  updatePhysics,
  collectCoin,
  movePlayer,
  physics,
} from '../../public/apps/platformer/engine.js';

const TILE_SIZE = 16;
const MAX_HEALTH = 3;
const COIN_TILE = 5;
const HAZARD_TILE = 2;
const CHECKPOINT_TILE = 6;
const HUD_REFRESH_INTERVAL = 0.15;

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
  const shakeRef = useRef({ duration: 0, intensity: 0, total: 0 });
  const overlayFlashRef = useRef(0);

  const [levels, setLevels] = useState([]);
  const [levelData, setLevelData] = useState(null);
  const [paused, setPaused] = useState(false);
  const [sound, setSound] = useState(true);
  const [ariaMsg, setAriaMsg] = useState('');
  const [tutorialDismissed, setTutorialDismissed] = usePersistentState(
    'platformer-tutorial-dismissed',
    false
  );
  const showTutorial = !tutorialDismissed;

  const [hud, setHud] = useState({
    coins: 0,
    totalCoins: 0,
    health: MAX_HEALTH,
    time: 0,
    score: 0,
  });

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
    if (levelData) {
      const totalCoins = levelData.tiles
        .flat()
        .filter((tile) => tile === COIN_TILE).length;
      setHud({
        coins: 0,
        totalCoins,
        health: MAX_HEALTH,
        time: 0,
        score: 0,
      });
    }
  }, [levelData]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    reduceMotion.current = mq.matches;
    const handler = () => {
      reduceMotion.current = mq.matches;
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

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
    let coinsCollected = 0;
    let health = MAX_HEALTH;
    let elapsed = 0;
    let hudTimer = 0;
    let wasOnGround = true;
    let particles = [];
    const bgLayers = [
      { speed: 8, sprites: [], color: '#060608' },
      { speed: 16, sprites: [], color: '#0a0d18' },
      { speed: 28, sprites: [], color: '#121f3b' },
    ];
    const bgOffsets = [0, 0, 0];
    const genSprites = (count, sizeRange) =>
      Array.from({ length: count }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size:
          Math.random() * (sizeRange.max - sizeRange.min) + sizeRange.min,
        twinkle: Math.random() * Math.PI * 2,
      }));
    bgLayers[0].sprites = genSprites(50, { min: 1, max: 2 });
    bgLayers[1].sprites = genSprites(35, { min: 2, max: 3 });
    bgLayers[2].sprites = genSprites(20, { min: 3, max: 5 });

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
      coinsCollected = 0;
      health = MAX_HEALTH;
      elapsed = 0;
      hudTimer = 0;
      setProgress((p) => ({ ...p, checkpoint: null }));
      respawn();
      setHud((prev) => ({
        ...prev,
        coins: 0,
        health: MAX_HEALTH,
        time: 0,
        score: 0,
      }));
    };
    resetRef.current = reset;

    let last = performance.now();
    let frame;
    const playerAnim = {
      state: 'idle',
      frame: 0,
      timer: 0,
      facing: 1,
    };
    const floatingTexts = [];
    const ambientEmbers = Array.from({ length: 20 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      life: Math.random() * 4 + 2,
      speed: Math.random() * 10 + 5,
    }));

    const handleHit = (x, y) => {
      health = Math.max(0, health - 1);
      overlayFlashRef.current = 0.25;
      floatingTexts.push({
        text: health > 0 ? 'Ouch!' : 'Out!',
        color: '#ff6b6b',
        x,
        y,
        life: 0.6,
      });
      if (!reduceMotion.current) {
        shakeRef.current = {
          duration: 0.3,
          intensity: 6,
          total: 0.3,
        };
        for (let i = 0; i < 20; i++) {
          particles.push({
            x,
            y,
            vx: (Math.random() - 0.5) * 200,
            vy: -Math.random() * 200,
            life: 0.5,
            color: 'rgba(255,107,107,1)',
            size: 4,
          });
        }
      }
      if (health <= 0) {
        reset();
      } else {
        respawn();
      }
      setHud((prev) => ({
        ...prev,
        health,
        coins: coinsCollected,
        score,
      }));
    };

    const update = (dt) => {
      const input = {
        left: keys['ArrowLeft'],
        right: keys['ArrowRight'],
        jump: keys['Space'],
      };
      const vyBefore = player.vy;
      updatePhysics(player, input, dt);
      movePlayer(player, tiles, TILE_SIZE, dt);

      elapsed += dt;
      hudTimer += dt;
      if (hudTimer >= HUD_REFRESH_INTERVAL) {
        hudTimer = 0;
        setHud((prev) => ({
          ...prev,
          time: elapsed,
          coins: coinsCollected,
          score,
          health,
        }));
      }

      const newState = !player.onGround
        ? 'jump'
        : Math.abs(player.vx) > 20
        ? 'run'
        : 'idle';
      if (player.vx > 5) playerAnim.facing = 1;
      if (player.vx < -5) playerAnim.facing = -1;
      if (playerAnim.state !== newState) {
        playerAnim.state = newState;
        playerAnim.frame = 0;
        playerAnim.timer = 0;
      } else {
        const frameDuration = newState === 'run' ? 0.1 : 0.18;
        playerAnim.timer += dt;
        if (playerAnim.timer > frameDuration) {
          playerAnim.frame = (playerAnim.frame + 1) % (newState === 'run' ? 4 : 2);
          playerAnim.timer = 0;
        }
      }

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
        ambientEmbers.forEach((ember) => {
          ember.y -= ember.speed * dt;
          ember.x += Math.sin(elapsed * 0.5 + ember.speed) * dt * 10;
          ember.life -= dt;
          if (ember.life <= 0 || ember.y < -10) {
            ember.x = Math.random() * canvas.width;
            ember.y = canvas.height + Math.random() * 30;
            ember.life = Math.random() * 4 + 2;
            ember.speed = Math.random() * 10 + 5;
          }
        });
      }

      floatingTexts.forEach((text) => {
        text.life -= dt;
        text.y -= 20 * dt;
      });
      for (let i = floatingTexts.length - 1; i >= 0; i--) {
        if (floatingTexts[i].life <= 0) floatingTexts.splice(i, 1);
      }

      if (shakeRef.current.duration > 0) {
        shakeRef.current.duration = Math.max(
          0,
          shakeRef.current.duration - dt
        );
      }

      // fall out of world
      if (player.y > levelData.height * TILE_SIZE) {
        handleHit(player.x + player.w / 2, levelData.height * TILE_SIZE);
      }

      const cx = Math.floor((player.x + player.w / 2) / TILE_SIZE);
      const cy = Math.floor((player.y + player.h / 2) / TILE_SIZE);

      if (collectCoin(tiles, cx, cy)) {
        score++;
        coinsCollected++;
        setAriaMsg(`Score ${score}`);
        if (sound) playCoinSound();
        if (score > progress.highscore)
          setProgress((p) => ({ ...p, highscore: score }));
        floatingTexts.push({
          text: '+1 coin',
          color: '#f7d04b',
          x: player.x + player.w / 2,
          y: player.y,
          life: 0.8,
        });
        if (!reduceMotion.current) {
          for (let i = 0; i < 10; i++) {
            particles.push({
              x: cx * TILE_SIZE + TILE_SIZE / 2,
              y: cy * TILE_SIZE + TILE_SIZE / 2,
              vx: (Math.random() - 0.5) * 120,
              vy: (Math.random() - 0.5) * 120,
              life: 0.4,
              color: 'rgba(247,208,75,1)',
              size: 3,
            });
          }
        }
      }

      const tile = tiles[cy] && tiles[cy][cx];
      if (tile === HAZARD_TILE) {
        handleHit(player.x + player.w / 2, player.y + player.h / 2);
      }
      if (tile === CHECKPOINT_TILE) {
        spawn = { x: cx * TILE_SIZE, y: cy * TILE_SIZE };
        tiles[cy][cx] = 0;
        setProgress((p) => ({ ...p, checkpoint: spawn }));
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#03040a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      if (!reduceMotion.current) {
        const now = performance.now();
        bgLayers.forEach((layer, i) => {
          ctx.fillStyle = layer.color;
          layer.sprites.forEach((sprite) => {
            const x = (sprite.x - bgOffsets[i] + canvas.width) % canvas.width;
            const size =
              sprite.size * (1 + Math.sin(sprite.twinkle + now / 500) * 0.1);
            ctx.globalAlpha = i === 0 ? 0.3 : i === 1 ? 0.6 : 0.9;
            ctx.fillRect(x, sprite.y, size, size);
            ctx.globalAlpha = 1;
          });
        });
      }
      ctx.save();
      const shake = shakeRef.current;
      if (shake.duration > 0 && !reduceMotion.current) {
        const strength = (shake.duration / shake.total) * shake.intensity;
        const offsetX = (Math.random() - 0.5) * strength;
        const offsetY = (Math.random() - 0.5) * strength;
        ctx.translate(offsetX, offsetY);
      }

      for (let y = 0; y < levelData.height; y++) {
        for (let x = 0; x < levelData.width; x++) {
          const t = tiles[y][x];
          const sx = x * TILE_SIZE;
          const sy = y * TILE_SIZE;
          if (t === 1) {
            const gradient = ctx.createLinearGradient(sx, sy, sx, sy + TILE_SIZE);
            gradient.addColorStop(0, '#545c6b');
            gradient.addColorStop(1, '#2b303b');
            ctx.fillStyle = gradient;
            ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);
            ctx.fillStyle = 'rgba(255,255,255,0.05)';
            ctx.fillRect(sx, sy, TILE_SIZE, 2);
          } else if (t === COIN_TILE) {
            const now = performance.now();
            const bob = Math.sin(now / 200 + sx) * 2;
            ctx.fillStyle = '#f7d04b';
            ctx.beginPath();
            ctx.ellipse(
              sx + TILE_SIZE / 2,
              sy + TILE_SIZE / 2 + bob,
              TILE_SIZE / 3,
              TILE_SIZE / 2.5,
              0,
              0,
              Math.PI * 2
            );
            ctx.fill();
            ctx.strokeStyle = '#ffe89c';
            ctx.lineWidth = 1;
            ctx.stroke();
          } else if (t === HAZARD_TILE) {
            const now = performance.now();
            const pulse = 0.5 + Math.sin(now / 150 + x) * 0.5;
            const gradient = ctx.createRadialGradient(
              sx + TILE_SIZE / 2,
              sy + TILE_SIZE / 2,
              2,
              sx + TILE_SIZE / 2,
              sy + TILE_SIZE / 2,
              TILE_SIZE / 2
            );
            gradient.addColorStop(0, `rgba(255,80,80,${0.7 + pulse * 0.3})`);
            gradient.addColorStop(1, 'rgba(120,0,0,0.9)');
            ctx.fillStyle = gradient;
            ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);
          } else if (t === CHECKPOINT_TILE) {
            ctx.fillStyle = '#3be577';
            ctx.fillRect(sx + 4, sy, 4, TILE_SIZE);
            ctx.fillStyle = '#2ab35a';
            ctx.beginPath();
            ctx.moveTo(sx + 8, sy + 2);
            ctx.lineTo(sx + TILE_SIZE - 2, sy + TILE_SIZE / 2);
            ctx.lineTo(sx + 8, sy + TILE_SIZE - 2);
            ctx.closePath();
            ctx.fill();
          }
        }
      }

      drawPlayer(ctx, player, playerAnim);
      if (!reduceMotion.current) {
        particles.forEach((p) => {
          ctx.globalAlpha = Math.max(0, p.life / 0.3);
          ctx.fillStyle = p.color || 'white';
          const size = p.size || 4;
          ctx.fillRect(p.x, p.y, size, size);
          ctx.globalAlpha = 1;
        });
        ctx.fillStyle = 'rgba(255,196,120,0.3)';
        ambientEmbers.forEach((ember) => {
          ctx.fillRect(ember.x, ember.y, 2, 2);
        });
      }
      floatingTexts.forEach((text) => {
        ctx.globalAlpha = Math.max(0, text.life / 0.6);
        ctx.fillStyle = text.color;
        ctx.font = '10px monospace';
        ctx.fillText(text.text, text.x, text.y);
        ctx.globalAlpha = 1;
      });

      if (!reduceMotion.current) {
        ctx.save();
        ctx.globalCompositeOperation = 'multiply';
        const light = ctx.createRadialGradient(
          player.x + player.w / 2,
          player.y + player.h / 2,
          20,
          player.x + player.w / 2,
          player.y + player.h / 2,
          180
        );
        light.addColorStop(0, 'rgba(255,255,255,0.9)');
        light.addColorStop(1, 'rgba(0,0,0,0.9)');
        ctx.fillStyle = light;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
      }

      ctx.restore();

      if (overlayFlashRef.current > 0) {
        overlayFlashRef.current = Math.max(0, overlayFlashRef.current - 1 / 60);
        ctx.save();
        ctx.globalAlpha = overlayFlashRef.current;
        ctx.fillStyle = 'rgba(255,80,80,0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
      }
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
  }, [
    levelData,
    paused,
    sound,
    setProgress,
    progress.checkpoint,
    progress.highscore,
  ]);

  useEffect(() => {
    if (levelData && showTutorial) {
      setPaused(true);
    } else if (levelData) {
      setPaused(false);
    }
  }, [levelData, showTutorial]);

  const levelPath = levels[progress.level];
  if (!levelPath)
    return (
      <div className="w-full h-full flex items-center justify-center">
        All levels complete!
      </div>
    );

  return (
    <div className="w-full h-full relative bg-gradient-to-b from-gray-900 via-gray-950 to-black text-white">
      <canvas
        ref={canvasRef}
        width={levelData ? levelData.width * TILE_SIZE : 320}
        height={levelData ? levelData.height * TILE_SIZE : 160}
        className="w-full h-full"
        role="application"
        aria-label="Platformer training simulation"
        style={{ imageRendering: 'pixelated' }}
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
      <div className="absolute top-1 right-2 text-xs font-mono bg-black/40 backdrop-blur px-2 py-1 rounded border border-white/10 space-y-1 text-right">
        <div>
          Health:{' '}
          {Array.from({ length: MAX_HEALTH }, (_, idx) => (
            <span
              key={idx}
              className={`inline-block w-3 h-3 ml-1 rounded-sm ${
                idx < hud.health ? 'bg-emerald-400' : 'bg-gray-600'
              }`}
            />
          ))}
        </div>
        <div className="flex justify-end gap-1">
          <span>Coins:</span>
          <span>
            {hud.coins}/{hud.totalCoins}
          </span>
        </div>
        <div className="flex justify-end gap-1">
          <span>Score:</span>
          <span>{hud.score}</span>
        </div>
        <div className="flex justify-end gap-1">
          <span>Time:</span>
          <span>{hud.time.toFixed(1)}s</span>
        </div>
        <div className="flex justify-end gap-1">
          <span>Best:</span>
          <span>{progress.highscore || 0}</span>
        </div>
      </div>
      {(paused || showTutorial) && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="max-w-sm w-full space-y-4 text-sm">
            <h2 className="text-lg font-semibold text-emerald-300">
              {showTutorial ? 'Training Simulation' : 'Paused'}
            </h2>
            <p className="text-gray-200">
              Use the arrow keys to move and Space to jump. Gather coins, touch
              uplink beacons to set checkpoints, and avoid hazards. Press P or
              use the menu to pause anytime.
            </p>
            <div className="grid gap-2">
              {showTutorial && (
                <button
                  onClick={() => setTutorialDismissed(true)}
                  className="bg-emerald-500/80 hover:bg-emerald-400 text-black font-semibold py-1 rounded"
                >
                  Begin Mission
                </button>
              )}
              {!showTutorial && (
                <button
                  onClick={() => setPaused(false)}
                  className="bg-emerald-500/80 hover:bg-emerald-400 text-black font-semibold py-1 rounded"
                >
                  Resume
                </button>
              )}
              <button
                onClick={() => resetRef.current && resetRef.current()}
                className="bg-gray-700 hover:bg-gray-600 text-white py-1 rounded"
              >
                Restart Level
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] font-mono bg-black/40 px-2 py-1 rounded border border-white/10">
        Tip: Resize the window or detach to play in a dedicated desktop.
      </div>
      <div aria-live="polite" className="sr-only">{ariaMsg}</div>
    </div>
  );
};

function drawPlayer(ctx, player, anim) {
  ctx.save();
  ctx.translate(player.x + player.w / 2, player.y + player.h / 2);
  ctx.scale(anim.facing, 1);
  const baseWidth = player.w;
  const baseHeight = player.h;
  ctx.fillStyle = '#cde2ff';
  const bob = anim.state === 'run' ? Math.sin(anim.frame) * 1.5 : 0;
  ctx.fillRect(-baseWidth / 2, -baseHeight / 2 + bob, baseWidth, baseHeight);
  ctx.fillStyle = '#5ea1ff';
  ctx.fillRect(-baseWidth / 2, -baseHeight / 2 + bob, baseWidth, baseHeight / 2);
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(-baseWidth / 2, baseHeight / 4 + bob, baseWidth, baseHeight / 4);
  if (anim.state === 'run') {
    ctx.fillStyle = '#93c5fd';
    const swing = Math.sin(anim.frame) * 3;
    ctx.fillRect(-baseWidth / 2 - 3, -2 + bob, 4, 8 + swing);
    ctx.fillRect(baseWidth / 2 - 1, -2 + bob, 4, 8 - swing);
  }
  if (anim.state === 'jump') {
    ctx.fillStyle = '#bae6fd';
    ctx.fillRect(-baseWidth / 2 - 2, -baseHeight / 2 + bob, 4, baseHeight);
    ctx.fillRect(baseWidth / 2 - 2, -baseHeight / 2 + bob, 4, baseHeight);
  }
  ctx.restore();
}

export default Platformer;
