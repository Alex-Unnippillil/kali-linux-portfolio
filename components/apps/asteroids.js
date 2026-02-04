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
  ctx.strokeStyle = 'white';
  ctx.beginPath();
  const shape = asteroid.shape;
  if (shape && shape.length) {
    ctx.moveTo(shape[0].x, shape[0].y);
    shape.slice(1).forEach((pt) => ctx.lineTo(pt.x, pt.y));
  } else {
    ctx.moveTo(asteroid.r, 0);
  }
  ctx.closePath();
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
  const ship = game.ship;
  const sx = interpolate(ship.px, ship.x, alpha);
  const sy = interpolate(ship.py, ship.y, alpha);
  const angle = ship.angle;

  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(angle);
  ctx.strokeStyle = 'white';
  ctx.beginPath();
  ctx.moveTo(12, 0);
  ctx.lineTo(-12, -8);
  ctx.lineTo(-12, 8);
  ctx.closePath();
  ctx.stroke();
  if (ship.thrusting) {
    ctx.beginPath();
    ctx.moveTo(-12, 0);
    ctx.lineTo(-18, 4);
    ctx.lineTo(-20, 0);
    ctx.lineTo(-18, -4);
    ctx.closePath();
    ctx.strokeStyle = '#fbbf24';
    ctx.stroke();
  }
  if (ship.shield > 0) drawCircle(ctx, 0, 0, ship.r + 4, 'cyan');
  ctx.restore();

  game.asteroids.forEach((a) => {
    renderAsteroid(ctx, a, alpha);
  });

  game.bullets.forEach((b) => {
    if (!b.active) return;
    const x = interpolate(b.px, b.x, alpha);
    const y = interpolate(b.py, b.y, alpha);
    drawCircle(ctx, x, y, b.r, 'yellow', true);
  });

  if (game.ufo.active) {
    const x = interpolate(game.ufo.px, game.ufo.x, alpha);
    const y = interpolate(game.ufo.py, game.ufo.y, alpha);
    drawCircle(ctx, x, y, game.ufo.r, 'purple');
  }

  game.ufoBullets.forEach((b) => {
    const x = interpolate(b.px, b.x, alpha);
    const y = interpolate(b.py, b.y, alpha);
    drawCircle(ctx, x, y, b.r, 'red', true);
  });

  if (game.ghostShip) {
    const x = interpolate(game.ghostShip.px ?? game.ghostShip.x, game.ghostShip.x, alpha);
    const y = interpolate(game.ghostShip.py ?? game.ghostShip.y, game.ghostShip.y, alpha);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(game.ghostShip.angle);
    ctx.strokeStyle = 'rgba(125, 211, 252, 0.6)';
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(-12, -8);
    ctx.lineTo(-12, 8);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
    ctx.setLineDash([]);
  }

  game.powerUps.forEach((p) => {
    const x = interpolate(p.px ?? p.x, p.x, alpha);
    const y = interpolate(p.py ?? p.y, p.y, alpha);
    drawCircle(
      ctx,
      x,
      y,
      p.r,
      p.type === POWER_UPS.SHIELD ? 'cyan' : p.type === POWER_UPS.RAPID_FIRE ? 'yellow' : 'lime',
    );
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
      type === POWER_UPS.SHIELD ? 'cyan' : type === POWER_UPS.RAPID_FIRE ? 'yellow' : 'lime';
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
  const [startLevelNum, setStartLevelNum] = useState(1);
  const loopRef = useRef(null);
  const gameRef = useRef(null);
  const worldRef = useRef({ w: 0, h: 0 });
  const inventoryRef = useRef([]);
  const [inventory, setInventory] = useState([]);
  const [highScore, setHighScore] = useState(0);
  const [lastScore, setLastScore] = useState(0);
  const [stage, setStage] = useState(startLevelNum);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [multiplier, setMultiplier] = useState(1);
  const highScoreRef = useRef(0);
  const lastScoreRef = useRef(0);
  const stageRef = useRef(stage);
  const scoreRef = useRef(score);
  const livesRef = useRef(lives);
  const multiplierRef = useRef(multiplier);
  const [saveData, setSaveData, saveReady] = useOPFS('asteroids-save.json', { upgrades: [], ghost: [] });
  const saveDataRef = useRef(saveData);
  const inventoryUseRef = useRef(null);
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  const particlesRef = useRef([]);
  const starsRef = useRef([]);
  const shakeRef = useRef(0);
  const audioRef = useRef(null);
  const thrustCooldownRef = useRef(0);

  const playTone = useCallback((freq, duration = 0.08, volume = 0.12) => {
    if (muted || !audioRef.current) return;
    try {
      const ctx = audioRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      gain.gain.value = volume;
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
  }, [particlesEnabled]);

  useEffect(() => {
    if (!screenShake) shakeRef.current = 0;
  }, [screenShake]);

  useEffect(() => {
    const hs = Number(localStorage.getItem('asteroids-highscore') || 0);
    const ls = Number(localStorage.getItem('asteroids-lastscore') || 0);
    setHighScore(hs);
    setLastScore(ls);
    highScoreRef.current = hs;
    lastScoreRef.current = ls;
  }, []);
  useEffect(() => {
    highScoreRef.current = highScore;
  }, [highScore]);
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

    const handleInventoryUse = (e) => {
      if (e.key >= '1' && e.key <= '9') {
        inventoryUseRef.current = Number(e.key) - 1;
      }
    };
    window.addEventListener('keydown', handleInventoryUse);

    const spawnParticles = (x, y, color, count, speed = 1) => {
      if (!particlesEnabled) return;
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
          setLiveText(`Lives ${evt.lives}`);
        }
        if (evt.type === 'hud') {
          if (scoreRef.current !== evt.score) setScore(evt.score);
          if (livesRef.current !== evt.lives) setLives(evt.lives);
          if (multiplierRef.current !== evt.multiplier) setMultiplier(evt.multiplier);
        }
        if (evt.type === 'gameOver') {
          setLiveText(`Game over. Score ${evt.score}`);
          const newHigh = Math.max(evt.score, highScoreRef.current);
          setHighScore(newHigh);
          setLastScore(evt.score);
          try {
            localStorage.setItem('asteroids-highscore', String(newHigh));
            localStorage.setItem('asteroids-lastscore', String(evt.score));
          } catch {}
          const updated = { upgrades: saveDataRef.current.upgrades, ghost: evt.ghostData };
          saveDataRef.current = updated;
          setSaveData(updated);
          setSelectingLevel(true);
        }
        if (evt.type === 'asteroidDestroyed') {
          spawnParticles(evt.x, evt.y, '#f8fafc', 12, 1.6);
          if (screenShake) shakeRef.current = Math.max(shakeRef.current, 3);
          playTone(220, 0.06, 0.09);
        }
        if (evt.type === 'shipHit') {
          spawnParticles(evt.x, evt.y, '#38bdf8', 18, 2.2);
          if (screenShake) shakeRef.current = Math.max(shakeRef.current, 6);
          playTone(110, 0.12, 0.12);
        }
        if (evt.type === 'ufoDestroyed') {
          spawnParticles(evt.x, evt.y, '#c084fc', 16, 1.8);
          if (screenShake) shakeRef.current = Math.max(shakeRef.current, 4);
          playTone(160, 0.1, 0.1);
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
      const shake = screenShake ? shakeRef.current : 0;
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
        if (gameRef.current?.ship?.thrusting && particlesEnabled) {
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
        if (screenShake) {
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
    particlesEnabled,
    screenShake,
    playTone,
  ]);

  const restartGame = () => {
    pausedRef.current = false;
    setPaused(false);
    setSelectingLevel(true);
    setRestartKey((k) => k + 1);
  };

  const resetProgress = () => {
    const cleared = { upgrades: [], ghost: [] };
    saveDataRef.current = cleared;
    setSaveData(cleared);
    restartGame();
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
      lives={lives}
      score={score}
      highScore={highScore}
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
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-75 text-white space-y-2 z-50">
          <div>Select Starting Level</div>
          {[1, 2, 3, 4, 5].map((lvl) => (
            <button
              key={lvl}
              type="button"
              onClick={() => {
                setStartLevelNum(lvl);
                setSelectingLevel(false);
                setRestartKey((k) => k + 1);
              }}
              className="px-2 py-1 bg-gray-700 rounded"
            >
              Level {lvl}
            </button>
          ))}
        </div>
      )}
      <canvas
        ref={canvasRef}
        className="bg-black w-full h-full touch-none"
        aria-label="Asteroids game canvas"
      />
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
