import React, { useEffect, useState } from 'react';
import useCanvasResize from '../../hooks/useCanvasResize';

const WIDTH = 400;
const HEIGHT = 300;

const FlappyBird = () => {
  const canvasRef = useCanvasResize(WIDTH, HEIGHT, 'Flappy Bird game canvas');
  const [liveText, setLiveText] = useState('Game ready');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = WIDTH;
    const height = HEIGHT;

    let bird = { x: 50, y: height / 2, vy: 0 };
    const gravity = 0.5;
    const jump = -8;

    const pipeWidth = 40;
    const gap = 80;
    const pipeInterval = 100;
    const pipeSpeed = 2;

    let pipes = [];
    let frame = 0;
    let score = 0;
    let running = true;
    let animationFrameId = 0;

    function addPipe() {
      const top = Math.random() * (height - gap - 40) + 20;
      pipes.push({ x: width, top, bottom: top + gap });
    }

    function reset() {
      bird = { x: 50, y: height / 2, vy: 0 };
      pipes = [];
      frame = 0;
      score = 0;
      running = true;
      setLiveText('Game reset');
    }

    function flap() {
      bird.vy = jump;
    }

    function draw() {
      // background
      ctx.fillStyle = '#87CEEB';
      ctx.fillRect(0, 0, width, height);

      // pipes
      ctx.fillStyle = '#228B22';
      for (const pipe of pipes) {
        ctx.fillRect(pipe.x, 0, pipeWidth, pipe.top);
        ctx.fillRect(pipe.x, pipe.bottom, pipeWidth, height - pipe.bottom);
      }

      // bird
      ctx.fillStyle = 'yellow';
      ctx.beginPath();
      ctx.arc(bird.x, bird.y, 10, 0, Math.PI * 2);
      ctx.fill();

      // HUD
      ctx.fillStyle = 'black';
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`Score: ${score}`, 10, 20);

      if (!running) {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.font = '24px sans-serif';
        ctx.fillText('Game Over', width / 2, height / 2);
        ctx.font = '16px sans-serif';
        ctx.fillText('Press Space or Click to restart', width / 2, height / 2 + 30);
        ctx.textAlign = 'left';
      }
    }

    function update() {
      if (!running) return;

      frame += 1;

      if (frame % pipeInterval === 0) addPipe();

      bird.vy += gravity;
      bird.y += bird.vy;

      // top/bottom collision
      if (bird.y + 10 > height || bird.y - 10 < 0) {
        running = false;
      }

      // move pipes and track passed ones
      let passed = 0;
      for (let i = 0; i < pipes.length; i++) {
        const pipe = pipes[i];
        pipe.x -= pipeSpeed;

        // collision with current pipe
        if (
          pipe.x < bird.x + 10 &&
          pipe.x + pipeWidth > bird.x - 10 &&
          (bird.y - 10 < pipe.top || bird.y + 10 > pipe.bottom)
        ) {
          running = false;
        }

        if (pipe.x + pipeWidth < 0) {
          passed += 1;
        }
      }

      if (passed) {
        score += passed;
        setLiveText(`Score: ${score}`);
        pipes = pipes.filter((p) => p.x + pipeWidth >= 0);
      }

      draw();

      if (running) animationFrameId = requestAnimationFrame(update);
    }

    function handleKey(e) {
      if (e.code === 'Space') {
        e.preventDefault();
        if (running) {
          flap();
        } else {
          reset();
          addPipe();
          animationFrameId = requestAnimationFrame(update);
        }
      }
    }

    function handlePointer() {
      if (running) {
        flap();
      } else {
        reset();
        addPipe();
        animationFrameId = requestAnimationFrame(update);
      }
    }

    window.addEventListener('keydown', handleKey, { passive: false });
    canvas.addEventListener('mousedown', handlePointer);
    canvas.addEventListener('touchstart', handlePointer, { passive: true });

    addPipe();
    animationFrameId = requestAnimationFrame(update);

    return () => {
      window.removeEventListener('keydown', handleKey);
      canvas.removeEventListener('mousedown', handlePointer);
      canvas.removeEventListener('touchstart', handlePointer);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [canvasRef]);

  return (
    <>
      <canvas ref={canvasRef} className="w-full h-full bg-black" />
      <div aria-live="polite" className="sr-only">{liveText}</div>
    </>
  );
};

export default FlappyBird;
