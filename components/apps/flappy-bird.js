import React, { useRef, useEffect } from 'react';

const FlappyBird = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    let bird = { x: 50, y: height / 2, vy: 0 };
    const gravity = 0.5;
    const jump = -8;
    let pipes = [];
    let frame = 0;
    let score = 0;
    let running = true;

    const addPipe = () => {
      const gap = 80;
      const top = Math.random() * (height - gap - 40) + 20;
      pipes.push({ x: width, top, bottom: top + gap });
    };

    const reset = () => {
      bird = { x: 50, y: height / 2, vy: 0 };
      pipes = [];
      frame = 0;
      score = 0;
      running = true;
    };

    const flap = () => {
      bird.vy = jump;
    };

    let animationFrameId;

    const handleKey = (e) => {
      if (e.code === 'Space') {
        if (running) {
          flap();
        } else {
          reset();
          addPipe();
          animationFrameId = requestAnimationFrame(update);
        }
      }
    };

    window.addEventListener('keydown', handleKey);

    const update = () => {
      if (!running) return;

      frame += 1;

      if (frame % 100 === 0) addPipe();

      bird.vy += gravity;
      bird.y += bird.vy;

      if (bird.y + 10 > height || bird.y - 10 < 0) {
        running = false;
      }

      pipes.forEach((pipe) => {
        pipe.x -= 2;
        if (pipe.x + 40 < 0) {
          pipes.shift();
          score += 1;
        }
        if (
          pipe.x < bird.x + 10 &&
          pipe.x + 40 > bird.x - 10 &&
          (bird.y - 10 < pipe.top || bird.y + 10 > pipe.bottom)
        ) {
          running = false;
        }
      });

      draw();

      if (running) animationFrameId = requestAnimationFrame(update);
    };

    const draw = () => {
      ctx.fillStyle = '#87CEEB';
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = '#228B22';
      pipes.forEach((pipe) => {
        ctx.fillRect(pipe.x, 0, 40, pipe.top);
        ctx.fillRect(pipe.x, pipe.bottom, 40, height - pipe.bottom);
      });

      ctx.fillStyle = 'yellow';
      ctx.beginPath();
      ctx.arc(bird.x, bird.y, 10, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'black';
      ctx.font = '16px sans-serif';
      ctx.fillText(`Score: ${score}`, 10, 20);

      if (!running) {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.font = '24px sans-serif';
        ctx.fillText('Game Over', width / 2, height / 2);
        ctx.font = '16px sans-serif';
        ctx.fillText('Press Space to restart', width / 2, height / 2 + 30);
        ctx.textAlign = 'left';
      }
    };

    addPipe();
    animationFrameId = requestAnimationFrame(update);

    return () => {
      window.removeEventListener('keydown', handleKey);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={400}
      height={300}
      className="w-full h-full bg-black"
    />
  );
};

export default FlappyBird;

