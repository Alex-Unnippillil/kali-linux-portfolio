import React, { useEffect, useRef, useState } from 'react';
import useCanvasResize from '../../hooks/useCanvasResize';

const WIDTH = 400;
const HEIGHT = 500;
const GRAVITY = 500; // px per second^2
const MAX_DT = 0.032; // clamp delta time for stability (~30fps max)

const Pinball = () => {
  const canvasRef = useCanvasResize(WIDTH, HEIGHT);
  const [paused, setPaused] = useState(false);
  const [sound, setSound] = useState(true);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);

  // refs so the rAF loop can read latest state without re-subscribing
  const pausedRef = useRef(false);
  const soundRef = useRef(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = WIDTH;
    const height = HEIGHT;
    const floor = height - 20;

    // load high score from localStorage if available
    let highVal = 0;
    if (typeof localStorage !== 'undefined') {
      highVal = parseInt(localStorage.getItem('pinballHighScore') || '0', 10);
      setHighScore(highVal);
    }

    const ball = { x: width / 2, y: 60, vx: 120, vy: 0, r: 8 };
    const flippers = { left: false, right: false };
    const bumpers = [
      { x: width / 2, y: 150, r: 16, score: 10 },
      { x: width / 3, y: 250, r: 12, score: 20 },
      { x: (2 * width) / 3, y: 250, r: 12, score: 20 },
    ];

    let scoreVal = 0;
    let multiplier = 1;

    const audioCtx = { current: null };
    const beep = (freq) => {
      if (!soundRef.current) return;
      const ctxA = audioCtx.current || new (window.AudioContext || window.webkitAudioContext)();
      audioCtx.current = ctxA;
      const osc = ctxA.createOscillator();
      const gain = ctxA.createGain();
      osc.frequency.value = freq;
      gain.gain.value = 0.1;
      osc.connect(gain);
      gain.connect(ctxA.destination);
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.001, ctxA.currentTime + 0.1);
      osc.stop(ctxA.currentTime + 0.1);
    };

    const addScore = (points) => {
      scoreVal += points;
      setScore(scoreVal);
      if (scoreVal > highVal) {
        highVal = scoreVal;
        setHighScore(highVal);
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('pinballHighScore', highVal.toString());
        }
      }
    };

    const reset = () => {
      ball.x = width / 2;
      ball.y = 60;
      ball.vx = 120 * (Math.random() > 0.5 ? 1 : -1);
      ball.vy = 0;
      multiplier = 1;
    };

    const keydown = (e) => {
      if (e.key === 'ArrowLeft') flippers.left = true;
      if (e.key === 'ArrowRight') flippers.right = true;
      if (e.key === 'p') {
        pausedRef.current = !pausedRef.current;
        setPaused(pausedRef.current);
      }
      if (e.key === 'm') {
        soundRef.current = !soundRef.current;
        setSound(soundRef.current);
      }
      if (e.key === 'r') {
        scoreVal = 0;
        setScore(0);
        reset();
      }
    };

    const keyup = (e) => {
      if (e.key === 'ArrowLeft') flippers.left = false;
      if (e.key === 'ArrowRight') flippers.right = false;
    };

    window.addEventListener('keydown', keydown);
    window.addEventListener('keyup', keyup);

    let last = performance.now();
    let animationId;

    const loop = (time) => {
      animationId = requestAnimationFrame(loop);
      let dt = (time - last) / 1000;
      if (dt > MAX_DT) dt = MAX_DT;
      last = time;

      if (pausedRef.current) {
        draw();
        return;
      }

      // gravity and movement
      ball.vy += GRAVITY * dt;
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;

      // wall collisions
      if (ball.x < ball.r) {
        ball.x = ball.r;
        ball.vx *= -1;
        beep(150);
      }
      if (ball.x > width - ball.r) {
        ball.x = width - ball.r;
        ball.vx *= -1;
        beep(150);
      }
      if (ball.y < ball.r) {
        ball.y = ball.r;
        ball.vy *= -1;
        beep(150);
      }

      // bumpers
      for (const b of bumpers) {
        const dx = ball.x - b.x;
        const dy = ball.y - b.y;
        const dist = Math.hypot(dx, dy);
        if (dist < ball.r + b.r) {
          const nx = dx / dist;
          const ny = dy / dist;
          const dot = ball.vx * nx + ball.vy * ny;
          ball.vx -= 2 * dot * nx;
          ball.vy -= 2 * dot * ny;
          ball.vx *= 1.05;
          ball.vy *= 1.05;
          addScore(b.score * multiplier);
          multiplier = Math.min(multiplier + 1, 5);
          beep(440);
        }
      }

      // flippers / floor
      if (ball.y + ball.r > floor) {
        if (flippers.left && ball.x < width / 2 - 10) {
          ball.vy = -300;
          ball.vx = -150;
          multiplier = 1;
          beep(220);
        } else if (flippers.right && ball.x > width / 2 + 10) {
          ball.vy = -300;
          ball.vx = 150;
          multiplier = 1;
          beep(220);
        } else if (ball.y - ball.r > height) {
          // drain
          if (scoreVal > highVal) {
            highVal = scoreVal;
            setHighScore(highVal);
            if (typeof localStorage !== 'undefined') {
              localStorage.setItem('pinballHighScore', highVal.toString());
            }
          }
          scoreVal = 0;
          setScore(0);
          reset();
        }
      }

      draw();
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, width, height);

      // table border
      ctx.strokeStyle = '#555';
      ctx.lineWidth = 4;
      ctx.strokeRect(2, 2, width - 4, height - 4);

      // bumpers
      ctx.fillStyle = '#0ff';
      bumpers.forEach((b) => {
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
      });

      // flippers
      ctx.fillStyle = '#ff6f00';
      ctx.save();
      ctx.translate(80, floor);
      ctx.rotate(flippers.left ? -0.5 : 0);
      ctx.fillRect(-40, -5, 40, 10);
      ctx.restore();

      ctx.save();
      ctx.translate(width - 80, floor);
      ctx.rotate(flippers.right ? 0.5 : 0);
      ctx.fillRect(0, -5, 40, 10);
      ctx.restore();

      // ball
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
      ctx.fill();

      // HUD
      ctx.fillStyle = '#fff';
      ctx.font = '14px monospace';
      ctx.fillText(`Score: ${scoreVal}`, 10, 20);
      ctx.fillText(`High: ${highVal}`, width - 100, 20);
      if (pausedRef.current) {
        ctx.fillText('Paused', width / 2 - 25, height / 2);
      }
    };

    reset();
    animationId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('keydown', keydown);
      window.removeEventListener('keyup', keyup);
    };
  }, [canvasRef]);

  return (
    <div className="h-full w-full flex items-center justify-center bg-ub-cool-grey">
      <canvas ref={canvasRef} className="bg-black w-full h-full" />
    </div>
  );
};

export default Pinball;

