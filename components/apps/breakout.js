import React, { useRef, useEffect, useState } from 'react';
import Paddle from '../../apps/breakout/Paddle';
import Ball from '../../apps/breakout/Ball';
import Brick from '../../apps/breakout/Brick';

const rowsByDifficulty = { easy: 3, medium: 5, hard: 7 };
const speedByDifficulty = { easy: 150, medium: 200, hard: 250 };

const LevelEditor = ({ onSave, onCancel }) => {
  const rows = 6;
  const cols = 10;
  const [grid, setGrid] = useState(
    Array.from({ length: rows }, () => Array(cols).fill(0))
  );
  const [link, setLink] = useState('');
  const toggle = (r, c) => {
    setGrid((g) => {
      const ng = g.map((row) => row.slice());
      ng[r][c] = ng[r][c] ? 0 : 1;
      return ng;
    });
  };
  const save = async () => {
    await fetch('/api/breakout/levels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(grid),
    });
    const encoded = btoa(JSON.stringify(grid));
    const url = `${window.location.origin}${window.location.pathname}?layout=${encoded}`;
    setLink(url);
    onSave(grid);
  };
  return (
    <div className="p-2 space-y-2 text-white">
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
      >
        {grid.map((row, r) =>
          row.map((cell, c) => (
            <div
              key={`${r}-${c}`}
              onClick={() => toggle(r, c)}
              className={`w-8 h-4 border cursor-pointer ${cell ? 'bg-blue-500' : 'bg-gray-700'}`}
            />
          ))
        )}
      </div>
      <div className="space-x-2">
        <button
          type="button"
          onClick={save}
          className="px-2 py-1 bg-green-600"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-2 py-1 bg-red-600"
        >
          Back
        </button>
      </div>
      {link && (
        <div>
          <input
            type="text"
            readOnly
            value={link}
            className="w-full text-black px-1"
          />
        </div>
      )}
    </div>
  );
};

const Breakout = () => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [difficulty, setDifficulty] = useState('easy');
  const [editing, setEditing] = useState(false);
  const [customLayout, setCustomLayout] = useState(null);
  const [levels, setLevels] = useState([]);
  const replayRef = useRef([]);
  const elapsedRef = useRef(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const layoutParam = params.get('layout');
    if (layoutParam) {
      try {
        const parsed = JSON.parse(atob(layoutParam));
        setCustomLayout(parsed);
      } catch (e) {
        // ignore
      }
    }
  }, []);

  useEffect(() => {
    fetch('/api/breakout/levels')
      .then((res) => res.json())
      .then((data) => setLevels(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (editing) return; // don't run game loop while editing
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d');
    let width = container.clientWidth;
    let height = container.clientHeight;
    canvas.width = width;
    canvas.height = height;

    const resizeObserver = new ResizeObserver((entries) => {
      const cr = entries[0].contentRect;
      width = cr.width;
      height = cr.height;
      canvas.width = width;
      canvas.height = height;
      paddle.canvasWidth = width;
      balls.forEach((b) => {
        b.canvasWidth = width;
        b.canvasHeight = height;
      });
    });
    resizeObserver.observe(container);

    const paddle = new Paddle(width, height);
    const balls = [new Ball(width, height)];
    const bricks = [];
    const powerUps = [];
    const powerUpPool = [];
    let particles = [];
    let speedFactor = 1;
    replayRef.current = [];
    elapsedRef.current = 0;

    const layout = customLayout || levels[0] || null;
    const rows = layout ? layout.length : rowsByDifficulty[difficulty];
    const cols = 10;
    const bw = width / cols;
    const bh = 20;
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        if (layout && !layout[r][c]) continue;
        const types = ['multiball', 'laser', 'expand', 'sticky', 'slow'];
        const powerUp = Math.random() < 0.1 ? types[Math.floor(Math.random() * types.length)] : null;
        const hp = Math.random() < 0.05 ? 3 : 1;
        bricks.push(new Brick(c * bw, r * bh + 40, bw - 2, bh - 2, powerUp, hp));
      }
    }
    balls[0].vx *= speedByDifficulty[difficulty] / 150;
    balls[0].vy *= speedByDifficulty[difficulty] / 150;

    const keys = { left: false, right: false };
    const releaseBalls = () => {
      balls.forEach((b) => {
        if (b.stuck) {
          b.stuck = false;
          b.vx = 150 * (Math.random() > 0.5 ? 1 : -1);
          b.vy = -150;
        }
      });
    };
    const keyDown = (e) => {
      if (e.key === 'ArrowLeft') keys.left = true;
      if (e.key === 'ArrowRight') keys.right = true;
      if (e.key === ' ') {
        releaseBalls();
        paddle.shoot();
      }
    };
    const keyUp = (e) => {
      if (e.key === 'ArrowLeft') keys.left = false;
      if (e.key === 'ArrowRight') keys.right = false;
    };
    window.addEventListener('keydown', keyDown);
    window.addEventListener('keyup', keyUp);

    const pointerMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      paddle.x = e.clientX - rect.left - paddle.width / 2;
      if (paddle.x < 0) paddle.x = 0;
      if (paddle.x + paddle.width > width) paddle.x = width - paddle.width;
    };
    const pointerDown = () => {
      releaseBalls();
      paddle.shoot();
    };
    canvas.addEventListener('pointermove', pointerMove);
    canvas.addEventListener('pointerdown', pointerDown);

    let lastTime = 0;

    const playSound = (freq) => {
      try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        osc.type = 'square';
        osc.frequency.value = freq;
        osc.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.1);
      } catch (e) {
        // ignore
      }
    };

    const spawnParticles = (x, y) => {
      const arr = [];
      for (let i = 0; i < 10; i += 1) {
        arr.push({
          x,
          y,
          vx: (Math.random() - 0.5) * 100,
          vy: (Math.random() - 0.5) * 100,
          life: 1,
        });
      }
      return arr;
    };
    const sweptAABB = (ball, rect, dt) => {
      const dx = ball.vx * dt;
      const dy = ball.vy * dt;
      const invEntry = { x: 0, y: 0 };
      const invExit = { x: 0, y: 0 };
      if (dx > 0) {
        invEntry.x = rect.x - (ball.x + ball.r);
        invExit.x = rect.x + rect.w - (ball.x - ball.r);
      } else {
        invEntry.x = rect.x + rect.w - (ball.x - ball.r);
        invExit.x = rect.x - (ball.x + ball.r);
      }
      if (dy > 0) {
        invEntry.y = rect.y - (ball.y + ball.r);
        invExit.y = rect.y + rect.h - (ball.y - ball.r);
      } else {
        invEntry.y = rect.y + rect.h - (ball.y - ball.r);
        invExit.y = rect.y - (ball.y + ball.r);
      }
      const entry = {
        x: dx === 0 ? -Infinity : invEntry.x / dx,
        y: dy === 0 ? -Infinity : invEntry.y / dy,
      };
      const exit = {
        x: dx === 0 ? Infinity : invExit.x / dx,
        y: dy === 0 ? Infinity : invExit.y / dy,
      };
      const entryTime = Math.max(entry.x, entry.y);
      const exitTime = Math.min(exit.x, exit.y);
      if (entryTime > exitTime || entry.x < 0 && entry.y < 0 || entryTime > 1 || entryTime < 0) {
        return null;
      }
      let nx = 0;
      let ny = 0;
      if (entry.x > entry.y) {
        nx = invEntry.x < 0 ? 1 : -1;
      } else {
        ny = invEntry.y < 0 ? 1 : -1;
      }
      return { time: entryTime, nx, ny };
    };
    const drawBricks = () => {
      const groups = { normal: [], power: [], boss: [] };
      bricks.forEach((br) => {
        if (br.destroyed) return;
        const arr = br.hp > 1 ? groups.boss : br.powerUp ? groups.power : groups.normal;
        arr.push(br);
      });
      ctx.fillStyle = 'blue';
      ctx.beginPath();
      groups.normal.forEach((br) => ctx.rect(br.x, br.y, br.w, br.h));
      ctx.fill();
      ctx.fillStyle = 'gold';
      ctx.beginPath();
      groups.power.forEach((br) => ctx.rect(br.x, br.y, br.w, br.h));
      ctx.fill();
      ctx.fillStyle = 'purple';
      ctx.beginPath();
      groups.boss.forEach((br) => ctx.rect(br.x, br.y, br.w, br.h));
      ctx.fill();
    };

    let lastTime = 0;
    let acc = 0;
    const step = 1 / 60;

    const spawnPowerUp = (x, y, type) => {
      const p = powerUpPool.pop() || { x: 0, y: 0, vy: 50, type: null };
      p.x = x;
      p.y = y;
      p.vy = 50;
      p.type = type;
      powerUps.push(p);
    };

    const update = (dt) => {
      const dtAdj = dt * speedFactor;
      paddle.move((keys.right ? 1 : 0) - (keys.left ? 1 : 0), dtAdj);
      paddle.updateLasers(dtAdj);

      balls.forEach((b) => {
        if (b.stuck) {
          b.x = paddle.x + paddle.width / 2;
          b.y = paddle.y - b.r;
        } else {
          b.update(dtAdj);
        }
      });

      balls.forEach((b) => {
        const res = sweptAABB(b, { x: paddle.x, y: paddle.y, w: paddle.width, h: paddle.height }, dtAdj);
        if (res && b.vy > 0) {
          b.x += b.vx * res.time;
          b.y += b.vy * res.time;
          if (paddle.sticky) {
            b.stuck = true;
            b.vx = 0;
            b.vy = 0;
          } else {
            const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
            const relative = (b.x - (paddle.x + paddle.width / 2)) / (paddle.width / 2);
            const angle = relative * (Math.PI / 3);
            b.vx = speed * Math.sin(angle) + paddle.vx * 0.1;
            b.vy = -Math.abs(speed * Math.cos(angle));
          }
          playSound(200);
        }
        if (b.y > height + b.r) {
          const idx = balls.indexOf(b);
          if (idx >= 0) balls.splice(idx, 1);
        }
      });

      paddle.lasers.forEach((l) => {
        bricks.forEach((br) => {
          if (!br.destroyed && l.x > br.x && l.x < br.x + br.w && l.y > br.y && l.y < br.y + br.h) {
            br.hit();
            if (br.destroyed) {
              particles.push(...spawnParticles(br.x + br.w / 2, br.y + br.h / 2));
              if (br.powerUp) spawnPowerUp(br.x + br.w / 2, br.y + br.h / 2, br.powerUp);
            }
          }
        });
      });

      balls.forEach((b) => {
        bricks.forEach((br) => {
          if (br.destroyed) return;
          const res = sweptAABB(b, br, dtAdj);
          if (res) {
            b.x += b.vx * res.time;
            b.y += b.vy * res.time;
            if (res.nx) b.vx *= -1;
            if (res.ny) b.vy *= -1;
            br.hit();
            if (br.destroyed) {
              playSound(400);
              particles.push(...spawnParticles(br.x + br.w / 2, br.y + br.h / 2));
              if (br.powerUp) spawnPowerUp(br.x + br.w / 2, br.y + br.h / 2, br.powerUp);
            }
          }
        });
      });

      for (let i = powerUps.length - 1; i >= 0; i -= 1) {
        const p = powerUps[i];
        p.y += p.vy * dtAdj;
        if (p.y > paddle.y && p.x > paddle.x && p.x < paddle.x + paddle.width) {
          if (p.type === 'multiball') {
            const nb = new Ball(width, height);
            nb.x = balls[0] ? balls[0].x : width / 2;
            nb.y = balls[0] ? balls[0].y : height / 2;
            nb.vx = balls[0] ? -balls[0].vx : 150;
            nb.vy = balls[0] ? balls[0].vy : -150;
            balls.push(nb);
          } else if (p.type === 'laser') {
            paddle.laserActive = true;
            setTimeout(() => {
              paddle.laserActive = false;
            }, 5000);
          } else if (p.type === 'expand') {
            paddle.expand();
            setTimeout(() => paddle.resetWidth(), 5000);
          } else if (p.type === 'sticky') {
            paddle.sticky = true;
            setTimeout(() => {
              paddle.sticky = false;
            }, 5000);
          } else if (p.type === 'slow') {
            speedFactor = 0.5;
            setTimeout(() => {
              speedFactor = 1;
            }, 5000);
          }
          playSound(600);
          powerUpPool.push(p);
          powerUps.splice(i, 1);
        } else if (p.y > height) {
          powerUpPool.push(p);
          powerUps.splice(i, 1);
        }
      }

      particles = particles
        .map((pt) => ({ ...pt, x: pt.x + pt.vx * dtAdj, y: pt.y + pt.vy * dtAdj, life: pt.life - dtAdj }))
        .filter((pt) => pt.life > 0);

      elapsedRef.current += dtAdj;
      replayRef.current.push({
        t: elapsedRef.current,
        balls: balls.map((b) => ({ x: b.x, y: b.y, vx: b.vx, vy: b.vy })),
        paddle: { x: paddle.x },
      });

      if (balls.length === 0) {
        balls.push(new Ball(width, height));
      }
    };

    const render = () => {
      ctx.clearRect(0, 0, width, height);
        drawBricks();
        balls.forEach((b) => b.draw(ctx));
        paddle.draw(ctx);
        powerUps.forEach((p) => {
          const colors = {
            multiball: 'yellow',
            laser: 'red',
            expand: 'green',
            sticky: 'purple',
            slow: 'cyan',
          };
          ctx.fillStyle = colors[p.type] || 'white';
          ctx.fillRect(p.x - 5, p.y - 5, 10, 10);
        });
      particles.forEach((pt) => {
        ctx.fillStyle = `rgba(255,255,255,${pt.life})`;
        ctx.fillRect(pt.x, pt.y, 2, 2);
      });
    };

    const loop = (time) => {
      const delta = (time - lastTime) / 1000;
      lastTime = time;
      acc += delta;
      while (acc >= step) {
        update(step);
        acc -= step;
      }
      render();
      requestAnimationFrame(loop);
    };
    const id = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('keydown', keyDown);
      window.removeEventListener('keyup', keyUp);
      canvas.removeEventListener('pointermove', pointerMove);
      canvas.removeEventListener('pointerdown', pointerDown);
      resizeObserver.disconnect();
      cancelAnimationFrame(id);
    };
  }, [difficulty, editing, customLayout, levels]);

  const saveReplay = () => {
    const blob = new Blob([JSON.stringify(replayRef.current)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'breakout-replay.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div ref={containerRef} className="h-full w-full bg-black relative overflow-hidden">
      {editing ? (
        <LevelEditor
          onSave={async (layout) => {
            setCustomLayout(layout);
            try {
              const res = await fetch('/api/breakout/levels', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(layout),
              });
              if (res.ok) {
                const savedLayout = await res.json();
                setLevels((l) => [...l, savedLayout]);
              } else {
                // handle error, e.g. show a message
              }
            } catch (e) {
              // handle error, e.g. show a message
            }
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <>
          <canvas ref={canvasRef} className="touch-none" />
            <div className="absolute top-2 left-2 space-x-2 text-white">
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="text-black px-1"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="px-2 py-1 bg-blue-600"
              >
                Edit Level
              </button>
              <button
                type="button"
                onClick={saveReplay}
                className="px-2 py-1 bg-green-700"
              >
                Save Replay
              </button>
            </div>
          </>
        )}
      </div>
    );
};

export default Breakout;
