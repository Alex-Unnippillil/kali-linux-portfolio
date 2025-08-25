import React, { useRef, useEffect, useState } from 'react';
import levelsData from './breakout-levels.json';
import GameLayout from './GameLayout';

const BASE_PADDLE_WIDTH = 80;

const buildBricks = (layout, width) => {
  const rows = layout.length;
  const cols = layout[0].length;
  const brickWidth = width / cols;
  const brickHeight = 20;
  const bricks = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (layout[r][c]) {
        bricks.push({
          x: c * brickWidth,
          y: r * brickHeight + 40,
          w: brickWidth,
          h: brickHeight,
          alive: true,
        });
      }
    }
  }
  return bricks;
};

const LevelEditor = ({ onSave, cols = 8, rows = 5 }) => {
  const [grid, setGrid] = useState(
    Array.from({ length: rows }, () => Array(cols).fill(0))
  );

  const toggle = (r, c) => {
    setGrid((g) => {
      const next = g.map((row) => row.slice());
      next[r][c] = next[r][c] ? 0 : 1;
      return next;
    });
  };

  const save = () => {
    onSave(grid);
    localStorage.setItem('breakout-custom-level', JSON.stringify(grid));
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${cols}, 20px)` }}
      >
        {grid.map((row, r) =>
          row.map((cell, c) => (
            <div
              key={`${r}-${c}`}
              className={`w-5 h-5 cursor-pointer ${
                cell ? 'bg-white' : 'bg-gray-700'
              }`}
              onClick={() => toggle(r, c)}
            />
          ))
        )}
      </div>
      <button
        className="px-2 py-1 bg-gray-700 hover:bg-gray-600"
        onClick={save}
      >
        Save Level
      </button>
    </div>
  );
};

const BreakoutGame = ({ levels }) => {
  const canvasRef = useRef(null);
  const [level, setLevel] = useState(0);
  const scoreRef = useRef(0);
  const highScoresRef = useRef({});

  useEffect(() => {
    const savedLevel = parseInt(localStorage.getItem('breakout-level') || '0', 10);
    const savedHigh = JSON.parse(
      localStorage.getItem('breakout-highscores') || '{}'
    );
    setLevel(savedLevel);
    highScoresRef.current = savedHigh;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    let bricks = buildBricks(levels[level % levels.length], width);
    const paddle = {
      x: width / 2 - BASE_PADDLE_WIDTH / 2,
      y: height - 20,
      w: BASE_PADDLE_WIDTH,
      h: 10,
    };
    const balls = [
      { x: width / 2, y: height / 2, vx: 150, vy: -150, r: 5 },
    ];
    const powerUps = [];
    let paddleTimer = 0;

    const keys = { left: false, right: false };
    const keyDown = (e) => {
      if (e.key === 'ArrowLeft') keys.left = true;
      if (e.key === 'ArrowRight') keys.right = true;
    };
    const keyUp = (e) => {
      if (e.key === 'ArrowLeft') keys.left = false;
      if (e.key === 'ArrowRight') keys.right = false;
    };
    window.addEventListener('keydown', keyDown);
    window.addEventListener('keyup', keyUp);

    let animationId;
    let lastTime = 0;

    const loop = (time) => {
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      paddle.x += (keys.right - keys.left) * 300 * dt;
      paddle.x = Math.max(0, Math.min(width - paddle.w, paddle.x));
      if (paddleTimer > 0) {
        paddleTimer -= dt;
        if (paddleTimer <= 0) paddle.w = BASE_PADDLE_WIDTH;
      }

      balls.forEach((ball, idx) => {
        ball.x += ball.vx * dt;
        ball.y += ball.vy * dt;

        if (ball.x < ball.r || ball.x > width - ball.r) ball.vx *= -1;
        if (ball.y < ball.r) ball.vy *= -1;

        if (
          ball.y + ball.r > paddle.y &&
          ball.x > paddle.x &&
          ball.x < paddle.x + paddle.w &&
          ball.vy > 0
        ) {
          ball.vy *= -1;
          ball.y = paddle.y - ball.r;
        }

        bricks.forEach((brick) => {
          if (brick.alive &&
            ball.x > brick.x &&
            ball.x < brick.x + brick.w &&
            ball.y > brick.y &&
            ball.y < brick.y + brick.h
          ) {
            brick.alive = false;
            ball.vy *= -1;
            scoreRef.current += 10;
            if (Math.random() < 0.2) {
              const type = Math.random() < 0.5 ? 'multi' : 'expand';
              powerUps.push({ x: brick.x + brick.w / 2, y: brick.y + brick.h / 2, type, vy: 100 });
            }
          }
        });

        if (ball.y > height + ball.r) {
          balls.splice(idx, 1);
        }
      });

      powerUps.forEach((p, i) => {
        p.y += p.vy * dt;
        if (
          p.y + 8 > paddle.y &&
          p.x > paddle.x &&
          p.x < paddle.x + paddle.w
        ) {
          if (p.type === 'multi') {
            balls.push({ x: paddle.x + paddle.w / 2, y: paddle.y - 10, vx: 150, vy: -150, r: 5 });
          } else if (p.type === 'expand') {
            paddle.w = BASE_PADDLE_WIDTH * 1.5;
            paddleTimer = 10;
          }
          powerUps.splice(i, 1);
        } else if (p.y > height) {
          powerUps.splice(i, 1);
        }
      });

      if (balls.length === 0) {
        balls.push({ x: width / 2, y: height / 2, vx: 150, vy: -150, r: 5 });
      }

      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = 'white';
      ctx.fillRect(paddle.x, paddle.y, paddle.w, paddle.h);
      balls.forEach((ball) => {
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
        ctx.fill();
      });

      bricks.forEach((brick) => {
        if (brick.alive) {
          ctx.fillRect(brick.x, brick.y, brick.w - 2, brick.h - 2);
        }
      });

      powerUps.forEach((p) => {
        ctx.fillStyle = p.type === 'multi' ? 'red' : 'blue';
        ctx.fillRect(p.x - 5, p.y - 5, 10, 10);
        ctx.fillStyle = 'white';
      });

      ctx.fillText(`Level: ${level + 1}`, 10, 10);
      ctx.fillText(`Score: ${scoreRef.current}`, 10, 25);
      ctx.fillText(`High: ${highScoresRef.current[level] || 0}`, 10, 40);

      if (bricks.every((b) => !b.alive)) {
        highScoresRef.current[level] = Math.max(
          highScoresRef.current[level] || 0,
          scoreRef.current
        );
        localStorage.setItem(
          'breakout-highscores',
          JSON.stringify(highScoresRef.current)
        );
        const nextLevel = level + 1;
        localStorage.setItem('breakout-level', String(nextLevel));
        setLevel(nextLevel);
        scoreRef.current = 0;
        return;
      }

      animationId = requestAnimationFrame(loop);
    };

    animationId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('keydown', keyDown);
      window.removeEventListener('keyup', keyUp);
    };
  }, [level, levels]);

  return (
    <canvas
      ref={canvasRef}
      width={640}
      height={480}
      className="h-full w-full bg-black"
    />
  );
};

const Breakout = () => {
  const [levels, setLevels] = useState(levelsData);

  useEffect(() => {
    const custom = localStorage.getItem('breakout-custom-level');
    if (custom) {
      setLevels((lvls) => [...lvls, JSON.parse(custom)]);
    }
  }, []);

  const addLevel = (grid) => {
    setLevels((lvls) => [...lvls, grid]);
  };

  return (
    <GameLayout editor={<LevelEditor onSave={addLevel} />}>
      <BreakoutGame levels={levels} />
    </GameLayout>
  );
};

export default Breakout;
