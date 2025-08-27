import React, { useEffect } from 'react';
import useCanvasResize from '../../hooks/useCanvasResize';

const WIDTH = 400;
const HEIGHT = 300;
const GRAVITY = 0.5;
const JUMP = -8;
const PIPE_WIDTH = 40;
const PIPE_INTERVAL = 100;
const PIPE_SPEED = 2;

export const flapBird = (bird, jump) => {
  bird.vy = jump;
};

export const calculateGap = (score) => Math.max(40, 80 - score * 2);

export const createState = (width, height) => ({
  bird: { x: 50, y: height / 2, vy: 0 },
  pipes: [],
  frame: 0,
  score: 0,
});

export const resetState = (state, width, height) => {
  state.bird = { x: 50, y: height / 2, vy: 0 };
  state.pipes = [];
  state.frame = 0;
  state.score = 0;
};

const FlappyBird = () => {
  const canvasRef = useCanvasResize(WIDTH, HEIGHT);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = WIDTH;
    const height = HEIGHT;

    let state = createState(width, height);
    let animationFrameId = 0;

    function addPipe() {
      const gap = calculateGap(state.score);
      const top = Math.random() * (height - gap - 40) + 20;
      state.pipes.push({ x: width, top, bottom: top + gap });
    }

    function reset() {
      resetState(state, width, height);
      addPipe();
    }

    function draw() {
      ctx.fillStyle = '#87CEEB';
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = '#228B22';
      for (const pipe of state.pipes) {
        ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.top);
        ctx.fillRect(pipe.x, pipe.bottom, PIPE_WIDTH, height - pipe.bottom);
      }

      ctx.fillStyle = 'yellow';
      ctx.beginPath();
      ctx.arc(state.bird.x, state.bird.y, 10, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'black';
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`Score: ${state.score}`, 10, 20);
    }

    function update() {
      state.frame += 1;

      if (state.frame % PIPE_INTERVAL === 0) addPipe();

      state.bird.vy += GRAVITY;
      state.bird.y += state.bird.vy;

      if (state.bird.y + 10 > height || state.bird.y - 10 < 0) {
        navigator.vibrate?.(100);
        reset();
      }

      let passed = 0;
      for (let i = 0; i < state.pipes.length; i++) {
        const pipe = state.pipes[i];
        pipe.x -= PIPE_SPEED;

        if (
          pipe.x < state.bird.x + 10 &&
          pipe.x + PIPE_WIDTH > state.bird.x - 10 &&
          (state.bird.y - 10 < pipe.top || state.bird.y + 10 > pipe.bottom)
        ) {
          navigator.vibrate?.(100);
          reset();
          break;
        }

        if (pipe.x + PIPE_WIDTH < 0) {
          passed += 1;
        }
      }

      if (passed) {
        state.score += passed;
        state.pipes = state.pipes.filter((p) => p.x + PIPE_WIDTH >= 0);
      }

      draw();
      animationFrameId = requestAnimationFrame(update);
    }

    function handleKey(e) {
      if (e.code === 'Space') {
        e.preventDefault();
        flapBird(state.bird, JUMP);
      }
    }

    function handlePointer() {
      flapBird(state.bird, JUMP);
    }

    window.addEventListener('keydown', handleKey, { passive: false });
    canvas.addEventListener('mousedown', handlePointer);
    canvas.addEventListener('touchstart', handlePointer, { passive: true });

    reset();
    animationFrameId = requestAnimationFrame(update);

    return () => {
      window.removeEventListener('keydown', handleKey);
      canvas.removeEventListener('mousedown', handlePointer);
      canvas.removeEventListener('touchstart', handlePointer);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [canvasRef]);

  return <canvas ref={canvasRef} className="w-full h-full bg-black" />;
};

export default FlappyBird;
