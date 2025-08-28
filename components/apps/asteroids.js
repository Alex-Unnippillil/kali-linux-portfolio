import React, { useRef, useEffect, useState } from 'react';
import {
  wrap,
  createBulletPool,
  spawnBullet,
  updateBullets,
  createGA,
  spawnPowerUp,
  updatePowerUps,
  POWER_UPS,
  createSeededRNG,
} from './asteroids-utils';
import useGameControls from './useGameControls';
import GameLayout from './GameLayout.js';

// Arcade-style tuning constants
const THRUST = 0.1;
const INERTIA = 0.99;
const COLLISION_COOLDOWN = 60; // frames
const MULTIPLIER_TIMEOUT = 180; // frames
const MAX_MULTIPLIER = 5;
const EXHAUST_COLOR = '#ffa500';
const SHIELD_DURATION = 600; // frames
const RADAR_COLORS = { outline: '#0f0', ship: '#fff', asteroid: '#0f0', ufo: '#f00' };

// Simple Quadtree for collision queries
class Quadtree {
  constructor(x, y, w, h, depth = 0) {
    this.bounds = { x, y, w, h };
    this.depth = depth;
    this.objects = [];
    this.nodes = [];
  }

  clear() {
    this.objects.length = 0;
    this.nodes.forEach((n) => n.clear());
    this.nodes.length = 0;
  }

  split() {
    const { x, y, w, h } = this.bounds;
    const hw = w / 2;
    const hh = h / 2;
    this.nodes[0] = new Quadtree(x, y, hw, hh, this.depth + 1);
    this.nodes[1] = new Quadtree(x + hw, y, hw, hh, this.depth + 1);
    this.nodes[2] = new Quadtree(x, y + hh, hw, hh, this.depth + 1);
    this.nodes[3] = new Quadtree(x + hw, y + hh, hw, hh, this.depth + 1);
  }

  getIndex(obj) {
    const verticalMidpoint = this.bounds.x + this.bounds.w / 2;
    const horizontalMidpoint = this.bounds.y + this.bounds.h / 2;
    const top = obj.y - obj.r < horizontalMidpoint && obj.y + obj.r < horizontalMidpoint;
    const bottom = obj.y - obj.r > horizontalMidpoint;
    const left = obj.x - obj.r < verticalMidpoint && obj.x + obj.r < verticalMidpoint;
    const right = obj.x - obj.r > verticalMidpoint;
    if (left) {
      if (top) return 0;
      if (bottom) return 2;
    }
    if (right) {
      if (top) return 1;
      if (bottom) return 3;
    }
    return -1;
  }

  insert(obj) {
    if (this.nodes.length) {
      const index = this.getIndex(obj);
      if (index !== -1) {
        this.nodes[index].insert(obj);
        return;
      }
    }
    this.objects.push(obj);
    if (this.objects.length > 4 && this.depth < 5) {
      if (!this.nodes.length) this.split();
      let i = 0;
      while (i < this.objects.length) {
        const index = this.getIndex(this.objects[i]);
        if (index !== -1) this.nodes[index].insert(this.objects.splice(i, 1)[0]);
        else i += 1;
      }
    }
  }

  retrieve(obj, out = []) {
    const index = this.getIndex(obj);
    if (index !== -1 && this.nodes.length) this.nodes[index].retrieve(obj, out);
    out.push(...this.objects);
    return out;
  }
}

const Asteroids = () => {
  const canvasRef = useRef(null);
  const requestRef = useRef();
  const audioCtx = useRef(null);
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  const controlsRef = useRef(useGameControls(canvasRef));
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  const [restartKey, setRestartKey] = useState(0);
  const [liveText, setLiveText] = useState('');

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function resize() {
      const { clientWidth, clientHeight } = canvas;
      canvas.width = clientWidth * dpr;
      canvas.height = clientHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    resize();
    window.addEventListener('resize', resize);

    // Game state
    const ship = {
      x: canvas.width / 2,
      y: canvas.height / 2,
      angle: 0,
      velX: 0,
      velY: 0,
      r: 10,
      cooldown: 0,
      shield: 0,
      rapidFire: 0,
      hitCooldown: 0,
    };
    let lives = 3;
    let score = 0;
    let level = 1;
    let extraLifeScore = 10000;
    const bullets = createBulletPool(40);
    const asteroids = [];
    const ga = createGA();
    const particles = Array.from({ length: 256 }, () => ({
      active: false,
      x: 0,
      y: 0,
      dx: 0,
      dy: 0,
      life: 0,
      maxLife: 0,
      color: 'white',
      size: 2,
      type: 'spark',
      angle: 0,
      spin: 0,
    }));
    const ufo = { active: false, x: 0, y: 0, dx: 0, dy: 0, r: 15, cooldown: 0 };
    const ufoBullets = [];
    const powerUps = [];
    let ufoTimer = 600; // frames until next UFO
    let multiplier = 1;
    let multiplierTimer = 0;
    let rand = Math.random;
    let waveBannerText = '';
    let waveBannerTimer = 0;

    // Particle pooling
    const spawnParticles = (x, y, count, color = 'white', type = 'spark', baseAngle = 0) => {
      if (reduceMotion) return;
      for (let i = 0; i < particles.length && count > 0; i += 1) {
        const p = particles[i];
        if (!p.active) {
          let a = Math.random() * Math.PI * 2;
          let speed = Math.random() * 2 + 1;
          if (type === 'flame') {
            a = baseAngle + Math.PI + (Math.random() - 0.5) * 0.5;
            speed = Math.random() * 1.5 + 0.5;
          }
          p.active = true;
          p.x = x;
          p.y = y;
          p.dx = Math.cos(a) * speed;
          p.dy = Math.sin(a) * speed;
          const life = type === 'flame' ? 20 : 40;
          p.life = life;
          p.maxLife = life;
          p.color = color;
          p.size = type === 'debris' ? Math.random() * 3 + 2 : 2;
          p.type = type;
          p.angle = type === 'flame' ? baseAngle : Math.random() * Math.PI * 2;
          p.spin = type === 'debris' ? (Math.random() - 0.5) * 0.2 : 0;
          count -= 1;
        }
      }
    };

    // Audio using WebAudio lazily
    const playSound = (freq) => {
      if (!audioCtx.current) audioCtx.current = new (window.AudioContext || window.webkitAudioContext)();
      const ctxAudio = audioCtx.current;
      const osc = ctxAudio.createOscillator();
      const gain = ctxAudio.createGain();
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(ctxAudio.destination);
      osc.start();
      gain.gain.setValueAtTime(0.2, ctxAudio.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctxAudio.currentTime + 0.3);
      osc.stop(ctxAudio.currentTime + 0.3);
    };

    // Spawn asteroids for a level
    const spawnAsteroids = (count, speed = 1 + level * 0.3) => {
      for (let i = 0; i < count; i += 1) {
        const angle = rand() * Math.PI * 2;
        const r = 15 + rand() * 25;
        asteroids.push({
          x: rand() * canvas.width,
          y: rand() * canvas.height,
          dx: Math.cos(angle) * speed,
          dy: Math.sin(angle) * speed,
          r,
        });
      }
    };

    const startLevel = () => {
      rand = createSeededRNG(level);
      spawnAsteroids(3 + level * 2);
      ufoTimer = Math.max(300, 900 - level * 60);
      waveBannerText = `Wave ${level}`;
      waveBannerTimer = 120;
      setLiveText(waveBannerText);
    };

    startLevel();
    ga.start();

    let lastAnnouncement = '';
    const announce = () => {
      const text = `Score ${score} x${multiplier} Lives ${lives}`;
      if (text !== lastAnnouncement) {
        lastAnnouncement = text;
        setLiveText(text);
      }
    };

    // Gamepad support
    const padState = { turn: 0, thrust: 0, fire: false, hyperspace: false };
    function pollGamepad() {
      const pad = navigator.getGamepads ? navigator.getGamepads()[0] : null;
      if (pad) {
        padState.turn = pad.axes[0] || 0;
        padState.thrust = pad.axes[1] < -0.2 ? -pad.axes[1] : 0;
        padState.fire = pad.buttons[0].pressed;
        padState.hyperspace = pad.buttons[1].pressed;
      }
    }

    function hyperspace() {
      ship.x = rand() * canvas.width;
      ship.y = rand() * canvas.height;
      if (rand() < 0.1) destroyShip();
    }

    function fireBullet() {
      if (ship.cooldown > 0) return;
      spawnBullet(
        bullets,
        ship.x + Math.cos(ship.angle) * 12,
        ship.y + Math.sin(ship.angle) * 12,
        Math.cos(ship.angle) * 6 + ship.velX,
        Math.sin(ship.angle) * 6 + ship.velY,
        60,
      );
      ship.cooldown = ship.rapidFire > 0 ? 5 : 15;
      playSound(880);
      if ('vibrate' in navigator) navigator.vibrate(10);
    }

    function destroyShip() {
      if (ship.hitCooldown > 0) return;
      if (ship.shield > 0) {
        ship.shield = 0;
        spawnParticles(ship.x, ship.y, 20, 'cyan');
      } else {
        spawnParticles(ship.x, ship.y, 40, 'orange', 'debris');
        lives -= 1;
        ga.death();
        playSound(110);
        if ('vibrate' in navigator) navigator.vibrate(200);
        ship.x = canvas.width / 2;
        ship.y = canvas.height / 2;
        ship.velX = 0;
        ship.velY = 0;
        ship.angle = 0;
        multiplier = 1;
      }
      ship.hitCooldown = COLLISION_COOLDOWN;
      if (lives < 0) {
        lives = 3;
        score = 0;
        level = 1;
        asteroids.length = 0;
        powerUps.length = 0;
        startLevel();
        ga.start();
      }
    }

    function destroyAsteroid(index) {
      const a = asteroids[index];
      spawnParticles(a.x, a.y, 20, 'white', 'debris');
      score += 100 * multiplier;
      multiplier = Math.min(multiplier + 1, MAX_MULTIPLIER);
      multiplierTimer = MULTIPLIER_TIMEOUT;
      ga.split(a.r);
      if (a.r > 20) {
        for (let i = 0; i < 2; i += 1) {
          const angle = rand() * Math.PI * 2;
          asteroids.push({ x: a.x, y: a.y, dx: Math.cos(angle) * 2, dy: Math.sin(angle) * 2, r: a.r / 2 });
        }
      }
      asteroids.splice(index, 1);
      playSound(440);
      if ('vibrate' in navigator) navigator.vibrate(50);
      if (rand() < 0.1) spawnPowerUp(powerUps, a.x, a.y);
      if (score >= extraLifeScore) {
        lives += 1;
        extraLifeScore += 10000;
      }
      if (!asteroids.length) {
        level += 1;
        ga.level_up();
        startLevel();
      }
    }

    function destroyUfo() {
      spawnParticles(ufo.x, ufo.y, 40, 'purple', 'debris');
      ufo.active = false;
      playSound(220);
      score += 500 * multiplier;
      multiplier = Math.min(multiplier + 1, MAX_MULTIPLIER);
      multiplierTimer = MULTIPLIER_TIMEOUT;
    }

    const update = () => {
      if (pausedRef.current) {
        requestRef.current = requestAnimationFrame(update);
        return;
      }
      pollGamepad();
      const { keys, joystick, fire, hyperspace: hyper } = controlsRef.current;
      const turn =
        (keys.ArrowLeft ? -1 : 0) +
        (keys.ArrowRight ? 1 : 0) +
        padState.turn +
        (joystick.active ? joystick.x : 0);
      const thrust =
        (keys.ArrowUp ? 1 : 0) +
        padState.thrust +
        (joystick.active ? -joystick.y : 0);
      if (fire) {
        fireBullet();
        controlsRef.current.fire = false;
      }
      if (hyper) {
        hyperspace();
        controlsRef.current.hyperspace = false;
      }
      if (padState.fire) fireBullet();
      if (padState.hyperspace) hyperspace();

      ship.angle += turn * 0.05;
      if (thrust > 0) {
        ship.velX += Math.cos(ship.angle) * THRUST * thrust;
        ship.velY += Math.sin(ship.angle) * THRUST * thrust;
        spawnParticles(
          ship.x - Math.cos(ship.angle) * 12,
          ship.y - Math.sin(ship.angle) * 12,
          3,
          EXHAUST_COLOR,
          'flame',
          ship.angle,
        );
      }
      ship.velX *= INERTIA;
      ship.velY *= INERTIA;
      ship.x = wrap(ship.x + ship.velX, canvas.width, ship.r);
      ship.y = wrap(ship.y + ship.velY, canvas.height, ship.r);
      ship.cooldown = Math.max(0, ship.cooldown - 1);
      ship.rapidFire = Math.max(0, ship.rapidFire - 1);
      ship.shield = Math.max(0, ship.shield - 1);
      ship.hitCooldown = Math.max(0, ship.hitCooldown - 1);

      if (multiplierTimer > 0) multiplierTimer -= 1;
      else multiplier = 1;
      if (waveBannerTimer > 0) waveBannerTimer -= 1;

      updateBullets(bullets);
      updatePowerUps(powerUps);

      asteroids.forEach((a) => {
        a.x = wrap(a.x + a.dx, canvas.width, a.r);
        a.y = wrap(a.y + a.dy, canvas.height, a.r);
      });

      // UFO logic
      if (ufo.active) {
        ufo.x += ufo.dx;
        ufo.y += ufo.dy;
        ufo.cooldown -= 1;
        if (ufo.cooldown <= 0) {
          const angle = Math.atan2(ship.y - ufo.y, ship.x - ufo.x);
          ufoBullets.push({ x: ufo.x, y: ufo.y, dx: Math.cos(angle) * 3, dy: Math.sin(angle) * 3, r: 2, life: 120 });
          ufo.cooldown = 90;
          playSound(660);
        }
        if (ufo.x < -50 || ufo.x > canvas.width + 50) ufo.active = false;
      } else if (ufoTimer-- <= 0) {
        ufo.active = true;
        ufo.y = Math.random() * canvas.height;
        ufo.x = Math.random() < 0.5 ? -20 : canvas.width + 20;
        ufo.dx = ufo.x < 0 ? 1.5 : -1.5;
        ufo.dy = 0;
        ufo.cooldown = 90;
        ufoTimer = Math.max(300, 900 - level * 60);
      }
      ufoBullets.forEach((b) => {
        b.x += b.dx;
        b.y += b.dy;
        b.life -= 1;
      });
      for (let i = ufoBullets.length - 1; i >= 0; i -= 1) if (ufoBullets[i].life <= 0) ufoBullets.splice(i, 1);

      particles.forEach((p) => {
        if (!p.active) return;
        p.x += p.dx;
        p.y += p.dy;
        p.angle += p.spin;
        p.life -= 1;
        if (p.life <= 0) p.active = false;
      });

      // Collision detection using quadtree
      const qt = new Quadtree(0, 0, canvas.width, canvas.height);
      asteroids.forEach((a) => qt.insert(a));
      ufo.active && qt.insert(ufo);

      bullets.forEach((b) => {
        if (!b.active) return;
        qt.retrieve(b).forEach((obj) => {
          if (obj === b) return;
          const dist = Math.hypot(obj.x - b.x, obj.y - b.y);
          if (dist < obj.r + b.r) {
            if (obj === ufo) destroyUfo();
            else {
              const index = asteroids.indexOf(obj);
              if (index >= 0) destroyAsteroid(index);
            }
            b.active = false;
          }
        });
      });

      qt.retrieve(ship).forEach((obj) => {
        if (obj === ship) return;
        const dist = Math.hypot(obj.x - ship.x, obj.y - ship.y);
        if (dist < obj.r + ship.r) destroyShip();
      });

      ufoBullets.forEach((b) => {
        const dist = Math.hypot(b.x - ship.x, b.y - ship.y);
        if (dist < b.r + ship.r) destroyShip();
      });

      powerUps.forEach((p, i) => {
        const dist = Math.hypot(p.x - ship.x, p.y - ship.y);
        if (dist < p.r + ship.r) {
        if (p.type === POWER_UPS.SHIELD) ship.shield = SHIELD_DURATION;
          else ship.rapidFire = 600;
          powerUps.splice(i, 1);
        }
      });

      // Rendering
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Ship
      ctx.save();
      ctx.translate(ship.x, ship.y);
      ctx.rotate(ship.angle);
      ctx.beginPath();
      ctx.moveTo(12, 0);
      ctx.lineTo(-12, 8);
      ctx.lineTo(-12, -8);
      ctx.closePath();
      ctx.strokeStyle = 'white';
      ctx.stroke();
      ctx.restore();
      if (ship.shield > 0) {
        const ratio = ship.shield / SHIELD_DURATION;
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(0,255,255,0.3)';
        ctx.arc(ship.x, ship.y, ship.r + 4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.strokeStyle = 'cyan';
        ctx.arc(
          ship.x,
          ship.y,
          ship.r + 4,
          -Math.PI / 2,
          -Math.PI / 2 + Math.PI * 2 * ratio
        );
        ctx.stroke();
      }

      // Bullets
      ctx.fillStyle = 'white';
      bullets.forEach((b) => {
        if (!b.active) return;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
      });

      // Asteroids
      ctx.strokeStyle = 'white';
      asteroids.forEach((a) => {
        ctx.beginPath();
        ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2);
        ctx.stroke();
      });

      // Power-ups
      powerUps.forEach((p) => {
        ctx.beginPath();
        ctx.strokeStyle = p.type === POWER_UPS.SHIELD ? 'cyan' : 'yellow';
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.stroke();
      });

      // UFO
      if (ufo.active) {
        ctx.beginPath();
        ctx.arc(ufo.x, ufo.y, ufo.r, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = 'white';
      ufoBullets.forEach((b) => {
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
      });

      // Particles
      ctx.save();
      particles.forEach((p) => {
        if (!p.active) return;
        ctx.globalAlpha = p.life / p.maxLife;
        ctx.fillStyle = p.color;
        if (p.type === 'flame') {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.angle);
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(-p.size, p.size / 2);
          ctx.lineTo(-p.size, -p.size / 2);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        } else {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.angle);
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          ctx.restore();
        }
      });
      ctx.restore();

      // Radar inset
      if (!reduceMotion) {
        const radarSize = 80;
        const radarX = canvas.width - radarSize - 10;
        const radarY = 10;
        ctx.save();
        ctx.strokeStyle = RADAR_COLORS.outline;
        ctx.strokeRect(radarX, radarY, radarSize, radarSize);
        const scaleX = radarSize / canvas.width;
        const scaleY = radarSize / canvas.height;
        ctx.fillStyle = RADAR_COLORS.ship;
        ctx.fillRect(radarX + ship.x * scaleX - 1, radarY + ship.y * scaleY - 1, 3, 3);
        ctx.fillStyle = RADAR_COLORS.asteroid;
        asteroids.forEach((a) => {
          ctx.fillRect(radarX + a.x * scaleX - 1, radarY + a.y * scaleY - 1, 2, 2);
        });
        if (ufo.active) {
          ctx.fillStyle = RADAR_COLORS.ufo;
          ctx.fillRect(radarX + ufo.x * scaleX - 1, radarY + ufo.y * scaleY - 1, 3, 3);
        }
        ctx.restore();
      }

      // HUD
      ctx.fillStyle = 'white';
      ctx.font = '16px monospace';
      ctx.fillText(`Score: ${score} x${multiplier}`, 10, 20);
      ctx.fillText(`Lives: ${lives}`, 10, 40);

      if (waveBannerTimer > 0) {
        ctx.save();
        ctx.globalAlpha = Math.min(1, waveBannerTimer / 30);
        ctx.fillStyle = 'white';
        ctx.font = '24px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(waveBannerText, canvas.width / 2, canvas.height / 2);
        ctx.restore();
      }

      announce();
      requestRef.current = requestAnimationFrame(update);
    };

    function cleanup() {
      cancelAnimationFrame(requestRef.current);
      window.removeEventListener('resize', resize);
    }

    requestRef.current = requestAnimationFrame(update);
    return cleanup;
  }, [controlsRef, dpr, restartKey]);
  const togglePause = () => {
    pausedRef.current = !pausedRef.current;
    setPaused(pausedRef.current);
  };

  const restartGame = () => {
    pausedRef.current = false;
    setPaused(false);
    setRestartKey((k) => k + 1);
  };

  return (
    <GameLayout paused={paused} onPause={togglePause} onRestart={restartGame}>
      <canvas ref={canvasRef} className="bg-black w-full h-full touch-none" />
      <div aria-live="polite" className="sr-only">
        {liveText}
      </div>
    </GameLayout>
  );
};

export default Asteroids;

