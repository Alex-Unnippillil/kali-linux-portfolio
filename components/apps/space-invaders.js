import React, { useRef, useEffect } from 'react';
import Player from '../../apps/space-invaders/player';
import Invader from '../../apps/space-invaders/invader';
import Projectile from '../../apps/space-invaders/projectile';
import Shield from '../../apps/space-invaders/shield';
import Mothership from '../../apps/space-invaders/mothership';

const SpaceInvaders = () => {
  const canvasRef = useRef(null);
  const reqRef = useRef();
  const keys = useRef({});
  const touch = useRef({ left: false, right: false, fire: false });
  const playerRef = useRef(null);
  const invadersRef = useRef([]);
  const invaderRowsRef = useRef([]);
  const playerBulletsRef = useRef([]);
  const enemyBulletsRef = useRef([]);
  const powerUpsRef = useRef([]);
  const shieldsRef = useRef([]);
  const mothershipRef = useRef(null);
  const enemyDir = useRef(1);
  const enemyCooldown = useRef(1);
  const moveTimer = useRef(0);
  const stepIndex = useRef(0);
  const totalInvaders = useRef(0);
  const mothershipTimer = useRef(10);
  const wave = useRef(1);
  const gameOver = useRef(false);
  const audioCtxRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    const w = canvas.width;
    const h = canvas.height;

    playerRef.current = new Player(w / 2 - 10, h - 30);
    audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    const playSound = (freq) => {
      const actx = audioCtxRef.current;
      const osc = actx.createOscillator();
      const gain = actx.createGain();
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(actx.destination);
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + 0.2);
      osc.stop(actx.currentTime + 0.2);
    };
    const stepSounds = [260, 280, 300, 320];

    const spawnWave = () => {
      invaderRowsRef.current = [];
      if (wave.current % 3 === 0) {
        invaderRowsRef.current.push([
          new Invader(w / 2 - 30, 50, 60, 30, 20),
        ]);
      } else {
        const rows = 4;
        const cols = 8;
        for (let r = 0; r < rows; r += 1) {
          const row = [];
          for (let c = 0; c < cols; c += 1) {
            row.push(new Invader(30 + c * 30, 30 + r * 30));
          }
          invaderRowsRef.current.push(row);
        }
      }
      invadersRef.current = invaderRowsRef.current.flat();
      totalInvaders.current = invadersRef.current.length;
      moveTimer.current = 0;
      enemyDir.current = 1;
    };

    const spawnShields = () => {
      shieldsRef.current = [];
      const count = 3;
      for (let i = 0; i < count; i += 1) {
        const sx = (w / (count + 1)) * (i + 1) - 15;
        shieldsRef.current.push(new Shield(sx, h - 80));
      }
    };

    const spawnMothership = () => {
      const dir = Math.random() < 0.5 ? 1 : -1;
      mothershipRef.current = new Mothership(w, dir);
    };

    spawnWave();
    spawnShields();

    const handleKey = (e) => {
      keys.current[e.code] = e.type === 'keydown';
    };
    window.addEventListener('keydown', handleKey);
    window.addEventListener('keyup', handleKey);

    const endGame = () => {
      if (gameOver.current) return;
      gameOver.current = true;
      cancelAnimationFrame(reqRef.current);
      fetch('/api/space-invaders/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          score: playerRef.current.score,
          accuracy: playerRef.current.accuracy(),
        }),
      }).catch(() => {});
    };

    let last = performance.now();
    const loop = (time) => {
      const dt = (time - last) / 1000;
      last = time;

      const p = playerRef.current;
      p.update(dt);
      const dir =
        (keys.current['ArrowRight'] || touch.current.right ? 1 : 0) -
        (keys.current['ArrowLeft'] || touch.current.left ? 1 : 0);
      if (dir) p.move(dir, dt, w);

      const fire = keys.current['Space'] || touch.current.fire;
      if (fire) {
        const before = p.shots;
        p.shoot(playerBulletsRef.current);
        if (p.shots > before) playSound(440);
      }

      enemyCooldown.current -= dt;
      const difficulty = 1 + p.accuracy() + wave.current * 0.1;
      if (enemyCooldown.current <= 0 && invadersRef.current.some((i) => i.alive)) {
        const shooters = invadersRef.current.filter((i) => i.alive);
        const inv = shooters[Math.floor(Math.random() * shooters.length)];
        enemyBulletsRef.current.push(
          new Projectile(inv.x + inv.w / 2, inv.y + inv.h, 150 * difficulty)
        );
        enemyCooldown.current = Math.max(0.2, 1 / difficulty);
      }

      moveTimer.current -= dt;
      const alive = invadersRef.current.filter((i) => i.alive).length;
      if (moveTimer.current <= 0 && alive) {
        playSound(stepSounds[stepIndex.current]);
        stepIndex.current = (stepIndex.current + 1) % stepSounds.length;
        let hitEdge = false;
        invadersRef.current.forEach((inv) => {
          if (!inv.alive) return;
          inv.x += enemyDir.current * 10;
          if (inv.x < 10 || inv.x + inv.w > w - 10) hitEdge = true;
        });
        if (hitEdge) {
          enemyDir.current *= -1;
          invadersRef.current.forEach((inv) => {
            if (inv.alive) inv.y += 10;
          });
        }
        const ratio = alive / totalInvaders.current;
        moveTimer.current = Math.max(0.05, 0.5 * ratio);
      }

      playerBulletsRef.current.forEach((b) => b.update(dt, h));
      enemyBulletsRef.current.forEach((b) => b.update(dt, h));
      powerUpsRef.current.forEach((pu) => {
        pu.y += 40 * dt;
      });
      if (mothershipRef.current) {
        mothershipRef.current.update(dt, w);
        if (!mothershipRef.current.active) mothershipRef.current = null;
      }
      mothershipTimer.current -= dt;
      if (!mothershipRef.current && mothershipTimer.current <= 0) {
        spawnMothership();
        mothershipTimer.current = 20 + Math.random() * 20;
      }

      playerBulletsRef.current.forEach((b) => {
        if (!b.active) return;
        for (const s of shieldsRef.current) {
          if (s.alive && b.collides(s)) {
            s.hit();
            b.active = false;
            break;
          }
        }
        if (!b.active) return;
        if (mothershipRef.current && b.collides(mothershipRef.current)) {
          mothershipRef.current.active = false;
          b.active = false;
          p.addScore(50);
          playSound(500);
          return;
        }
        for (const inv of invadersRef.current) {
          if (inv.alive && b.collides(inv)) {
            inv.hit();
            b.active = false;
            if (!inv.alive) {
              p.addScore(10);
              playSound(220);
              if (Math.random() < 0.1) {
                powerUpsRef.current.push({
                  x: inv.x,
                  y: inv.y,
                  type: Math.random() < 0.5 ? 'shield' : 'rapid',
                  active: true,
                });
              }
            }
            break;
          }
        }
      });

      for (const b of enemyBulletsRef.current) {
        let blocked = false;
        for (const s of shieldsRef.current) {
          if (s.alive && b.collides(s)) {
            s.hit();
            b.active = false;
            blocked = true;
            break;
          }
        }
        if (blocked) continue;
        if (b.collides(p)) {
          b.active = false;
          playSound(110);
          if (p.takeHit()) {
            endGame();
            return;
          }
        }
      }

      powerUpsRef.current.forEach((pu) => {
        if (
          pu.active &&
          p.x < pu.x + 10 &&
          p.x + p.w > pu.x &&
          p.y < pu.y + 10 &&
          p.y + p.h > pu.y
        ) {
          p.applyPowerUp(pu.type);
          pu.active = false;
          playSound(880);
        }
      });

      playerBulletsRef.current = playerBulletsRef.current.filter((b) => b.active);
      enemyBulletsRef.current = enemyBulletsRef.current.filter((b) => b.active);
      powerUpsRef.current = powerUpsRef.current.filter((pu) => pu.active && pu.y < h);
      shieldsRef.current = shieldsRef.current.filter((s) => s.alive);

      if (invadersRef.current.every((inv) => !inv.alive)) {
        wave.current += 1;
        spawnWave();
      }

      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = 'white';
      ctx.fillRect(p.x, p.y, p.w, p.h);
      invadersRef.current.forEach((inv) => {
        ctx.fillStyle = inv.hp > 1 ? 'purple' : 'lime';
        inv.draw(ctx);
      });
      if (mothershipRef.current) mothershipRef.current.draw(ctx);
      shieldsRef.current.forEach((s) => s.draw(ctx));
      playerBulletsRef.current.forEach((b) => b.draw(ctx, 'red'));
      enemyBulletsRef.current.forEach((b) => b.draw(ctx, 'yellow'));
      powerUpsRef.current.forEach((pu) => {
        ctx.fillStyle = pu.type === 'shield' ? 'cyan' : 'orange';
        ctx.fillRect(pu.x, pu.y, 10, 10);
      });

      ctx.fillStyle = 'white';
      ctx.fillText(`Score: ${p.score}`, 10, 20);
      ctx.fillText(`Accuracy: ${Math.round(p.accuracy() * 100)}%`, 10, 40);

      if (!gameOver.current) reqRef.current = requestAnimationFrame(loop);
    };

    reqRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(reqRef.current);
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('keyup', handleKey);
    };
  }, []);

  const touchStart = (key) => () => {
    touch.current[key] = true;
  };
  const touchEnd = (key) => () => {
    touch.current[key] = false;
  };

  return (
    <div className="h-full w-full relative bg-black text-white">
      <canvas ref={canvasRef} className="w-full h-full" />
      <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-8 md:hidden">
        <button
          className="bg-gray-700 px-4 py-2 rounded"
          onTouchStart={touchStart('left')}
          onTouchEnd={touchEnd('left')}
        >
          ◀
        </button>
        <button
          className="bg-gray-700 px-4 py-2 rounded"
          onTouchStart={touchStart('fire')}
          onTouchEnd={touchEnd('fire')}
        >
          🔥
        </button>
        <button
          className="bg-gray-700 px-4 py-2 rounded"
          onTouchStart={touchStart('right')}
          onTouchEnd={touchEnd('right')}
        >
          ▶
        </button>
      </div>
    </div>
  );
};

export default SpaceInvaders;
