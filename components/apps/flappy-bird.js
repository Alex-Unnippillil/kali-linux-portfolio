import React, { useRef, useEffect, useCallback } from 'react';

const FlappyBird = () => {
  const canvasRef = useRef(null);
  const bird = useRef({ x: 80, y: 200, r: 12, v: 0 });
  const pipes = useRef([]);
  const score = useRef(0);
  const running = useRef(true);
  const pipeSpawn = useRef(0);

  const reset = () => {
    bird.current = { x: 80, y: 200, r: 12, v: 0 };
    pipes.current = [];
    score.current = 0;
    running.current = true;
    pipeSpawn.current = 0;
  };

  const jump = useCallback(() => {
    if (running.current) {
      bird.current.v = -8;
    } else {
      reset();
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    const handleKey = (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        jump();
      }
    };
    const handleClick = () => jump();

    window.addEventListener('keydown', handleKey);
    canvas.addEventListener('mousedown', handleClick);

    let lastTime = 0;
    const pipeWidth = 60;
    const gap = 120;
    const gravity = 0.5;
    const speed = 2;

    const loop = (time) => {
      const delta = time - lastTime;
      lastTime = time;

      if (running.current) {
        bird.current.v += gravity;
        bird.current.y += bird.current.v;

        pipeSpawn.current += delta;
        if (pipeSpawn.current > 1500) {
          const top = Math.random() * (canvas.height - gap - 40) + 20;
          pipes.current.push({ x: canvas.width, top, bottom: top + gap, passed: false });
          pipeSpawn.current = 0;
        }

        pipes.current.forEach((p) => {
          p.x -= speed;
          if (!p.passed && p.x + pipeWidth < bird.current.x) {
            p.passed = true;
            score.current += 1;
          }
        });

        if (pipes.current.length && pipes.current[0].x < -pipeWidth) {
          pipes.current.shift();
        }

        for (const p of pipes.current) {
          if (
            bird.current.x + bird.current.r > p.x &&
            bird.current.x - bird.current.r < p.x + pipeWidth &&
            (bird.current.y - bird.current.r < p.top || bird.current.y + bird.current.r > p.bottom)
          ) {
            running.current = false;
          }
        }
        if (
          bird.current.y - bird.current.r < 0 ||
          bird.current.y + bird.current.r > canvas.height
        ) {
          running.current = false;
        }
      }

      ctx.fillStyle = '#70c5ce';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#0f0';
      pipes.current.forEach((p) => {
        ctx.fillRect(p.x, 0, pipeWidth, p.top);
        ctx.fillRect(p.x, p.bottom, pipeWidth, canvas.height - p.bottom);
      });

      ctx.fillStyle = '#ff0';
      ctx.beginPath();
      ctx.arc(bird.current.x, bird.current.y, bird.current.r, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#fff';
      ctx.font = '24px sans-serif';
      ctx.fillText(`Score: ${score.current}`, 10, 30);

      if (!running.current) {
        ctx.font = '20px sans-serif';
        ctx.fillText(
          'Game Over - Press Space or Click to Restart',
          10,
          canvas.height / 2
        );
      }

      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('keydown', handleKey);
      canvas.removeEventListener('mousedown', handleClick);
    };
  }, [jump]);

  return (
    <div className="h-full w-full flex items-center justify-center bg-ub-cool-grey">
      <canvas ref={canvasRef} width={400} height={500} />
    </div>
  );
};

export default FlappyBird;

