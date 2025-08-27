import React, { useEffect, useRef } from 'react';
import useCanvasResize from '../../hooks/useCanvasResize';

const WIDTH = 400;
const HEIGHT = 300;

const FlappyBird = () => {
  const canvasRef = useCanvasResize(WIDTH, HEIGHT);
  const liveRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = WIDTH;
    const height = HEIGHT;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // physics constants
    let bird = { x: 50, y: height / 2, vy: 0 };
    const gravity = 0.5;
    const jump = -8;

    const pipeWidth = 40;
    const gap = 80;
    const pipeInterval = 100;
    const pipeSpeed = 2;

    // game state
    let pipes = [];
    let frame = 0;
    let score = 0;
    let running = true;
    let loopId = 0;
    let highHz = localStorage.getItem('flappy-120hz') === '1';
    let fps = highHz ? 120 : 60;

    // sky and clouds
    let skyFrame = 0;
    let skyProgress = 0;
    let cloudsBack = [];
    let cloudsFront = [];

    function mixColor(c1, c2, t) {
      return `rgb(${Math.round(c1[0] + (c2[0] - c1[0]) * t)},${Math.round(
        c1[1] + (c2[1] - c1[1]) * t
      )},${Math.round(c1[2] + (c2[2] - c1[2]) * t)})`;
    }

    function makeCloud(speed) {
      return {
        x: rand() * width,
        y: rand() * (height / 2),
        speed,
        scale: rand() * 0.5 + 0.5,
      };
    }

    function initClouds() {
      cloudsBack = Array.from({ length: 3 }, () => makeCloud(0.2));
      cloudsFront = Array.from({ length: 3 }, () => makeCloud(0.5));
    }

    function drawCloud(c) {
      ctx.save();
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.ellipse(c.x, c.y, 20 * c.scale, 12 * c.scale, 0, 0, Math.PI * 2);
      ctx.ellipse(c.x + 15 * c.scale, c.y + 2 * c.scale, 20 * c.scale, 12 * c.scale, 0, 0, Math.PI * 2);
      ctx.ellipse(c.x - 15 * c.scale, c.y + 2 * c.scale, 20 * c.scale, 12 * c.scale, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    function updateClouds() {
      if (reduceMotion) return;
      for (const c of cloudsBack) {
        c.x -= c.speed;
        if (c.x < -50) c.x = width + rand() * 50;
      }
      for (const c of cloudsFront) {
        c.x -= c.speed;
        if (c.x < -50) c.x = width + rand() * 50;
      }
    }

    function drawBackground() {
      if (reduceMotion) {
        ctx.fillStyle = '#87CEEB';
        ctx.fillRect(0, 0, width, height);
        skyProgress = 0;
        return;
      }
      const cycle = fps * 20;
      skyProgress = (Math.sin((skyFrame / cycle) * Math.PI * 2) + 1) / 2;
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, mixColor([135, 206, 235], [0, 0, 64], skyProgress));
      grad.addColorStop(1, mixColor([135, 206, 235], [0, 0, 32], skyProgress));
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
      skyFrame += 1;
    }

    function drawClouds() {
      for (const c of cloudsBack) drawCloud(c);
      for (const c of cloudsFront) drawCloud(c);
    }

    // seeded rng
    function createRandom(seed) {
      let s = seed % 2147483647;
      if (s <= 0) s += 2147483646;
      return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
    }

    let seed = Date.now();
    let rand = createRandom(seed);

    // medals
    const medalThresholds = [
      { name: 'bronze', distance: 10 },
      { name: 'silver', distance: 20 },
      { name: 'gold', distance: 30 },
    ];
    let medals = {};
    try {
      medals = JSON.parse(localStorage.getItem('flappy-medals') || '{}');
    } catch {
      medals = {};
    }
    function getMedal(dist) {
      let m = null;
      for (const { name, distance } of medalThresholds) {
        if (dist >= distance) m = name;
      }
      return m;
    }
    function saveMedal(dist) {
      const medal = getMedal(dist);
      if (medal) {
        medals[dist] = medal;
        localStorage.setItem('flappy-medals', JSON.stringify(medals));
      }
    }

    // replay data
    let flapFrames = [];
    let lastRun = null;
    let isReplaying = false;
    let replayFlaps = [];
    let replayIndex = 0;

    function addPipe() {
      const top = rand() * (height - gap - 40) + 20;
      pipes.push({ x: width, top, bottom: top + gap });
    }

    function reset(newSeed = Date.now()) {
      seed = newSeed;
      rand = createRandom(seed);
      bird = { x: 50, y: height / 2, vy: 0 };
      pipes = [];
      frame = 0;
      score = 0;
      running = true;
      flapFrames = [];
      initClouds();
    }

    function startGame(newSeed = Date.now()) {
      reset(newSeed);
      addPipe();
      startLoop();
      if (liveRef.current) liveRef.current.textContent = 'Score: 0';
    }

    function flap(record = true) {
      bird.vy = jump;
      if (record) flapFrames.push(frame);
    }

    function draw() {
      drawBackground();
      drawClouds();

      // pipes
      ctx.fillStyle = mixColor([34, 139, 34], [144, 238, 144], skyProgress);
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
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(5, 5, 120, 70);
      ctx.fillStyle = '#fff';
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`Score: ${score}`, 10, 20);
      ctx.fillText(`Seed: ${seed}`, 10, 40);
      const medal = getMedal(score);
      if (medal) ctx.fillText(`Medal: ${medal}`, 10, 60);

      if (!running) {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.font = '24px sans-serif';
        ctx.fillText('Game Over', width / 2, height / 2);
        ctx.font = '16px sans-serif';
        ctx.fillText('Press Space or Click to restart', width / 2, height / 2 + 30);
        if (lastRun) ctx.fillText('Press R to replay', width / 2, height / 2 + 50);
        ctx.textAlign = 'left';
      }
    }

    function update() {
      if (!running) return;

      frame += 1;

      updateClouds();

      if (frame % pipeInterval === 0) addPipe();

      if (isReplaying && replayIndex < replayFlaps.length && frame === replayFlaps[replayIndex]) {
        flap(false);
        replayIndex += 1;
      }

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
        pipes = pipes.filter((p) => p.x + pipeWidth >= 0);
        if (liveRef.current) liveRef.current.textContent = `Score: ${score}`;
      }

      draw();

      if (!running) {
        if (!isReplaying) {
          saveMedal(score);
          lastRun = { seed, flaps: flapFrames };
        }
        isReplaying = false;
        stopLoop();
        if (liveRef.current) liveRef.current.textContent = `Game over. Final score: ${score}`;
      }
    }

    function startLoop() {
      stopLoop();
      fps = highHz ? 120 : 60;
      let last = performance.now();
      const frameFunc = (now) => {
        loopId = requestAnimationFrame(frameFunc);
        if (now - last >= 1000 / fps) {
          update();
          last = now;
        }
      };
      loopId = requestAnimationFrame(frameFunc);
    }

    function stopLoop() {
      if (loopId) cancelAnimationFrame(loopId);
    }

    function handleKey(e) {
      if (e.code === 'Space') {
        e.preventDefault();
        if (running) {
          flap();
        } else {
          startGame();
        }
      } else if (e.code === 'KeyR' && !running) {
        if (lastRun) {
          isReplaying = true;
          replayFlaps = lastRun.flaps;
          replayIndex = 0;
          startGame(lastRun.seed);
        }
      } else if (e.code === 'KeyF') {
        highHz = !highHz;
        localStorage.setItem('flappy-120hz', highHz ? '1' : '0');
        if (running) startLoop();
      }
    }

    function handlePointer() {
      if (running) {
        flap();
      } else {
        startGame();
      }
    }

    window.addEventListener('keydown', handleKey, { passive: false });
    canvas.addEventListener('mousedown', handlePointer);
    canvas.addEventListener('touchstart', handlePointer, { passive: true });

    startGame();

    return () => {
      window.removeEventListener('keydown', handleKey);
      canvas.removeEventListener('mousedown', handlePointer);
      canvas.removeEventListener('touchstart', handlePointer);
      stopLoop();
    };
  }, [canvasRef]);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="w-full h-full bg-black"
        role="img"
        aria-label="Flappy Bird game"
      />
      <div ref={liveRef} className="sr-only" aria-live="polite" />
    </>
  );
};

export default FlappyBird;
