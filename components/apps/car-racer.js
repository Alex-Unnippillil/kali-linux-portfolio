import React, { useRef, useEffect, useState } from 'react';
import useCanvasResize from '../../hooks/useCanvasResize';

// Canvas dimensions
const WIDTH = 300;
const HEIGHT = 400;

// Track and entity settings
const LANES = 3;
const LANE_WIDTH = WIDTH / LANES;
const CAR_WIDTH = LANE_WIDTH * 0.6;
const CAR_HEIGHT = 50;
const OBSTACLE_HEIGHT = 40;
const SPEED = 200; // pixels per second
const SPAWN_TIME = 1; // seconds between obstacles

// Simple AABB collision used in game and tests
export const checkCollision = (car, obstacle) =>
  car.lane === obstacle.lane &&
  obstacle.y < car.y + car.height &&
  obstacle.y + obstacle.height > car.y;

const CarRacer = () => {
  const canvasRef = useCanvasResize(WIDTH, HEIGHT);
  const [score, setScore] = useState(0);
  const scoreRef = useRef(0);
  const [highScore, setHighScore] = useState(0);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  const [sound, setSound] = useState(true);
  const soundRef = useRef(true);
  const runningRef = useRef(true);
  const obstaclesRef = useRef([]);
  const car = useRef({ lane: 1, y: HEIGHT - CAR_HEIGHT - 10, height: CAR_HEIGHT });

  const audioCtxRef = useRef(null);
  const playBeep = () => {
    if (!soundRef.current || typeof window === 'undefined') return;
    if (!audioCtxRef.current)
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    const ctx = audioCtxRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.value = 0.1;
    osc.frequency.value = 440;
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  };

  useEffect(() => {
    const stored = localStorage.getItem('car_racer_high');
    if (stored) setHighScore(parseInt(stored, 10));
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let last = performance.now();
    let spawnTimer = 0;
    let lineOffset = 0;

    const draw = () => {
      ctx.fillStyle = '#333';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      // lane lines
      ctx.strokeStyle = '#fff';
      ctx.setLineDash([20, 20]);
      ctx.lineWidth = 2;
      ctx.lineDashOffset = -lineOffset;
      for (let i = 1; i < LANES; i += 1) {
        ctx.beginPath();
        ctx.moveTo(i * LANE_WIDTH, 0);
        ctx.lineTo(i * LANE_WIDTH, HEIGHT);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // player car
      const carX = car.current.lane * LANE_WIDTH + (LANE_WIDTH - CAR_WIDTH) / 2;
      ctx.fillStyle = 'red';
      ctx.fillRect(carX, car.current.y, CAR_WIDTH, CAR_HEIGHT);

      // obstacles
      ctx.fillStyle = 'blue';
      for (const o of obstaclesRef.current) {
        const ox = o.lane * LANE_WIDTH + (LANE_WIDTH - CAR_WIDTH) / 2;
        ctx.fillRect(ox, o.y, CAR_WIDTH, OBSTACLE_HEIGHT);
      }
    };

    const step = (time) => {
      const dt = (time - last) / 1000;
      last = time;

      if (!pausedRef.current && runningRef.current) {
        lineOffset = (lineOffset + SPEED * dt) % 40;
        spawnTimer += dt;
        if (spawnTimer > SPAWN_TIME) {
          const lane = Math.floor(Math.random() * LANES);
          obstaclesRef.current.push({
            lane,
            y: -OBSTACLE_HEIGHT,
            height: OBSTACLE_HEIGHT,
          });
          spawnTimer = 0;
        }

        obstaclesRef.current.forEach((o) => {
          o.y += SPEED * dt;
        });
        obstaclesRef.current = obstaclesRef.current.filter(
          (o) => o.y < HEIGHT + OBSTACLE_HEIGHT
        );

        for (const o of obstaclesRef.current) {
          if (checkCollision(car.current, o)) {
            runningRef.current = false;
            playBeep();
            if (scoreRef.current > highScore) {
              setHighScore(scoreRef.current);
              localStorage.setItem('car_racer_high', `${scoreRef.current}`);
            }
            break;
          }
        }

        scoreRef.current += dt * 100;
        setScore(Math.floor(scoreRef.current));
      }

      draw();
      requestAnimationFrame(step);
    };
    const req = requestAnimationFrame(step);
    return () => cancelAnimationFrame(req);
  }, [canvasRef, highScore]);

  const moveLeft = React.useCallback(() => {
    if (car.current.lane > 0) {
      car.current.lane -= 1;
      playBeep();
    }
  }, []);

  const moveRight = React.useCallback(() => {
    if (car.current.lane < LANES - 1) {
      car.current.lane += 1;
      playBeep();
    }
  }, []);

  useEffect(() => {
    const handle = (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') moveLeft();
      if (e.key === 'ArrowRight' || e.key === 'd') moveRight();
      if (e.key === ' ') {
        setPaused((p) => {
          pausedRef.current = !p;
          return !p;
        });
      }
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [moveLeft, moveRight]);

  const reset = () => {
    if (scoreRef.current > highScore) {
      setHighScore(scoreRef.current);
      localStorage.setItem('car_racer_high', `${scoreRef.current}`);
    }
    obstaclesRef.current = [];
    car.current.lane = 1;
    scoreRef.current = 0;
    setScore(0);
    runningRef.current = true;
    setPaused(false);
    pausedRef.current = false;
  };

  const togglePause = () => {
    setPaused((p) => {
      pausedRef.current = !p;
      return !p;
    });
  };

  const toggleSound = () => {
    soundRef.current = !soundRef.current;
    setSound(soundRef.current);
  };

  return (
    <div className="h-full w-full relative text-white select-none">
      <canvas ref={canvasRef} className="h-full w-full bg-black" />
      <div className="absolute top-2 left-2 text-sm space-y-1 z-10">
        <div>Score: {score}</div>
        <div>High: {highScore}</div>
      </div>
      <div className="absolute bottom-2 left-2 space-x-2 z-10 text-sm">
        <button className="bg-gray-700 px-2" onClick={reset}>
          Reset
        </button>
        <button className="bg-gray-700 px-2" onClick={togglePause}>
          {paused ? 'Resume' : 'Pause'}
        </button>
        <button className="bg-gray-700 px-2" onClick={toggleSound}>
          {sound ? 'Sound: on' : 'Sound: off'}
        </button>
      </div>
      {!runningRef.current && (
        <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center z-20">
          <div className="text-center">
            <div className="text-2xl mb-2">Crash!</div>
            <div className="text-sm">Press Reset to play again</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CarRacer;

