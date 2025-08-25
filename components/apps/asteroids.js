import React, { useRef, useEffect } from 'react';
import { withGameErrorBoundary } from './GameErrorBoundary';
import { wrap, createBulletPool, spawnBullet, updateBullets, createGA } from './asteroids-utils';

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

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    function resize() {
      const { clientWidth, clientHeight } = canvas;
      canvas.width = clientWidth * dpr;
      canvas.height = clientHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    resize();
    window.addEventListener('resize', resize);

    // Game state
    const keys = {};
    const ship = { x: canvas.width / 2, y: canvas.height / 2, angle: 0, velX: 0, velY: 0, r: 10, cooldown: 0 };
    let lives = 3;
    let score = 0;
    let level = 1;
    let extraLifeScore = 10000;
    const bullets = createBulletPool(40);
    const asteroids = [];
    const ga = createGA();
    const particles = Array.from({ length: 256 }, () => ({ active: false, x: 0, y: 0, dx: 0, dy: 0, life: 0, color: 'white' }));
    const ufo = { active: false, x: 0, y: 0, dx: 0, dy: 0, r: 15, cooldown: 0 };
    const ufoBullets = [];
    let ufoTimer = 600; // frames until next UFO

    // Particle pooling
    const spawnParticles = (x, y, count, color = 'white') => {
      for (let i = 0; i < particles.length && count > 0; i += 1) {
        const p = particles[i];
        if (!p.active) {
          const a = Math.random() * Math.PI * 2;
          const speed = Math.random() * 2 + 1;
          p.active = true;
          p.x = x;
          p.y = y;
          p.dx = Math.cos(a) * speed;
          p.dy = Math.sin(a) * speed;
          p.life = 30;
          p.color = color;
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
    const spawnAsteroids = (count) => {
      for (let i = 0; i < count; i += 1) {
        const angle = Math.random() * Math.PI * 2;
        const r = 15 + Math.random() * 25;
        asteroids.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          dx: Math.cos(angle) * (1 + level * 0.2),
          dy: Math.sin(angle) * (1 + level * 0.2),
          r,
        });
      }
    };

    spawnAsteroids(4);
    ga.start();

    // Input handling
    const handleKeyDown = (e) => {
      keys[e.code] = true;
      if (e.code === 'Space') fireBullet();
      if (e.code === 'ShiftLeft') hyperspace();
    };
    const handleKeyUp = (e) => {
      keys[e.code] = false;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Mobile joystick
    const joystick = { active: false, id: null, sx: 0, sy: 0, x: 0, y: 0 };
    canvas.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch' && !joystick.active) {
        joystick.active = true;
        joystick.id = e.pointerId;
        joystick.sx = e.clientX;
        joystick.sy = e.clientY;
      } else if (e.pointerType === 'touch') {
        fireBullet();
      }
    });
    canvas.addEventListener('pointermove', (e) => {
      if (e.pointerId === joystick.id) {
        joystick.x = (e.clientX - joystick.sx) / 40;
        joystick.y = (e.clientY - joystick.sy) / 40;
      }
    });
    canvas.addEventListener('pointerup', (e) => {
      if (e.pointerId === joystick.id) {
        joystick.active = false;
        joystick.x = 0;
        joystick.y = 0;
      }
    });

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
      ship.x = Math.random() * canvas.width;
      ship.y = Math.random() * canvas.height;
      if (Math.random() < 0.1) destroyShip();
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
      ship.cooldown = 15;
      playSound(880);
    }

    function destroyShip() {
      spawnParticles(ship.x, ship.y, 40, 'orange');
      lives -= 1;
      ga.death();
      playSound(110);
      ship.x = canvas.width / 2;
      ship.y = canvas.height / 2;
      ship.velX = 0;
      ship.velY = 0;
      ship.angle = 0;
      if (lives < 0) {
        lives = 3;
        score = 0;
        level = 1;
        asteroids.length = 0;
        spawnAsteroids(4);
        ga.start();
      }
    }

    function destroyAsteroid(index) {
      const a = asteroids[index];
      spawnParticles(a.x, a.y, 20, 'white');
      score += 100;
      ga.split(a.r);
      if (a.r > 20) {
        for (let i = 0; i < 2; i += 1) {
          const angle = Math.random() * Math.PI * 2;
          asteroids.push({ x: a.x, y: a.y, dx: Math.cos(angle) * 2, dy: Math.sin(angle) * 2, r: a.r / 2 });
        }
      }
      asteroids.splice(index, 1);
      playSound(440);
      if (score >= extraLifeScore) {
        lives += 1;
        extraLifeScore += 10000;
      }
      if (!asteroids.length) {
        level += 1;
        ga.level_up();
        spawnAsteroids(3 + level);
      }
    }

    function destroyUfo() {
      spawnParticles(ufo.x, ufo.y, 40, 'purple');
      ufo.active = false;
      playSound(220);
      score += 500;
    }

    const update = () => {
      pollGamepad();
      const turn = (keys.ArrowLeft ? -1 : 0) + (keys.ArrowRight ? 1 : 0) + padState.turn + (joystick.active ? joystick.x : 0);
      const thrust = (keys.ArrowUp ? 1 : 0) + padState.thrust + (joystick.active ? -joystick.y : 0);
      if (padState.fire) fireBullet();
      if (padState.hyperspace) hyperspace();

      ship.angle += turn * 0.05;
      if (thrust > 0) {
        ship.velX += Math.cos(ship.angle) * 0.1 * thrust;
        ship.velY += Math.sin(ship.angle) * 0.1 * thrust;
        spawnParticles(ship.x - Math.cos(ship.angle) * 10, ship.y - Math.sin(ship.angle) * 10, 1, 'gray');
      }
      ship.velX *= 0.99;
      ship.velY *= 0.99;
      ship.x += ship.velX;
      ship.y += ship.velY;
      ship.cooldown = Math.max(0, ship.cooldown - 1);
      ship.x = wrap(ship.x, canvas.width);
      ship.y = wrap(ship.y, canvas.height);

      updateBullets(bullets);

      asteroids.forEach((a) => {
        a.x += a.dx;
        a.y += a.dy;
        if (a.x < -a.r) a.x = canvas.width + a.r;
        if (a.x > canvas.width + a.r) a.x = -a.r;
        if (a.y < -a.r) a.y = canvas.height + a.r;
        if (a.y > canvas.height + a.r) a.y = -a.r;
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
        ufoTimer = 900 - level * 30;
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
      particles.forEach((p) => {
        if (!p.active) return;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, 2, 2);
      });

      // HUD
      ctx.fillStyle = 'white';
      ctx.font = '16px monospace';
      ctx.fillText(`Score: ${score}`, 10, 20);
      ctx.fillText(`Lives: ${lives}`, 10, 40);

      requestRef.current = requestAnimationFrame(update);
    };

    function cleanup() {
      cancelAnimationFrame(requestRef.current);
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      canvas.removeEventListener('pointerdown', () => {});
      canvas.removeEventListener('pointermove', () => {});
      canvas.removeEventListener('pointerup', () => {});
    }

    requestRef.current = requestAnimationFrame(update);
    return cleanup;
  }, [dpr]);

  return <canvas ref={canvasRef} className="bg-black w-full h-full touch-none" />;
};

const AsteroidsWithBoundary = withGameErrorBoundary(Asteroids);

export default AsteroidsWithBoundary;

