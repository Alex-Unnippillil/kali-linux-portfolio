import React, { useRef, useEffect, useState } from 'react';
import useCanvasResize from '../../hooks/useCanvasResize';
import { CAR_SKINS, loadSkinAssets } from '../../apps/games/car-racer/customization';
import { hasOffscreenCanvas } from '../../utils/feature';

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
const BG_NEAR_INTERVAL = 0.5;
const BG_FAR_INTERVAL = 1;
const DRIFT_WINDOW = 1;
const DRIFT_SCORE = 50;

const MEDAL_THRESHOLDS = [
  { name: 'bronze', score: 500 },
  { name: 'silver', score: 1000 },
  { name: 'gold', score: 1500 },
];

export const getMedal = (score) => {
  let medal = null;
  for (const { name, score: s } of MEDAL_THRESHOLDS) {
    if (score >= s) medal = name;
  }
  return medal;
};

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
  const [paused, setPaused] = useState(true);
  const pausedRef = useRef(true);
  const [showCustomization, setShowCustomization] = useState(true);
  const [skin, setSkin] = useState(() =>
    typeof window !== 'undefined'
      ? localStorage.getItem('car_racer_skin') || CAR_SKINS[0].key
      : CAR_SKINS[0].key,
  );
  const [skinAssets, setSkinAssets] = useState({});
  const [sound, setSound] = useState(true);
  const soundRef = useRef(true);
  const runningRef = useRef(true);
  const obstaclesRef = useRef([]);
  const car = useRef({ lane: 1, y: HEIGHT - CAR_HEIGHT - 10, height: CAR_HEIGHT });
  const roadsideRef = useRef({ near: [], far: [] });
  const backgroundRef = useRef({ near: [], far: [] });
  const [boost, setBoost] = useState(false);
  const boostRef = useRef(0);
  const reduceMotionRef = useRef(false);
  const workerRef = useRef(null);
  const lastRenderRef = useRef({});
  const medalsRef = useRef({});
  const [laneAssist, setLaneAssist] = useState(false);
  const laneAssistRef = useRef(false);
  const [driftCombo, setDriftCombo] = useState(0);
  const driftComboRef = useRef(0);
  const lastLaneChangeRef = useRef(0);
  const ghostDataRef = useRef([]);
  const ghostRunRef = useRef([]);
  const ghostPosRef = useRef({ lane: 1, y: HEIGHT - CAR_HEIGHT - 10 });
  const ghostIndexRef = useRef(0);
  const ghostBestScoreRef = useRef(0);
  const startTimeRef = useRef(0);
  const [speed, setSpeed] = useState(0);
  const speedRef = useRef(0);

  const currentSkin = CAR_SKINS.find((s) => s.key === skin) || CAR_SKINS[0];

  const audioCtxRef = useRef(null);
  const playBeep = React.useCallback(() => {
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
  }, [soundRef, audioCtxRef]);

  useEffect(() => {
    const stored = localStorage.getItem('car_racer_high');
    if (stored) setHighScore(parseInt(stored, 10));
    try {
      medalsRef.current = JSON.parse(localStorage.getItem('car_racer_medals') || '{}');
    } catch {
      medalsRef.current = {};
    }
    try {
      ghostDataRef.current = JSON.parse(localStorage.getItem('car_racer_ghost') || '[]');
      ghostBestScoreRef.current = parseInt(
        localStorage.getItem('car_racer_ghost_score') || '0',
        10,
      );
      if (ghostDataRef.current.length)
        ghostPosRef.current.lane = ghostDataRef.current[0].lane;
    } catch {
      ghostDataRef.current = [];
      ghostBestScoreRef.current = 0;
    }
    if (typeof window !== 'undefined') {
      const media = window.matchMedia('(prefers-reduced-motion: reduce)');
      const updateMotion = () => {
        reduceMotionRef.current = media.matches;
      };
      updateMotion();
      media.addEventListener('change', updateMotion);
      return () => media.removeEventListener('change', updateMotion);
    }
    // start timer and record initial lane for ghost run
    startTimeRef.current = performance.now();
    ghostRunRef.current = [{ t: 0, lane: car.current.lane }];
  }, []);

  useEffect(() => {
    loadSkinAssets().then(setSkinAssets);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('car_racer_skin', skin);
    }
  }, [skin]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof window === 'undefined') return;

    const supportsWorker = typeof Worker === 'function' && hasOffscreenCanvas();
    let worker;
    let ctx;
    if (supportsWorker) {
      worker = new Worker(new URL('./car-racer.renderer.js', import.meta.url));
      workerRef.current = worker;
      const offscreen = canvas.transferControlToOffscreen();
      worker.postMessage({ type: 'init', canvas: offscreen }, [offscreen]);
    } else {
      ctx = canvas.getContext('2d');
      if (ctx) ctx.imageSmoothingEnabled = false;
    }
    canvas.style.imageRendering = 'pixelated';

    let last = performance.now();
    let spawnTimer = 0;
    let lineOffsetNear = 0;
    let lineOffsetFar = 0;
    let nearTimer = 0;
    let farTimer = 0;
    let bgNearTimer = 0;
    let bgFarTimer = 0;

    const drawFallback = (state) => {
      if (!ctx) return;
      ctx.fillStyle = '#333';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      if (state.background) {
        ctx.fillStyle = '#111';
        state.background.far.forEach(({ x, y }) => {
          ctx.fillRect(x, y, 2, 2);
        });
        ctx.fillStyle = '#555';
        state.background.near.forEach(({ x, y }) => {
          ctx.fillRect(x, y, 3, 3);
        });
      }

      if (state.roadside) {
        ctx.fillStyle = '#999';
        state.roadside.far.forEach((y) => {
          ctx.fillRect(2, y, 6, 20);
          ctx.fillRect(WIDTH - 8, y, 6, 20);
        });
        ctx.fillStyle = '#ccc';
        state.roadside.near.forEach((y) => {
          ctx.fillRect(0, y, 10, 30);
          ctx.fillRect(WIDTH - 10, y, 10, 30);
        });
      }

      ctx.strokeStyle = '#fff';
      ctx.setLineDash([20, 20]);
      ctx.globalAlpha = 0.6;
      ctx.lineWidth = 2;
      ctx.lineDashOffset = -(state.lineOffsetFar || 0);
      for (let i = 1; i < LANES; i += 1) {
        ctx.beginPath();
        ctx.moveTo(i * LANE_WIDTH, 0);
        ctx.lineTo(i * LANE_WIDTH, HEIGHT);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.lineWidth = 4;
      ctx.lineDashOffset = -(state.lineOffsetNear || 0);
      for (let i = 1; i < LANES; i += 1) {
        ctx.beginPath();
        ctx.moveTo(i * LANE_WIDTH, 0);
        ctx.lineTo(i * LANE_WIDTH, HEIGHT);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      if (state.ghost) {
        const gx = state.ghost.lane * LANE_WIDTH + (LANE_WIDTH - CAR_WIDTH) / 2;
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.fillRect(gx, state.ghost.y, CAR_WIDTH, CAR_HEIGHT);
      }

      const carX = state.car.lane * LANE_WIDTH + (LANE_WIDTH - CAR_WIDTH) / 2;
      ctx.fillStyle = state.carColor || 'red';
      ctx.fillRect(carX, state.car.y, CAR_WIDTH, CAR_HEIGHT);

      ctx.fillStyle = 'blue';
      state.obstacles.forEach((o) => {
        const ox = o.lane * LANE_WIDTH + (LANE_WIDTH - CAR_WIDTH) / 2;
        ctx.fillRect(ox, o.y, CAR_WIDTH, OBSTACLE_HEIGHT);
      });
    };

    const postState = () => {
      const state = {
        car: { lane: car.current.lane, y: car.current.y },
        carColor: currentSkin.color,
        obstacles: obstaclesRef.current.map((o) => ({ lane: o.lane, y: o.y })),
        roadside: reduceMotionRef.current
          ? null
          : {
              near: roadsideRef.current.near.map((r) => r.y),
              far: roadsideRef.current.far.map((r) => r.y),
            },
        background: reduceMotionRef.current
          ? null
          : {
              near: backgroundRef.current.near.map((s) => ({ x: s.x, y: s.y })),
              far: backgroundRef.current.far.map((s) => ({ x: s.x, y: s.y })),
            },
        lineOffsetNear,
        lineOffsetFar,
        ghost:
          ghostDataRef.current.length > 0
            ? { lane: ghostPosRef.current.lane, y: car.current.y }
            : null,
      };
      if (supportsWorker) {
        const diff = {};
        const lastState = lastRenderRef.current;
        Object.keys(state).forEach((k) => {
          if (JSON.stringify(state[k]) !== JSON.stringify(lastState[k])) {
            diff[k] = state[k];
          }
        });
        if (Object.keys(diff).length) {
          worker.postMessage({ type: 'state', diff });
          lastRenderRef.current = { ...lastState, ...diff };
        }
      } else {
        drawFallback(state);
      }
    };

    const step = (time) => {
      const dt = (time - last) / 1000;
      last = time;

      const speedMult = boostRef.current > 0 ? 2 : 1;
      const baseSpeed = SPEED * speedMult;
      const currentSpeed = !pausedRef.current && runningRef.current ? baseSpeed : 0;
      if (speedRef.current !== currentSpeed) {
        speedRef.current = currentSpeed;
        setSpeed(Math.floor(currentSpeed));
      }

      if (!pausedRef.current && runningRef.current) {
        lineOffsetNear = (lineOffsetNear + baseSpeed * dt) % 40;
        lineOffsetFar = (lineOffsetFar + baseSpeed * 0.5 * dt) % 40;
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
          o.y += baseSpeed * dt;
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
            r.y += baseSpeed * 1.2 * dt;
          });
          roadsideRef.current.far.forEach((r) => {
            r.y += baseSpeed * 0.5 * dt;
          });
          roadsideRef.current.near = roadsideRef.current.near.filter(
            (r) => r.y < HEIGHT + 30
          );
          roadsideRef.current.far = roadsideRef.current.far.filter(
            (r) => r.y < HEIGHT + 20
          );

          bgNearTimer += dt;
          bgFarTimer += dt;
          if (bgNearTimer > BG_NEAR_INTERVAL) {
            backgroundRef.current.near.push({ x: Math.random() * WIDTH, y: -10 });
            bgNearTimer = 0;
          }
          if (bgFarTimer > BG_FAR_INTERVAL) {
            backgroundRef.current.far.push({ x: Math.random() * WIDTH, y: -10 });
            bgFarTimer = 0;
          }
          backgroundRef.current.near.forEach((s) => {
            s.y += baseSpeed * 0.3 * dt;
          });
          backgroundRef.current.far.forEach((s) => {
            s.y += baseSpeed * 0.15 * dt;
          });
          backgroundRef.current.near = backgroundRef.current.near.filter(
            (s) => s.y < HEIGHT
          );
          backgroundRef.current.far = backgroundRef.current.far.filter(
            (s) => s.y < HEIGHT
          );
        }

        if (ghostDataRef.current.length) {
          const elapsedGhost = (performance.now() - startTimeRef.current) / 1000;
          const data = ghostDataRef.current;
          while (
            ghostIndexRef.current < data.length &&
            data[ghostIndexRef.current].t <= elapsedGhost
          ) {
            ghostPosRef.current.lane = data[ghostIndexRef.current].lane;
            ghostIndexRef.current += 1;
          }
        }

        for (const o of obstaclesRef.current) {
          if (checkCollision(car.current, o)) {
            runningRef.current = false;
            playBeep();
            saveGhostRun(scoreRef.current);
            if (scoreRef.current > highScore) {
              setHighScore(scoreRef.current);
              localStorage.setItem('car_racer_high', `${scoreRef.current}`);
            }
            saveMedal(Math.floor(scoreRef.current));
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
      postState();
      requestAnimationFrame(step);
    };
    const req = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(req);
      if (worker) worker.terminate();
    };
  }, [canvasRef, highScore, playBeep, currentSkin.color]);

  const saveGhostRun = (score) => {
    if (ghostRunRef.current.length > 1 && score >= ghostBestScoreRef.current) {
      localStorage.setItem('car_racer_ghost', JSON.stringify(ghostRunRef.current));
      localStorage.setItem('car_racer_ghost_score', `${score}`);
      ghostDataRef.current = ghostRunRef.current.map((g) => ({ ...g }));
      ghostBestScoreRef.current = score;
    }
  };

  const registerDrift = React.useCallback(() => {
    const now = performance.now() / 1000;
    if (now - lastLaneChangeRef.current < DRIFT_WINDOW) {
      driftComboRef.current += 1;
    } else {
      driftComboRef.current = 1;
    }
    lastLaneChangeRef.current = now;
    const bonus = DRIFT_SCORE * driftComboRef.current;
    scoreRef.current += bonus;
    setScore(Math.floor(scoreRef.current));
    setDriftCombo(driftComboRef.current);
    setTimeout(() => setDriftCombo(0), 1000);
  }, [lastLaneChangeRef, driftComboRef, scoreRef, setScore, setDriftCombo]);

  const recordLaneChange = React.useCallback(() => {
    const t = (performance.now() - startTimeRef.current) / 1000;
    ghostRunRef.current.push({ t, lane: car.current.lane });
    registerDrift();
  }, [registerDrift, startTimeRef, car, ghostRunRef]);

  const canSwitch = React.useCallback(
    (newLane) =>
      !laneAssistRef.current ||
      !obstaclesRef.current.some((o) =>
        checkCollision({ lane: newLane, y: car.current.y, height: CAR_HEIGHT }, o)
      ),
    [laneAssistRef, obstaclesRef, car]
  );

  const moveLeft = React.useCallback(() => {
    const newLane = car.current.lane - 1;
    if (car.current.lane > 0 && canSwitch(newLane)) {
      car.current.lane = newLane;
      playBeep();
      recordLaneChange();
    }
  }, [canSwitch, playBeep, recordLaneChange, car]);

  const moveRight = React.useCallback(() => {
    const newLane = car.current.lane + 1;
    if (car.current.lane < LANES - 1 && canSwitch(newLane)) {
      car.current.lane = newLane;
      playBeep();
      recordLaneChange();
    }
  }, [canSwitch, playBeep, recordLaneChange, car]);

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

  const resetGame = () => {
    if (scoreRef.current > highScore) {
      setHighScore(scoreRef.current);
      localStorage.setItem('car_racer_high', `${scoreRef.current}`);
    }
    saveMedal(Math.floor(scoreRef.current));
    obstaclesRef.current = [];
    car.current.lane = 1;
    scoreRef.current = 0;
    setScore(0);
    runningRef.current = true;
    setPaused(false);
    pausedRef.current = false;
    startTimeRef.current = performance.now();
    ghostRunRef.current = [{ t: 0, lane: car.current.lane }];
    ghostIndexRef.current = 0;
    try {
      ghostDataRef.current = JSON.parse(localStorage.getItem('car_racer_ghost') || '[]');
      ghostBestScoreRef.current = parseInt(
        localStorage.getItem('car_racer_ghost_score') || '0',
        10,
      );
    } catch {
      ghostDataRef.current = [];
      ghostBestScoreRef.current = 0;
    }
    ghostPosRef.current.lane = ghostDataRef.current.length
      ? ghostDataRef.current[0].lane
      : car.current.lane;
    setDriftCombo(0);
  };

  const openCustomization = () => {
    pausedRef.current = true;
    setPaused(true);
    setShowCustomization(true);
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

  const toggleLaneAssist = () => {
    laneAssistRef.current = !laneAssistRef.current;
    setLaneAssist(laneAssistRef.current);
  };

  const saveMedal = (s) => {
    const medal = getMedal(s);
    if (medal) {
      medalsRef.current[s] = medal;
      localStorage.setItem('car_racer_medals', JSON.stringify(medalsRef.current));
    }
  };

  const startRace = () => {
    resetGame();
    setShowCustomization(false);
  };

  return (
    <div className="h-full w-full relative text-white select-none">
      <canvas ref={canvasRef} className="h-full w-full bg-black" />
      {showCustomization && (
        <div className="absolute inset-0 bg-black bg-opacity-60 z-20 flex flex-col items-center justify-center space-y-4">
          <div className="flex space-x-4">
            {CAR_SKINS.map((s) => (
              <button
                key={s.key}
                onClick={() => setSkin(s.key)}
                className={`border-2 ${skin === s.key ? 'border-white' : 'border-transparent'}`}
              >
                <img
                  src={skinAssets[s.key]?.src || s.src}
                  alt={s.label}
                  className="h-12 w-8"
                />
              </button>
            ))}
          </div>
          <button
            className="bg-gray-700 px-3 py-1"
            onClick={startRace}
          >
            Start
          </button>
        </div>
      )}
      <div
        className="absolute top-2 left-2 text-sm space-y-1 z-10"
        aria-live="polite"
        role="status"
      >
        <div>Score: {score}</div>
        <div>High: {highScore}</div>
        {getMedal(score) && <div data-testid="medal-display">Medal: {getMedal(score)}</div>}
        {boost && !reduceMotionRef.current && <div>Boost!</div>}
        {driftCombo > 1 && <div>Drift x{driftCombo}</div>}
      </div>
      <div className="absolute bottom-2 left-2 space-x-2 z-10 text-sm">
        <button
          className="bg-gray-700 px-2 focus:outline-none focus:ring-2 focus:ring-white"
          onClick={openCustomization}
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
          onClick={toggleLaneAssist}
        >
          {laneAssist ? 'Lane Assist: on' : 'Lane Assist: off'}
        </button>
        <button
          className="bg-gray-700 px-2 focus:outline-none focus:ring-2 focus:ring-white"
          onClick={triggerBoost}
        >
          Boost
        </button>
      </div>
      <div className="absolute bottom-2 right-2 z-10 text-sm w-24">
        <div className="w-full h-2 bg-gray-700">
          <div
            className="h-full bg-green-500"
            style={{ width: `${(speed / (SPEED * 2)) * 100}%` }}
          />
        </div>
        <div className="text-right mt-1">{Math.round(speed)}</div>
      </div>
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex space-x-4 z-10">
        <button
          aria-label="Steer left"
          className="w-12 h-12 bg-gray-700 bg-opacity-70 flex items-center justify-center text-xl rounded"
          onPointerDown={moveLeft}
        >
          ←
        </button>
        <button
          aria-label="Steer right"
          className="w-12 h-12 bg-gray-700 bg-opacity-70 flex items-center justify-center text-xl rounded"
          onPointerDown={moveRight}
        >
          →
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

