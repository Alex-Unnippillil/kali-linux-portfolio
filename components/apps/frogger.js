import React, { useState, useEffect, useRef } from 'react';

const WIDTH = 7;
const HEIGHT = 8;
const SUB_STEP = 0.5;

const initialFrog = { x: Math.floor(WIDTH / 2), y: HEIGHT - 1 };

const carLaneDefs = [
  { y: 4, dir: 1, speed: 1, spawnRate: 2, length: 1 },
  { y: 5, dir: -1, speed: 1.2, spawnRate: 1.8, length: 1 },
];

const logLaneDefs = [
  { y: 1, dir: -1, speed: 0.5, spawnRate: 2.5, length: 2 },
  { y: 2, dir: 1, speed: 0.7, spawnRate: 2.2, length: 2 },
];

const initLane = (lane) => ({ ...lane, entities: [], timer: lane.spawnRate });

const Frogger = () => {
  const [frog, setFrog] = useState(initialFrog);
  const frogRef = useRef(frog);
  const [cars, setCars] = useState(carLaneDefs.map(initLane));
  const carsRef = useRef(cars);
  const [logs, setLogs] = useState(logLaneDefs.map(initLane));
  const logsRef = useRef(logs);
  const [status, setStatus] = useState('');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const nextLife = useRef(500);

  useEffect(() => { frogRef.current = frog; }, [frog]);
  useEffect(() => { carsRef.current = cars; }, [cars]);
  useEffect(() => { logsRef.current = logs; }, [logs]);

  const moveFrog = (dx, dy) => {
    setFrog((prev) => {
      const x = prev.x + dx;
      const y = prev.y + dy;
      if (x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT) return prev;
      if (navigator.vibrate) navigator.vibrate(50);
      if (dy === -1) setScore((s) => s + 10);
      return { x, y };
    });
  };

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'ArrowLeft') moveFrog(-1, 0);
      if (e.key === 'ArrowRight') moveFrog(1, 0);
      if (e.key === 'ArrowUp') moveFrog(0, -1);
      if (e.key === 'ArrowDown') moveFrog(0, 1);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  useEffect(() => {
    const container = document.getElementById('frogger-container');
    let startX = 0;
    let startY = 0;
    const handleStart = (e) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };
    const handleEnd = (e) => {
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 30) moveFrog(1, 0);
        else if (dx < -30) moveFrog(-1, 0);
      } else {
        if (dy > 30) moveFrog(0, 1);
        else if (dy < -30) moveFrog(0, -1);
      }
    };
    container?.addEventListener('touchstart', handleStart);
    container?.addEventListener('touchend', handleEnd);
    return () => {
      container?.removeEventListener('touchstart', handleStart);
      container?.removeEventListener('touchend', handleEnd);
    };
  }, []);

  const reset = (full = false) => {
    setFrog(initialFrog);
    setCars(carLaneDefs.map(initLane));
    setLogs(logLaneDefs.map(initLane));
    setStatus('');
    if (full) {
      setScore(0);
      setLives(3);
      nextLife.current = 500;
    }
  };

  const loseLife = () => {
    setLives((l) => {
      const newLives = l - 1;
      if (newLives <= 0) {
        setStatus('Game Over');
        setTimeout(() => reset(true), 1000);
        return 0;
      }
      reset();
      return newLives;
    });
  };

  const updateCars = (prev, dt) =>
    prev.map((lane) => {
      let timer = lane.timer - dt;
      let entities = lane.entities
        .map((e) => ({ ...e, x: e.x + lane.dir * lane.speed * dt }))
        .filter((e) => e.x + lane.length > 0 && e.x < WIDTH);
      if (timer <= 0) {
        entities.push({ x: lane.dir === 1 ? -lane.length : WIDTH });
        timer += lane.spawnRate;
      }
      return { ...lane, entities, timer };
    });

  const updateLogs = (prev, frogPos, dt) => {
    let newFrog = { ...frogPos };
    let safe = false;
    const newLanes = prev.map((lane) => {
      let timer = lane.timer - dt;
      let entities = lane.entities;
      const dist = lane.dir * lane.speed * dt;
      const steps = Math.max(1, Math.ceil(Math.abs(dist) / SUB_STEP));
      const stepDist = dist / steps;
      for (let i = 0; i < steps; i += 1) {
        entities = entities.map((e) => ({ ...e, x: e.x + stepDist }));
        if (newFrog.y === lane.y && entities.some((e) => e.x <= newFrog.x && newFrog.x < e.x + lane.length)) {
          newFrog.x += stepDist;
          safe = true;
        }
      }
      entities = entities.filter((e) => e.x + lane.length > 0 && e.x < WIDTH);
      if (timer <= 0) {
        entities.push({ x: lane.dir === 1 ? -lane.length : WIDTH });
        timer += lane.spawnRate;
      }
      return { ...lane, entities, timer };
    });
    const dead = (newFrog.y === 1 || newFrog.y === 2) && !safe;
    return { lanes: newLanes, frog: newFrog, dead };
  };

  useEffect(() => {
    let last = performance.now();
    let raf;
    const loop = (time) => {
      const dt = (time - last) / 1000;
      last = time;

      carsRef.current = updateCars(carsRef.current, dt);
      const logResult = updateLogs(logsRef.current, frogRef.current, dt);
      logsRef.current = logResult.lanes;
      frogRef.current = logResult.frog;
      if (logResult.dead || frogRef.current.x < 0 || frogRef.current.x >= WIDTH) {
        loseLife();
        frogRef.current = { ...initialFrog };
      } else {
        const carHit = carsRef.current.some(
          (lane) =>
            lane.y === frogRef.current.y &&
            lane.entities.some((e) => frogRef.current.x < e.x + lane.length && frogRef.current.x + 1 > e.x),
        );
        if (carHit) {
          loseLife();
          frogRef.current = { ...initialFrog };
        } else if (frogRef.current.y === 0) {
          setStatus('You Win!');
          setScore((s) => s + 100);
          reset();
          frogRef.current = { ...initialFrog };
        } else {
          setCars([...carsRef.current]);
          setLogs([...logsRef.current]);
          setFrog({ ...frogRef.current });
        }
      }

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (score >= nextLife.current) {
      setLives((l) => l + 1);
      nextLife.current += 500;
    }
    const level = Math.floor(score / 200);
    setCars((prev) =>
      prev.map((lane, i) => ({
        ...lane,
        speed: carLaneDefs[i].speed * (1 + level * 0.2),
        spawnRate: Math.max(0.3, carLaneDefs[i].spawnRate * (1 - level * 0.1)),
      }))
    );
    setLogs((prev) =>
      prev.map((lane, i) => ({
        ...lane,
        speed: logLaneDefs[i].speed * (1 + level * 0.2),
        spawnRate: Math.max(0.5, logLaneDefs[i].spawnRate * (1 - level * 0.1)),
      }))
    );
  }, [score]);

  const renderCell = (x, y) => {
    const isFrog = Math.floor(frog.x) === x && frog.y === y;
    const carLane = cars.find((l) => l.y === y);
    const logLane = logs.find((l) => l.y === y);

    let className = 'w-8 h-8';
    if (y === 0 || y === 3 || y === 6) className += ' bg-green-700';
    else if (y >= 4 && y <= 5) className += ' bg-gray-700';
    else className += ' bg-blue-700';

    if (isFrog) className += ' bg-green-400';
    else if (
      carLane &&
      carLane.entities.some((e) => x >= Math.floor(e.x) && x < Math.floor(e.x + carLane.length))
    )
      className += ' bg-red-500';
    else if (
      logLane &&
      logLane.entities.some((e) => x >= Math.floor(e.x) && x < Math.floor(e.x + logLane.length))
    )
      className += ' bg-yellow-700';

    return <div key={`${x}-${y}`} className={className} />;
  };

  const grid = [];
  for (let y = 0; y < HEIGHT; y += 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      grid.push(renderCell(x, y));
    }
  }

  return (
    <div
      id="frogger-container"
      className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white p-4"
    >
      <div className="grid grid-cols-7 gap-1">{grid}</div>
      <div className="mt-4">Score: {score} Lives: {lives}</div>
      <div className="mt-1">{status}</div>
      <div className="grid grid-cols-3 gap-1 mt-4 sm:hidden">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="w-12 h-12 bg-gray-700 opacity-50" />
        ))}
      </div>
    </div>
  );
};

export default Frogger;
