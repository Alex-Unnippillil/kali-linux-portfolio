'use client';
import React, { useRef, useEffect, useState } from 'react';
import Player from '../../apps/space-invaders/player';
import Invader from '../../apps/space-invaders/invader';
import Projectile from '../../apps/space-invaders/projectile';
import Shield from '../../apps/space-invaders/shield';
import Mothership from '../../apps/space-invaders/mothership';
import Particle from '../../apps/space-invaders/particle';

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
  const wave = useRef(1);
  const gameOver = useRef(false);
  const audioCtxRef = useRef(null);
  const particlesRef = useRef([]);
  const framesRef = useRef([]);
  const replayFramesRef = useRef([]);
  const replayIndexRef = useRef(0);
  const replayingRef = useRef(false);
  const loopRef = useRef(null);
  const highScoreRef = useRef(0);
  const [crt, setCrt] = useState(true);
  const [showReplay, setShowReplay] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    const w = canvas.width;
    const h = canvas.height;

    playerRef.current = new Player(w / 2 - 10, h - 30);
    highScoreRef.current = parseInt(
      localStorage.getItem('siHighScore') || '0',
      10
    );
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

    const spawnExplosion = (x, y, color) => {
      if (!crt) return;
      for (let i = 0; i < 10; i += 1) {
        particlesRef.current.push(new Particle(x, y, color));
      }
    };

    spawnWave();
    spawnShields();
    framesRef.current = [];
    Mothership.resetTimer();

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
      localStorage.setItem('siReplay', JSON.stringify(framesRef.current));
      if (playerRef.current.score > highScoreRef.current) {
        highScoreRef.current = playerRef.current.score;
        localStorage.setItem('siHighScore', String(highScoreRef.current));
      }
      setShowReplay(true);
    };

    let last = performance.now();
    const loop = (time) => {
      const dt = (time - last) / 1000;
      last = time;

      const p = playerRef.current;
      if (replayingRef.current) {
        const frame = replayFramesRef.current[replayIndexRef.current++];
        if (!frame) {
          replayingRef.current = false;
          return;
        }
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = 'white';
        ctx.fillRect(frame.p.x, frame.p.y, p.w, p.h);
        frame.invaders.forEach((inv) => {
          if (inv.alive) {
            ctx.fillStyle = inv.hp > 1 ? 'purple' : 'lime';
            ctx.fillRect(inv.x, inv.y, inv.w, inv.h);
          }
        });
        frame.playerBullets.forEach((b) => {
          ctx.fillStyle = 'red';
          ctx.fillRect(b.x, b.y, 2, 4);
        });
        frame.enemyBullets.forEach((b) => {
          ctx.fillStyle = 'yellow';
          ctx.fillRect(b.x, b.y, 2, 4);
        });
        if (crt)
          frame.particles.forEach((pt) => {
            ctx.fillStyle = pt.color;
            ctx.fillRect(pt.x, pt.y, 2, 2);
          });
        reqRef.current = requestAnimationFrame(loop);
        return;
      }

      p.update(dt);
      let dir =
        (keys.current['ArrowRight'] || touch.current.right ? 1 : 0) -
        (keys.current['ArrowLeft'] || touch.current.left ? 1 : 0);
      let fire = keys.current['Space'] || touch.current.fire;
      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      const gp = pads && pads[0];
      if (gp) {
        const axis = gp.axes[0] || 0;
        if (axis > 0.2) dir = 1;
        else if (axis < -0.2) dir = -1;
        if (gp.buttons[0] && gp.buttons[0].pressed) fire = true;
      }
      if (dir) p.move(dir, dt, w);

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
          Projectile.get(inv.x + inv.w / 2, inv.y + inv.h, 150 * difficulty)
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
          const totalRows = invaderRowsRef.current.length;
          const aliveRows = invaderRowsRef.current.filter((row) =>
            row.some((i) => i.alive)
          ).length;
          const drop = 10 + (totalRows - aliveRows) * 5;
          invadersRef.current.forEach((inv) => {
            if (inv.alive) inv.y += drop;
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
      particlesRef.current.forEach((pt) => pt.update(dt));
      particlesRef.current = particlesRef.current.filter((pt) => pt.alive);
      if (mothershipRef.current) {
        mothershipRef.current.update(dt, w);
        if (!mothershipRef.current.active) mothershipRef.current = null;
      }
      if (!mothershipRef.current) {
        const m = Mothership.tick(dt, w);
        if (m) mothershipRef.current = m;
      }

      playerBulletsRef.current.forEach((b) => {
        if (!b.active) return;
        for (const s of shieldsRef.current) {
          if (s.alive && b.collides(s)) {
            s.hit(b.x, b.y);
            b.release();
            spawnExplosion(b.x, b.y, 'yellow');
            break;
          }
        }
        if (!b.active) return;
        if (mothershipRef.current && b.collides(mothershipRef.current)) {
          mothershipRef.current.active = false;
          b.release();
          p.addScore(50);
          playSound(500);
          spawnExplosion(
            mothershipRef.current.x + mothershipRef.current.w / 2,
            mothershipRef.current.y + mothershipRef.current.h / 2,
            'red'
          );
          return;
        }
        for (const inv of invadersRef.current) {
          if (inv.alive && b.collides(inv)) {
            inv.hit();
            b.release();
            if (!inv.alive) {
              p.addScore(10);
              playSound(220);
              spawnExplosion(inv.x + inv.w / 2, inv.y + inv.h / 2, 'lime');
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
            s.hit(b.x, b.y);
            b.release();
            blocked = true;
            spawnExplosion(b.x, b.y, 'yellow');
            break;
          }
        }
        if (blocked) continue;
        if (b.collides(p)) {
          b.release();
          playSound(110);
          spawnExplosion(p.x + p.w / 2, p.y, 'white');
          if (p.takeHit()) {
            spawnExplosion(p.x + p.w / 2, p.y, 'red');
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
        Mothership.resetTimer();
      }

      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = 'white';
      ctx.fillRect(p.x, p.y, p.w, p.h);

      const batchRects = (items, color) => {
        if (!items.length) return;
        ctx.fillStyle = color;
        ctx.beginPath();
        items.forEach((it) => ctx.rect(it.x, it.y, it.w, it.h));
        ctx.fill();
      };
      const strongInv = invadersRef.current.filter(
        (inv) => inv.alive && inv.hp > 1
      );
      const weakInv = invadersRef.current.filter(
        (inv) => inv.alive && inv.hp <= 1
      );
      batchRects(strongInv, 'purple');
      batchRects(weakInv, 'lime');
      if (mothershipRef.current) mothershipRef.current.draw(ctx);
      shieldsRef.current.forEach((s) => s.draw(ctx));
      const activePlayerBullets = playerBulletsRef.current.filter((b) => b.active);
      const activeEnemyBullets = enemyBulletsRef.current.filter((b) => b.active);
      batchRects(
        activePlayerBullets.map((b) => ({ x: b.x - 1, y: b.y - 4, w: 2, h: 4 })),
        'red'
      );
      batchRects(
        activeEnemyBullets.map((b) => ({ x: b.x - 1, y: b.y - 4, w: 2, h: 4 })),
        'yellow'
      );
      powerUpsRef.current.forEach((pu) => {
        ctx.fillStyle = pu.type === 'shield' ? 'cyan' : 'orange';
        ctx.fillRect(pu.x, pu.y, 10, 10);
      });
      if (crt) particlesRef.current.forEach((pt) => pt.draw(ctx));

      ctx.fillStyle = 'white';
      ctx.fillText(`Score: ${p.score}`, 10, 20);
      ctx.fillText(`High: ${highScoreRef.current}`, w - 80, 20);
      ctx.fillText(`Accuracy: ${Math.round(p.accuracy() * 100)}%`, 10, 40);
      if (!replayingRef.current)
        framesRef.current.push({
          p: { x: p.x, y: p.y },
          invaders: invadersRef.current.map((inv) => ({
            x: inv.x,
            y: inv.y,
            w: inv.w,
            h: inv.h,
            alive: inv.alive,
            hp: inv.hp,
          })),
          playerBullets: playerBulletsRef.current.map((b) => ({ x: b.x, y: b.y })),
          enemyBullets: enemyBulletsRef.current.map((b) => ({ x: b.x, y: b.y })),
          particles: particlesRef.current.map((pt) => ({
            x: pt.x,
            y: pt.y,
            color: pt.color,
          })),
        });

      if (!gameOver.current) reqRef.current = requestAnimationFrame(loop);
    };

    loopRef.current = loop;
    reqRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(reqRef.current);
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('keyup', handleKey);
    };
    }, [crt]);

  const touchStart = (key) => () => {
    touch.current[key] = true;
  };
  const touchEnd = (key) => () => {
    touch.current[key] = false;
  };

  return (
    <div className={`h-full w-full relative bg-black text-white ${crt ? 'crt' : ''}`}>
      <canvas ref={canvasRef} className="w-full h-full" />
      <div className="absolute top-2 right-2 flex gap-2">
        <button
          className="bg-gray-700 px-2 py-1 rounded"
          onClick={() => setCrt((e) => !e)}
        >
          {crt ? 'CRT On' : 'CRT Off'}
        </button>
        {showReplay && (
          <button
            className="bg-gray-700 px-2 py-1 rounded"
            onClick={() => {
              replayFramesRef.current = JSON.parse(
                localStorage.getItem('siReplay') || '[]'
              );
              replayIndexRef.current = 0;
              replayingRef.current = true;
              gameOver.current = false;
              reqRef.current = requestAnimationFrame(loopRef.current);
              setShowReplay(false);
            }}
          >
            Replay
          </button>
        )}
      </div>
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
