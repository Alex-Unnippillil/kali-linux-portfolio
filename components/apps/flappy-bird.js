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
    }

    function startGame(newSeed = Date.now()) {
      reset(newSeed);
      addPipe();
      startLoop();
    }

    function flap(record = true) {
      bird.vy = jump;
      if (record) flapFrames.push(frame);
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
      }

      draw();

      if (!running) {
        if (!isReplaying) {
          saveMedal(score);
          lastRun = { seed, flaps: flapFrames };
        }
        isReplaying = false;
        stopLoop();
      }
    }

    function startLoop() {
      stopLoop();
      fps = highHz ? 120 : 60;
      loopId = setInterval(update, 1000 / fps);
    }

    function stopLoop() {
      if (loopId) clearInterval(loopId);
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

  return <canvas ref={canvasRef} className="w-full h-full bg-black" />;
};

export default FlappyBird;
