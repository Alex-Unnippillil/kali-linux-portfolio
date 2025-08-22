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
    </div>
  );
};

const Breakout = () => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [difficulty, setDifficulty] = useState('easy');
  const [editing, setEditing] = useState(false);
  const [customLayout, setCustomLayout] = useState(null);

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
    let particles = [];

    const rows = customLayout ? customLayout.length : rowsByDifficulty[difficulty];
    const cols = 10;
    const bw = width / cols;
    const bh = 20;
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        if (customLayout && !customLayout[r][c]) continue;
        const powerUp = Math.random() < 0.1 ? (Math.random() < 0.5 ? 'multiball' : 'laser') : null;
        bricks.push(new Brick(c * bw, r * bh + 40, bw - 2, bh - 2, powerUp));
      }
    }
    balls[0].vx *= speedByDifficulty[difficulty] / 150;
    balls[0].vy *= speedByDifficulty[difficulty] / 150;

    const keys = { left: false, right: false };
    const keyDown = (e) => {
      if (e.key === 'ArrowLeft') keys.left = true;
      if (e.key === 'ArrowRight') keys.right = true;
      if (e.key === ' ') paddle.shoot();
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
    const pointerDown = () => paddle.shoot();
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

    const loop = (time) => {
      const dt = (time - lastTime) / 1000;
      lastTime = time;
      ctx.clearRect(0, 0, width, height);

      paddle.move((keys.right ? 1 : 0) - (keys.left ? 1 : 0), dt);
      paddle.updateLasers(dt);

      balls.forEach((b) => b.update(dt));

      balls.forEach((b) => {
        if (b.y + b.r > paddle.y && b.x > paddle.x && b.x < paddle.x + paddle.width && b.vy > 0) {
          b.vy *= -1;
          b.y = paddle.y - b.r;
          playSound(200);
        }
        if (b.y > height + b.r) b.reset();
      });

      paddle.lasers.forEach((l) => {
        bricks.forEach((br) => {
          if (!br.destroyed && l.x > br.x && l.x < br.x + br.w && l.y > br.y && l.y < br.y + br.h) {
            br.destroyed = true;
            particles.push(...spawnParticles(br.x + br.w / 2, br.y + br.h / 2));
            if (br.powerUp)
              powerUps.push({ x: br.x + br.w / 2, y: br.y + br.h / 2, type: br.powerUp, vy: 50 });
          }
        });
      });

      console.time('collision');
      balls.forEach((b) => {
        bricks.forEach((br) => {
          if (
            !br.destroyed &&
            b.x > br.x &&
            b.x < br.x + br.w &&
            b.y - b.r < br.y + br.h &&
            b.y + b.r > br.y
          ) {
            br.destroyed = true;
            b.vy *= -1;
            playSound(400);
            particles.push(...spawnParticles(br.x + br.w / 2, br.y + br.h / 2));
            if (br.powerUp)
              powerUps.push({ x: br.x + br.w / 2, y: br.y + br.h / 2, type: br.powerUp, vy: 50 });
          }
        });
      });
      console.timeEnd('collision');

      for (let i = powerUps.length - 1; i >= 0; i -= 1) {
        const p = powerUps[i];
        p.y += p.vy * dt;
        if (p.y > paddle.y && p.x > paddle.x && p.x < paddle.x + paddle.width) {
          if (p.type === 'multiball') {
            const nb = new Ball(width, height);
            nb.x = balls[0].x;
            nb.y = balls[0].y;
            nb.vx = -balls[0].vx;
            nb.vy = balls[0].vy;
            balls.push(nb);
          } else if (p.type === 'laser') {
            paddle.laserActive = true;
            setTimeout(() => {
              paddle.laserActive = false;
            }, 5000);
          }
          playSound(600);
          powerUps.splice(i, 1);
        } else if (p.y > height) {
          powerUps.splice(i, 1);
        }
      }

      particles = particles
        .map((pt) => ({ ...pt, x: pt.x + pt.vx * dt, y: pt.y + pt.vy * dt, life: pt.life - dt }))
        .filter((pt) => pt.life > 0);

      bricks.forEach((br) => br.draw(ctx));
      balls.forEach((b) => b.draw(ctx));
      paddle.draw(ctx);
      powerUps.forEach((p) => {
        ctx.fillStyle = p.type === 'multiball' ? 'yellow' : 'red';
        ctx.fillRect(p.x - 5, p.y - 5, 10, 10);
      });
      particles.forEach((pt) => {
        ctx.fillStyle = `rgba(255,255,255,${pt.life})`;
        ctx.fillRect(pt.x, pt.y, 2, 2);
      });

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
  }, [difficulty, editing, customLayout]);

  return (
    <div ref={containerRef} className="h-full w-full bg-black relative overflow-hidden">
      {editing ? (
        <LevelEditor
          onSave={(layout) => {
            setCustomLayout(layout);
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
          </div>
        </>
      )}
    </div>
  );
};

export default Breakout;
