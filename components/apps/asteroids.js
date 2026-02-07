import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import GameLoop from './Games/common/loop/GameLoop';
import { getMapping } from './Games/common/input-remap/useInputMapping';
import GameLayout from './GameLayout';
import { createGame, resize as resizeGame, tick } from './asteroids-engine';
import { POWER_UPS } from './asteroids-utils';
import useGameControls, { useGameSettings } from './useGameControls';
import usePersistedState from '../../hooks/usePersistedState';
import useOPFS from '../../hooks/useOPFS';

const DEFAULT_MAP = {
  thrust: 'ArrowUp',
  left: 'ArrowLeft',
  right: 'ArrowRight',
  fire: ' ',
  hyperspace: 'h',
};

const STAR_DENSITY = 8000;
const MAX_PARTICLES = 180;
const SHAKE_DECAY = 0.85;

const DIFFICULTIES = [
  { level: 1, name: 'Novice' },
  { level: 2, name: 'Pilot' },
  { level: 3, name: 'Warrior' },
  { level: 4, name: 'Commander' },
  { level: 5, name: 'Ace' },
];

const drawCircle = (ctx, x, y, r, color, fill = false) => {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  if (fill) {
    ctx.fillStyle = color;
    ctx.fill();
  } else {
    ctx.strokeStyle = color;
    ctx.stroke();
  }
};

const interpolate = (prev, next, alpha) => prev * (1 - alpha) + next * alpha;

const renderAsteroid = (ctx, asteroid, alpha) => {
  const x = interpolate(asteroid.px, asteroid.x, alpha);
  const y = interpolate(asteroid.py, asteroid.y, alpha);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(asteroid.angle || 0);

  // Simple solid fill - no gradients for performance
  ctx.fillStyle = '#374151';
  ctx.strokeStyle = '#9ca3af';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  const shape = asteroid.shape;
  if (shape && shape.length) {
    ctx.moveTo(shape[0].x, shape[0].y);
    shape.slice(1).forEach((pt) => ctx.lineTo(pt.x, pt.y));
  } else {
    ctx.arc(0, 0, asteroid.r, 0, Math.PI * 2);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
};

const renderParticles = (ctx, particles, alpha) => {
  particles.forEach((p) => {
    const x = interpolate(p.px, p.x, alpha);
    const y = interpolate(p.py, p.y, alpha);
    ctx.globalAlpha = Math.max(0, Math.min(1, p.life / p.maxLife));
    drawCircle(ctx, x, y, p.r, p.color, true);
  });
  ctx.globalAlpha = 1;
};

const renderGame = (ctx, game, alpha, worldW, worldH, { stars, particles, shake }) => {
  if (!game) return;
  ctx.clearRect(0, 0, worldW, worldH);
  if (stars?.length) {
    stars.forEach((star) => {
      ctx.globalAlpha = star.alpha;
      ctx.fillStyle = '#9fb3ff';
      ctx.fillRect(star.x, star.y, star.size, star.size);
    });
    ctx.globalAlpha = 1;
  }
  if (game.lives <= 0) return; // Don't draw ship if dead
  const ship = game.ship;
  const sx = interpolate(ship.px, ship.x, alpha);
  const sy = interpolate(ship.py, ship.y, alpha);
  const angle = ship.angle;

  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(angle);
  if (ship.hitCooldown > 0) {
    ctx.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(ship.hitCooldown * 0.2));
  }

  // Ship body - no shadows for performance
  ctx.fillStyle = '#1e293b';
  ctx.strokeStyle = ship.shield > 0 ? 'cyan' : 'white';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(14, 0);
  ctx.lineTo(-10, -8);
  ctx.lineTo(-6, 0);
  ctx.lineTo(-10, 8);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Thruster flame - fixed length to prevent flicker
  if (ship.thrusting) {
    ctx.beginPath();
    ctx.moveTo(-6, 0);
    ctx.lineTo(-10, 3);
    ctx.lineTo(-16, 0);
    ctx.lineTo(-10, -3);
    ctx.closePath();
    ctx.fillStyle = '#fbbf24';
    ctx.fill();
  }

  // Shield bubble
  if (ship.shield > 0) {
    ctx.strokeStyle = 'cyan';
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.arc(0, 0, ship.r + 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  ctx.restore();

  game.asteroids.forEach((a) => {
    renderAsteroid(ctx, a, alpha);
  });

  game.bullets.forEach((b) => {
    if (!b.active) return;
    const x = interpolate(b.px, b.x, alpha);
    const y = interpolate(b.py, b.y, alpha);
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(x, y, b.r, 0, Math.PI * 2);
    ctx.fill();
  });

  if (game.ufo.active) {
    const x = interpolate(game.ufo.px, game.ufo.x, alpha);
    const y = interpolate(game.ufo.py, game.ufo.y, alpha);
    // UFO body
    ctx.fillStyle = '#7c3aed';
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x, y, game.ufo.r, game.ufo.r * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Dome
    ctx.fillStyle = '#a78bfa';
    ctx.beginPath();
    ctx.ellipse(x, y - 3, game.ufo.r * 0.5, game.ufo.r * 0.3, 0, Math.PI, 0);
    ctx.fill();
  }

  game.ufoBullets.forEach((b) => {
    const x = interpolate(b.px, b.x, alpha);
    const y = interpolate(b.py, b.y, alpha);
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(x, y, b.r, 0, Math.PI * 2);
    ctx.fill();
  });


  // Ghost ship removed for cleaner gameplay

  game.powerUps.forEach((p) => {
    const x = interpolate(p.px ?? p.x, p.x, alpha);
    const y = interpolate(p.py ?? p.y, p.y, alpha);
    const color =
      p.type === POWER_UPS.SHIELD
        ? 'cyan'
        : p.type === POWER_UPS.RAPID_FIRE
          ? 'yellow'
          : p.type === POWER_UPS.SPREAD
            ? 'orange'
            : 'lime';
    drawCircle(ctx, x, y, p.r, color); // Stroke
    ctx.save();
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.2;
    ctx.beginPath();
    ctx.arc(x, y, p.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'white';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    let label = '?';
    if (p.type === POWER_UPS.SHIELD) label = 'S';
    if (p.type === POWER_UPS.RAPID_FIRE) label = 'R';
    if (p.type === POWER_UPS.SPREAD) label = 'V';
    if (p.type === POWER_UPS.EXTRA_LIFE) label = '+';
    ctx.fillText(label, x, y + 1);
    ctx.restore();
  });

  // Radar
  const radarSize = 80;
  const radarX = worldW - radarSize - 10;
  const radarY = 10;
  ctx.save();
  ctx.strokeStyle = '#0f0';
  ctx.strokeRect(radarX, radarY, radarSize, radarSize);
  const scaleX = radarSize / worldW;
  const scaleY = radarSize / worldH;
  ctx.fillStyle = '#fff';
  ctx.fillRect(radarX + sx * scaleX - 1, radarY + sy * scaleY - 1, 3, 3);
  ctx.fillStyle = '#0f0';
  game.asteroids.forEach((a) => {
    ctx.fillRect(radarX + a.x * scaleX - 1, radarY + a.y * scaleY - 1, 2, 2);
  });
  if (game.ufo.active) {
    ctx.fillStyle = '#f00';
    ctx.fillRect(radarX + game.ufo.x * scaleX - 1, radarY + game.ufo.y * scaleY - 1, 3, 3);
  }
  ctx.restore();

  game.inventory.forEach((type, i) => {
    ctx.beginPath();
    ctx.strokeStyle =
      type === POWER_UPS.SHIELD
        ? 'cyan'
        : type === POWER_UPS.RAPID_FIRE
          ? 'yellow'
          : type === POWER_UPS.SPREAD
            ? 'orange'
            : 'lime';
    ctx.arc(10 + i * 20, 80, 8, 0, Math.PI * 2);
    ctx.stroke();
  });

  if (game.waveBannerTimer > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, game.waveBannerTimer / 30);
    ctx.fillStyle = 'white';
    ctx.font = '24px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(game.waveBannerText, worldW / 2, worldH / 2);
    ctx.restore();
  }

  if (particles?.length) {
    renderParticles(ctx, particles, alpha);
  }

  // Render floating texts
  if (game?.floatingTexts?.length) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = 'bold 16px sans-serif';
    game.floatingTexts.forEach((ft) => {
      ctx.globalAlpha = Math.max(0, ft.life / 60);
      ctx.fillStyle = ft.color || '#fff';
      const x = interpolate(ft.x, ft.x, alpha); // No interpolation needed really as they move slowly
      const y = interpolate(ft.y, ft.y, alpha);
      ctx.fillText(ft.text, x, y);
    });
    ctx.restore();
  }
};

const Asteroids = () => {
  const canvasRef = useRef(null);
  const controlsRef = useRef(useGameControls(canvasRef, 'asteroids'));
  const { muted, toggleMute, screenShake, setScreenShake } = useGameSettings('asteroids');
  const [particlesEnabled, setParticlesEnabled] = usePersistedState('game:asteroids:particles', true);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  const [restartKey, setRestartKey] = useState(0);
  const [liveText, setLiveText] = useState('');
  const [selectingLevel, setSelectingLevel] = useState(true);
  const [gameOver, setGameOver] = useState(false);
  const [startLevelNum, setStartLevelNum] = useState(1);
  const loopRef = useRef(null);
  const gameRef = useRef(null);
  const worldRef = useRef({ w: 0, h: 0 });
  const inventoryRef = useRef([]);
  const [inventory, setInventory] = useState([]);
  const [highScores, setHighScores] = useState({});
  const [lastScore, setLastScore] = useState(0);
  const [stage, setStage] = useState(startLevelNum);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [multiplier, setMultiplier] = useState(1);
  const [multiplierTimer, setMultiplierTimer] = useState(0);
  const highScoresRef = useRef({});
  const lastScoreRef = useRef(0);
  const stageRef = useRef(stage);
  const scoreRef = useRef(score);
  const livesRef = useRef(lives);
  const multiplierRef = useRef(multiplier);
  const multiplierTimerRef = useRef(multiplierTimer);
  const [saveData, setSaveData, saveReady] = useOPFS('asteroids-save.json', { upgrades: [], ghost: [] });
  const saveDataRef = useRef(saveData);
  const inventoryUseRef = useRef(null);
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  const particlesRef = useRef([]);
  const starsRef = useRef([]);
  const shakeRef = useRef(0);
  const audioRef = useRef(null);
  const thrustCooldownRef = useRef(0);
  const particlesEnabledRef = useRef(particlesEnabled);
  const screenShakeRef = useRef(screenShake);
  const playToneRef = useRef(null);

  const playTone = useCallback((freq, duration = 0.08, volume = 0.12) => {
    if (muted || !audioRef.current || pausedRef.current) return;
    try {
      const ctx = audioRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.value = volume * 0.5;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      /* ignore audio errors */
    }
  }, [muted]);

  useEffect(() => {
    const initAudio = () => {
      if (audioRef.current) return;
      try {
        audioRef.current = new (window.AudioContext || window.webkitAudioContext)();
      } catch {
        /* ignore audio init errors */
      }
    };
    window.addEventListener('pointerdown', initAudio, { once: true });
    return () => window.removeEventListener('pointerdown', initAudio);
  }, []);

  useEffect(() => {
    if (!particlesEnabled) particlesRef.current = [];
    particlesEnabledRef.current = particlesEnabled;
  }, [particlesEnabled]);

  useEffect(() => {
    if (!screenShake) shakeRef.current = 0;
    screenShakeRef.current = screenShake;
  }, [screenShake]);

  useEffect(() => {
    playToneRef.current = playTone;
  }, [playTone]);

  useEffect(() => {
    const scores = {};
    DIFFICULTIES.forEach((d) => {
      scores[d.level] = Number(localStorage.getItem(`asteroids-highscore-${d.level}`) || 0);
    });
    setHighScores(scores);
    highScoresRef.current = scores;

    // Legacy migration check (optional, but good practice)
    const legacy = localStorage.getItem('asteroids-highscore');
    if (legacy && !localStorage.getItem('asteroids-highscore-1')) {
      // Assuming legacy high score was Novice
      localStorage.setItem('asteroids-highscore-1', legacy);
      scores[1] = Number(legacy);
      setHighScores({ ...scores });
    }

    const ls = Number(localStorage.getItem('asteroids-lastscore') || 0);
    setLastScore(ls);
    lastScoreRef.current = ls;
  }, []);
  useEffect(() => {
    highScoresRef.current = highScores;
  }, [highScores]);
  useEffect(() => {
    lastScoreRef.current = lastScore;
  }, [lastScore]);
  useEffect(() => {
    stageRef.current = stage;
  }, [stage]);
  useEffect(() => {
    scoreRef.current = score;
  }, [score]);
  useEffect(() => {
    livesRef.current = lives;
  }, [lives]);
  useEffect(() => {
    multiplierRef.current = multiplier;
  }, [multiplier]);
  useEffect(() => {
    multiplierTimerRef.current = multiplierTimer;
  }, [multiplierTimer]);
  useEffect(() => {
    saveDataRef.current = saveData;
  }, [saveData]);
  useEffect(() => {
    inventoryRef.current = inventory;
  }, [inventory]);

  useEffect(() => {
    if (!saveReady || selectingLevel) return undefined;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    const resize = () => {
      const worldW = canvas.clientWidth;
      const worldH = canvas.clientHeight;
      worldRef.current = { w: worldW, h: worldH };
      canvas.width = Math.floor(worldW * dpr);
      canvas.height = Math.floor(worldH * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const starCount = Math.max(30, Math.floor((worldW * worldH) / STAR_DENSITY));
      starsRef.current = Array.from({ length: starCount }, () => ({
        x: Math.random() * worldW,
        y: Math.random() * worldH,
        size: Math.random() > 0.8 ? 2 : 1,
        alpha: 0.3 + Math.random() * 0.7,
      }));
      if (gameRef.current) resizeGame(gameRef.current, worldW, worldH);
    };

    resize();
    window.addEventListener('resize', resize);

    const game = createGame({
      worldW: worldRef.current.w,
      worldH: worldRef.current.h,
      startLevel: startLevelNum,
      saveData: saveDataRef.current,
    });
    gameRef.current = game;
    inventoryRef.current = [];
    setInventory([]);
    setStage(game.level);
    setScore(game.score);
    setLives(game.lives);
    setMultiplier(game.multiplier);
    setMultiplierTimer(game.multiplierTimer);
    setGameOver(false);

    const handleInventoryUse = (e) => {
      if (e.key >= '1' && e.key <= '9') {
        inventoryUseRef.current = Number(e.key) - 1;
      }
    };
    window.addEventListener('keydown', handleInventoryUse);

    const spawnParticles = (x, y, color, count, speed = 1) => {
      if (!particlesEnabledRef.current) return;
      for (let i = 0; i < count; i += 1) {
        if (particlesRef.current.length >= MAX_PARTICLES) break;
        const angle = Math.random() * Math.PI * 2;
        const velocity = (0.5 + Math.random() * 0.8) * speed;
        particlesRef.current.push({
          x,
          y,
          px: x,
          py: y,
          dx: Math.cos(angle) * velocity,
          dy: Math.sin(angle) * velocity,
          life: 30 + Math.floor(Math.random() * 20),
          maxLife: 50,
          r: 1.5 + Math.random() * 1.5,
          color,
        });
      }
    };

    const processEvents = () => {
      game.events.forEach((evt) => {
        if (evt.type === 'inventory') setInventory(evt.inventory);
        if (evt.type === 'banner') setLiveText(evt.text);
        if (evt.type === 'level') {
          if (stageRef.current !== evt.level) setStage(evt.level);
          setLiveText(`Wave ${evt.level}`);
        }
        if (evt.type === 'lives') {
          if (livesRef.current !== evt.lives) setLives(evt.lives);
          setLiveText(`Lives ${Math.max(0, evt.lives)}`);
        }
        if (evt.type === 'hud') {
          if (scoreRef.current !== evt.score) setScore(evt.score);
          if (livesRef.current !== evt.lives) setLives(evt.lives);
          if (multiplierRef.current !== evt.multiplier) setMultiplier(evt.multiplier);
          if (multiplierTimerRef.current !== evt.multiplierTimer)
            setMultiplierTimer(evt.multiplierTimer);
        }
        if (evt.type === 'asteroidDestroyed') {
          spawnParticles(evt.x, evt.y, '#f8fafc', 12, 1.6);
          if (screenShakeRef.current) shakeRef.current = Math.max(shakeRef.current, 3);
          if (playToneRef.current) playToneRef.current(220, 0.06, 0.09);
        }
        if (evt.type === 'shipHit') {
          spawnParticles(evt.x, evt.y, '#38bdf8', 18, 2.2);
          if (screenShakeRef.current) shakeRef.current = Math.max(shakeRef.current, 6);
          if (playToneRef.current) playToneRef.current(110, 0.12, 0.12);
        }
        if (evt.type === 'ufoDestroyed') {
          spawnParticles(evt.x, evt.y, '#c084fc', 16, 1.8);
          if (screenShakeRef.current) shakeRef.current = Math.max(shakeRef.current, 4);
          if (playToneRef.current) playToneRef.current(160, 0.1, 0.1);
        }
        if (evt.type === 'gameOver') {
          // Play a "loss" sound if undesired, but user asked to stop sound.
          // We ensure playTone checks paused status if we were to pause.
          // Currently game doesn't strictly pause engine, but we stop inputs via overlay.

          setLiveText(`Game over. Score ${evt.score}`);
          setGameOver(true);

          const difficulty = evt.startLevel || 1;
          const currentHigh = highScoresRef.current[difficulty] || 0;
          const newHigh = Math.max(evt.score, currentHigh);

          setHighScores((prev) => ({ ...prev, [difficulty]: newHigh }));
          setLastScore(evt.score);

          try {
            localStorage.setItem(`asteroids-highscore-${difficulty}`, String(newHigh));
            localStorage.setItem('asteroids-lastscore', String(evt.score));
          } catch { }

          const updated = { upgrades: saveDataRef.current.upgrades, ghost: evt.ghostData };
          saveDataRef.current = updated;
          setSaveData(updated);
          // Don't auto-select level, let Game Over screen show
        }
      });
    };

    const updateParticles = (dtScale) => {
      const next = [];
      particlesRef.current.forEach((p) => {
        const particle = p;
        particle.px = particle.x;
        particle.py = particle.y;
        particle.x += particle.dx * dtScale;
        particle.y += particle.dy * dtScale;
        particle.life -= 1 * dtScale;
        if (particle.life > 0) next.push(particle);
      });
      particlesRef.current = next;
    };

    const render = (alpha) => {
      const shake = screenShakeRef.current ? shakeRef.current : 0;
      ctx.save();
      if (shake > 0.1) {
        ctx.translate((Math.random() * 2 - 1) * shake, (Math.random() * 2 - 1) * shake);
      }
      renderGame(ctx, gameRef.current, alpha, worldRef.current.w, worldRef.current.h, {
        stars: starsRef.current,
        particles: particlesRef.current,
      });
      ctx.restore();
    };

    const loop = new GameLoop(
      (dt) => {
        if (pausedRef.current) return;
        const { keys, joystick, fire, hyperspace } = controlsRef.current;
        const map = getMapping('asteroids', DEFAULT_MAP);
        const turn =
          (keys[map.left] ? -1 : 0) + (keys[map.right] ? 1 : 0) + (joystick.active ? joystick.x : 0);
        const thrust =
          (keys[map.thrust] ? 1 : 0) + (joystick.active ? -joystick.y : 0);
        const input = {
          turn,
          thrust,
          fire,
          hyperspace,
          useInventory: inventoryUseRef.current,
        };
        controlsRef.current.fire = false;
        controlsRef.current.hyperspace = false;
        inventoryUseRef.current = null;
        tick(gameRef.current, input, dt);
        processEvents();
        if (gameRef.current?.ship?.thrusting && particlesEnabledRef.current) {
          if (thrustCooldownRef.current <= 0) {
            const ship = gameRef.current.ship;
            const x = ship.x - Math.cos(ship.angle) * 12;
            const y = ship.y - Math.sin(ship.angle) * 12;
            spawnParticles(x, y, '#fbbf24', 3, 0.8);
            thrustCooldownRef.current = 2;
          } else {
            thrustCooldownRef.current -= dt / 16;
          }
        }
        updateParticles(dt / 16);
        if (starsRef.current.length) {
          const velX = gameRef.current.ship.velX || 0;
          const velY = gameRef.current.ship.velY || 0;
          starsRef.current.forEach((star) => {
            star.x += velX * 0.05;
            star.y += velY * 0.05;
            if (star.x < 0) star.x += worldRef.current.w;
            if (star.x > worldRef.current.w) star.x -= worldRef.current.w;
            if (star.y < 0) star.y += worldRef.current.h;
            if (star.y > worldRef.current.h) star.y -= worldRef.current.h;
          });
        }
        if (screenShakeRef.current) {
          shakeRef.current = Math.max(0, shakeRef.current * Math.pow(SHAKE_DECAY, dt / 16));
        }
      },
      undefined,
      { fps: 60, maxDt: 32, render, interpolation: true },
    );

    loopRef.current = loop;
    loop.start();

    return () => {
      loop.stop();
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', handleInventoryUse);
    };
  }, [
    dpr,
    restartKey,
    saveReady,
    selectingLevel,
    startLevelNum,
    setSaveData,
  ]);

  const restartGame = () => {
    pausedRef.current = false;
    setPaused(false);
    setSelectingLevel(true);
    setGameOver(false);
    setRestartKey((k) => k + 1);
  };

  const resetProgress = () => {
    const cleared = { upgrades: [], ghost: [] };
    saveDataRef.current = cleared;
    setSaveData(cleared);
    restartGame();
  };

  const multiplierRatio = Math.min(1, multiplierTimer / 180);

  const inventoryLabel = (type) => {
    switch (type) {
      case POWER_UPS.SHIELD:
        return 'Shield';
      case POWER_UPS.RAPID_FIRE:
        return 'Rapid';
      case POWER_UPS.SPREAD:
        return 'Spread';
      case POWER_UPS.EXTRA_LIFE:
        return 'Life';
      default:
        return 'Power-up';
    }
  };

  const settingsPanel = useMemo(
    () => (
      <div className="space-y-3 text-sm text-slate-100">
        <div className="flex items-center justify-between">
          <span>Particles</span>
          <button
            type="button"
            aria-pressed={particlesEnabled}
            onClick={() => setParticlesEnabled((v) => !v)}
            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 focus:outline-none focus:ring"
          >
            {particlesEnabled ? 'On' : 'Off'}
          </button>
        </div>
        <div className="flex items-center justify-between">
          <span>Screen shake</span>
          <button
            type="button"
            aria-pressed={screenShake}
            onClick={() => setScreenShake((v) => !v)}
            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 focus:outline-none focus:ring"
          >
            {screenShake ? 'On' : 'Off'}
          </button>
        </div>
        <div className="flex items-center justify-between">
          <span>Sound FX</span>
          <button
            type="button"
            aria-pressed={!muted}
            onClick={toggleMute}
            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 focus:outline-none focus:ring"
          >
            {muted ? 'Muted' : 'On'}
          </button>
        </div>
      </div>
    ),
    [muted, particlesEnabled, screenShake, setParticlesEnabled, setScreenShake, toggleMute],
  );

  return (
    <GameLayout
      gameId="asteroids"
      stage={stage}
      lives={Math.max(0, lives)}
      score={score}
      highScore={highScores[startLevelNum]}
      settingsPanel={settingsPanel}
      paused={paused}
      onPauseChange={(p) => {
        pausedRef.current = p;
        setPaused(p);
        const loop = loopRef.current;
        if (!loop) return;
        if (p) loop.stop();
        else loop.start();
      }}
      onRestart={restartGame}
    >
      {selectingLevel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-80 text-white space-y-3 z-50">
          <div className="text-3xl font-bold tracking-wide mb-2">🚀 Asteroids</div>
          <div className="text-sm text-slate-200">Select Difficulty</div>
          <div className="flex flex-col gap-2 w-full max-w-xs px-8">
            {DIFFICULTIES.map((d) => (
              <div key={d.level} className="flex items-center justify-between w-full">
                <button
                  type="button"
                  onClick={() => {
                    setStartLevelNum(d.level);
                    setSelectingLevel(false);
                    setGameOver(false);
                    setRestartKey((k) => k + 1);
                  }}
                  className="flex-1 px-3 py-2 bg-gray-700/80 rounded hover:bg-emerald-600/80 focus:outline-none focus:ring transition-colors text-left"
                >
                  {d.name}
                </button>
                <div className="ml-3 text-xs text-slate-400 tabular-nums w-12 text-right">
                  {highScores[d.level] || 0}
                </div>
              </div>
            ))}
          </div>
          {lastScore > 0 && (
            <div className="text-xs text-slate-300 mt-2">
              Last score: {lastScore}
            </div>
          )}
        </div>
      )}
      <canvas
        ref={canvasRef}
        className="bg-black w-full h-full touch-none"
        aria-label="Asteroids game canvas"
      />
      <div className="absolute bottom-2 left-2 z-30 flex flex-col gap-2">
        <div className="rounded bg-slate-900/70 border border-slate-700/70 px-3 py-2 text-xs text-slate-200">
          <div className="flex items-center justify-between gap-3">
            <span>Multiplier</span>
            <span className="font-semibold text-emerald-300">x{multiplier}</span>
          </div>
          <div className="mt-1 h-1.5 w-32 rounded bg-slate-800">
            <div
              className="h-full rounded bg-emerald-400 transition-[width]"
              style={{ width: `${Math.max(6, multiplierRatio * 100)}%` }}
            />
          </div>
        </div>
        <div className="rounded bg-slate-900/70 border border-slate-700/70 px-3 py-2 text-xs text-slate-200">
          <div className="mb-1 font-semibold">Inventory</div>
          {inventory.length === 0 ? (
            <div className="text-slate-400">Empty</div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {inventory.map((type, index) => (
                <button
                  key={`${type}-${index}`}
                  type="button"
                  onClick={() => {
                    inventoryUseRef.current = index;
                  }}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 focus:outline-none focus:ring"
                  aria-label={`Use ${inventoryLabel(type)} power-up in slot ${index + 1}`}
                >
                  {index + 1}: {inventoryLabel(type)}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      {gameOver && !selectingLevel && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/70">
          <div className="rounded-lg border border-slate-700 bg-slate-900/95 p-6 text-center text-white shadow-xl max-w-sm">
            <div className="text-xl font-semibold mb-2">Game Over</div>
            <div className="text-sm text-slate-300 mb-4">
              Score: <span className="font-semibold text-emerald-300">{Math.floor(lastScore)}</span> · High:{' '}
              <span className="font-semibold text-indigo-300">{highScores[startLevelNum] || 0}</span>
            </div>
            <div className="flex gap-3 justify-center">
              <button
                type="button"
                onClick={() => {
                  setSelectingLevel(false);
                  setGameOver(false);
                  setRestartKey((k) => k + 1);
                }}
                className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 focus:outline-none focus:ring"
              >
                Restart
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectingLevel(true);
                  setGameOver(false);
                }}
                className="px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 focus:outline-none focus:ring"
              >
                Menu
              </button>
            </div>
          </div>
        </div>
      )}
      <div aria-live="polite" className="sr-only">
        {liveText}
      </div>
      <div className="absolute bottom-2 right-2 z-40">
        <button type="button" onClick={resetProgress} className="px-2 py-1 bg-gray-700 text-white rounded">
          Reset Progress
        </button>
      </div>
    </GameLayout>
  );
};

export default Asteroids;
