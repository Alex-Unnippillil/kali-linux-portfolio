import React, { useEffect } from 'react';
import useCanvasResize from '../../hooks/useCanvasResize';

const WIDTH = 400;
const HEIGHT = 300;

const FlappyBird = () => {
  const canvasRef = useCanvasResize(WIDTH, HEIGHT);

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
    const pipeInterval = 100;
    const pipeSpeed = 2;
    const minGap = 60;
    const maxGap = 120;

    let pipes = [];
    let frame = 0;
    let score = 0;
    let highScore = 0;
    let medal = '';
    let running = true;
    let paused = false;
    let soundOn = true;
    let animationFrameId = 0;
    let audioCtx;

    try {
      const stored = localStorage.getItem('flappy_highscore');
      if (stored) highScore = parseInt(stored, 10);
    } catch {
      /* ignore */
    }

    function playSound(freq, duration = 100) {
      if (!soundOn) return;
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!audioCtx) audioCtx = new Ctx();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration / 1000);
      osc.start();
      osc.stop(audioCtx.currentTime + duration / 1000);
    }

    function addPipe() {
      const gap = minGap + Math.random() * (maxGap - minGap);
      const top = Math.random() * (height - gap - 40) + 20;
      pipes.push({ x: width, top, bottom: top + gap });
    }

    function reset() {
      bird = { x: 50, y: height / 2, vy: 0 };
      pipes = [];
      frame = 0;
      score = 0;
      medal = '';
      running = true;
      paused = false;
    }

    function flap() {
      bird.vy = jump;
      playSound(600, 80);
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
      ctx.fillText(`High: ${highScore}`, 10, 40);
      ctx.fillText(`Sound: ${soundOn ? 'On' : 'Off'}`, 10, 60);

      if (paused && running) {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.font = '24px sans-serif';
        ctx.fillText('Paused', width / 2, height / 2);
        ctx.textAlign = 'left';
      } else if (!running) {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.font = '24px sans-serif';
        ctx.fillText('Game Over', width / 2, height / 2);
        ctx.font = '16px sans-serif';
        ctx.fillText('Press Space or Click to restart', width / 2, height / 2 + 30);
        if (medal) ctx.fillText(`Medal: ${medal}`, width / 2, height / 2 + 60);
        ctx.textAlign = 'left';
      }
    }

    function update() {
      if (!running || paused) return;

      frame += 1;

      if (frame % pipeInterval === 0) addPipe();

      bird.vy += gravity;
      bird.y += bird.vy;

      // top/bottom collision
      if (bird.y + 10 > height || bird.y - 10 < 0) {
        running = false;
        playSound(220, 300);
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
          playSound(220, 300);
        }

        if (pipe.x + pipeWidth < 0) {
          passed += 1;
        }
      }

      if (passed) {
        score += passed;
        playSound(800, 80);
        pipes = pipes.filter((p) => p.x + pipeWidth >= 0);
      }

      if (!running) {
        if (score > highScore) {
          highScore = score;
          localStorage.setItem('flappy_highscore', String(highScore));
        }
        const s = score;
        if (s >= 30) medal = 'Gold';
        else if (s >= 20) medal = 'Silver';
        else if (s >= 10) medal = 'Bronze';
      }

      draw();

      if (running) animationFrameId = requestAnimationFrame(update);
    }

    function handleKey(e) {
      if (e.code === 'Space') {
        e.preventDefault();
        if (running && !paused) {
          flap();
        } else if (!running) {
          reset();
          addPipe();
          animationFrameId = requestAnimationFrame(update);
        }
      } else if (e.code === 'KeyP') {
        paused = !paused;
        if (!paused && running) animationFrameId = requestAnimationFrame(update);
        draw();
      } else if (e.code === 'KeyR') {
        reset();
        addPipe();
        draw();
        animationFrameId = requestAnimationFrame(update);
      } else if (e.code === 'KeyM') {
        soundOn = !soundOn;
        draw();
      }
    }

    function handlePointer() {
      if (running && !paused) {
        flap();
      } else {
        reset();
        addPipe();
        draw();
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

  return <canvas ref={canvasRef} className="w-full h-full bg-black" />;
};

export default FlappyBird;
