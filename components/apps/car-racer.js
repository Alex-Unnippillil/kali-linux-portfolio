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
const BOOST_DURATION = 2; // boost length in seconds
const NEAR_INTERVAL = 0.3;
const FAR_INTERVAL = 0.5;

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
  const roadsideRef = useRef({ near: [], far: [] });
  const [boost, setBoost] = useState(false);
  const boostRef = useRef(0);
  const reduceMotionRef = useRef(false);

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
    if (typeof window !== 'undefined') {
      const media = window.matchMedia('(prefers-reduced-motion: reduce)');
      const updateMotion = () => {
        reduceMotionRef.current = media.matches;
      };
      updateMotion();
      media.addEventListener('change', updateMotion);
      return () => media.removeEventListener('change', updateMotion);
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let last = performance.now();
    let spawnTimer = 0;
    let lineOffset = 0;
    let nearTimer = 0;
    let farTimer = 0;

    const draw = () => {
      ctx.fillStyle = '#333';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      if (!reduceMotionRef.current) {
        ctx.fillStyle = '#999';
        roadsideRef.current.far.forEach((r) => {
          ctx.fillRect(2, r.y, 6, 20);
          ctx.fillRect(WIDTH - 8, r.y, 6, 20);
        });
        ctx.fillStyle = '#ccc';
        roadsideRef.current.near.forEach((r) => {
          ctx.fillRect(0, r.y, 10, 30);
          ctx.fillRect(WIDTH - 10, r.y, 10, 30);
        });
      }

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
        const speedMult = boostRef.current > 0 ? 2 : 1;
        const speed = SPEED * speedMult;
        lineOffset = (lineOffset + speed * dt) % 40;
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
          o.y += speed * dt;
        });
        obstaclesRef.current = obstaclesRef.current.filter(
          (o) => o.y < HEIGHT + OBSTACLE_HEIGHT
        );

        if (!reduceMotionRef.current) {
          nearTimer += dt;
          farTimer += dt;
          if (nearTimer > NEAR_INTERVAL) {
            roadsideRef.current.near.push({ y: -30 });
            nearTimer = 0;
          }
          if (farTimer > FAR_INTERVAL) {
            roadsideRef.current.far.push({ y: -20 });
            farTimer = 0;
          }
          roadsideRef.current.near.forEach((r) => {
            r.y += speed * 1.2 * dt;
          });
          roadsideRef.current.far.forEach((r) => {
            r.y += speed * 0.5 * dt;
          });
          roadsideRef.current.near = roadsideRef.current.near.filter(
            (r) => r.y < HEIGHT + 30
          );
          roadsideRef.current.far = roadsideRef.current.far.filter(
            (r) => r.y < HEIGHT + 20
          );
        }

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

        scoreRef.current += dt * 100 * speedMult;
        setScore(Math.floor(scoreRef.current));
        if (boostRef.current > 0) {
          boostRef.current -= dt;
          if (boostRef.current <= 0) setBoost(false);
        }
      }

      if (!reduceMotionRef.current) {
        const blur = boostRef.current > 0 ? (4 * boostRef.current) / BOOST_DURATION : 0;
        canvas.style.filter = blur ? `blur(${blur}px)` : 'none';
      } else {
        canvas.style.filter = 'none';
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

  const triggerBoost = React.useCallback(() => {
    if (reduceMotionRef.current) return;
    boostRef.current = BOOST_DURATION;
    setBoost(true);
  }, []);

  useEffect(() => {
    const handle = (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') moveLeft();
      if (e.key === 'ArrowRight' || e.key === 'd') moveRight();
      if (e.key === 'ArrowUp' || e.key === 'w') triggerBoost();
      if (e.key === ' ') {
        setPaused((p) => {
          pausedRef.current = !p;
          return !p;
        });
      }
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [moveLeft, moveRight, triggerBoost]);

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
      <div
        className="absolute top-2 left-2 text-sm space-y-1 z-10"
        aria-live="polite"
        role="status"
      >
        <div>Score: {score}</div>
        <div>High: {highScore}</div>
        {boost && !reduceMotionRef.current && <div>Boost!</div>}
      </div>
      <div className="absolute bottom-2 left-2 space-x-2 z-10 text-sm">
        <button
          className="bg-gray-700 px-2 focus:outline-none focus:ring-2 focus:ring-white"
          onClick={reset}
        >
          Reset
        </button>
        <button
          className="bg-gray-700 px-2 focus:outline-none focus:ring-2 focus:ring-white"
          onClick={togglePause}
        >
          {paused ? 'Resume' : 'Pause'}
        </button>
        <button
          className="bg-gray-700 px-2 focus:outline-none focus:ring-2 focus:ring-white"
          onClick={toggleSound}
        >
          {sound ? 'Sound: on' : 'Sound: off'}
        </button>
        <button
          className="bg-gray-700 px-2 focus:outline-none focus:ring-2 focus:ring-white"
          onClick={triggerBoost}
        >
          Boost
        </button>
      </div>
      {!runningRef.current && (
        <div
          className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center z-20"
          role="alert"
        >
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

