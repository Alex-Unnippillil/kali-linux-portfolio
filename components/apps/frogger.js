import React, { useState, useEffect, useRef } from 'react';
import useGameControls from '../../hooks/useGameControls';
import ReactGA from 'react-ga4';

const WIDTH = 7;
const HEIGHT = 8;
const SUB_STEP = 0.5;

const PAD_POSITIONS = [1, 3, 5];

const makeRng = (seed) => {
  let t = seed;
  return () => {
    t += 0x6d2b79f5;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
};

const handlePads = (frogPos, pads) => {
  if (frogPos.y !== 0) return { pads, dead: false, levelComplete: false, padHit: false };
  const idx = PAD_POSITIONS.indexOf(Math.floor(frogPos.x));
  if (idx === -1 || pads[idx]) {
    return { pads, dead: true, levelComplete: false, padHit: false };
  }
  const newPads = [...pads];
  newPads[idx] = true;
  const levelComplete = newPads.every(Boolean);
  return { pads: newPads, dead: false, levelComplete, padHit: true };
};

const rampLane = (base, level, minSpawn) => ({
  ...base,
  speed: base.speed * (1 + (level - 1) * 0.2),
  spawnRate: Math.max(minSpawn, base.spawnRate * (1 - (level - 1) * 0.1)),
});

const initialFrog = { x: Math.floor(WIDTH / 2), y: HEIGHT - 1 };

const carLaneDefs = [
  { y: 4, dir: 1, speed: 1, spawnRate: 2, length: 1 },
  { y: 5, dir: -1, speed: 1.2, spawnRate: 1.8, length: 1 },
];

const logLaneDefs = [
  { y: 1, dir: -1, speed: 0.5, spawnRate: 2.5, length: 2 },
  { y: 2, dir: 1, speed: 0.7, spawnRate: 2.2, length: 2 },
];

const initLane = (lane, seed) => {
  const rng = makeRng(seed);
  return {
    ...lane,
    entities: [],
    rng,
    timer: lane.spawnRate * (0.5 + rng()),
  };
};

const updateCars = (prev, frogPos, dt) => {
  let dead = false;
  const newLanes = prev.map((lane) => {
    let timer = lane.timer - dt;
    let entities = lane.entities;
    const dist = lane.dir * lane.speed * dt;
    const steps = Math.max(1, Math.ceil(Math.abs(dist) / SUB_STEP));
    const stepDist = dist / steps;
    for (let i = 0; i < steps; i += 1) {
      entities = entities.map((e) => ({ ...e, x: e.x + stepDist }));
      if (
        lane.y === frogPos.y &&
        entities.some((e) => frogPos.x < e.x + lane.length && frogPos.x + 1 > e.x)
      )
        dead = true;
    }
    entities = entities.filter((e) => e.x + lane.length > 0 && e.x < WIDTH);
    if (timer <= 0) {
      entities.push({ x: lane.dir === 1 ? -lane.length : WIDTH });
      timer += lane.spawnRate * (0.5 + lane.rng());
    }
    return { ...lane, entities, timer };
  });
  return { lanes: newLanes, dead };
};

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
      if (
        newFrog.y === lane.y &&
        entities.some((e) => e.x <= newFrog.x && newFrog.x < e.x + lane.length)
      ) {
        newFrog.x += stepDist;
        safe = true;
      }
    }
    entities = entities.filter((e) => e.x + lane.length > 0 && e.x < WIDTH);
    if (timer <= 0) {
      entities.push({ x: lane.dir === 1 ? -lane.length : WIDTH });
      timer += lane.spawnRate * (0.5 + lane.rng());
    }
    return { ...lane, entities, timer };
  });
  const dead = (newFrog.y === 1 || newFrog.y === 2) && !safe;
  return { lanes: newLanes, frog: newFrog, dead };
};

const Frogger = () => {
  const [frog, setFrog] = useState(initialFrog);
  const frogRef = useRef(frog);
  const [cars, setCars] = useState(carLaneDefs.map((l, i) => initLane(l, i + 1)));
  const carsRef = useRef(cars);
  const [logs, setLogs] = useState(logLaneDefs.map((l, i) => initLane(l, i + 101)));
  const logsRef = useRef(logs);
  const [pads, setPads] = useState(PAD_POSITIONS.map(() => false));
  const padsRef = useRef(pads);
  const [status, setStatus] = useState('');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const nextLife = useRef(500);
  const holdRef = useRef();

  useEffect(() => { frogRef.current = frog; }, [frog]);
  useEffect(() => { carsRef.current = cars; }, [cars]);
  useEffect(() => { logsRef.current = logs; }, [logs]);
  useEffect(() => { padsRef.current = pads; }, [pads]);

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

  const startHold = (dx, dy) => {
    moveFrog(dx, dy);
    holdRef.current = setInterval(() => moveFrog(dx, dy), 220);
  };

  const endHold = () => {
    clearInterval(holdRef.current);
  };

  useGameControls({
    keydown: {
      ArrowLeft: () => moveFrog(-1, 0),
      ArrowRight: () => moveFrog(1, 0),
      ArrowUp: () => moveFrog(0, -1),
      ArrowDown: () => moveFrog(0, 1),
    },
    swipe: {
      left: () => moveFrog(-1, 0),
      right: () => moveFrog(1, 0),
      up: () => moveFrog(0, -1),
      down: () => moveFrog(0, 1),
    },
  });

  useEffect(() => {
    ReactGA.event({ category: 'Frogger', action: 'level_start', value: 1 });
  }, []);

    const reset = useCallback((full = false) => {
      setFrog(initialFrog);
      setCars(carLaneDefs.map((l, i) => initLane(l, i + 1)));
      setLogs(logLaneDefs.map((l, i) => initLane(l, i + 101)));
    setStatus('');
    if (full) {
      setScore(0);
      setLives(3);
      setPads(PAD_POSITIONS.map(() => false));
      setLevel(1);
      nextLife.current = 500;
      ReactGA.event({ category: 'Frogger', action: 'level_start', value: 1 });
    }
    }, []);

    const loseLife = useCallback(() => {
      ReactGA.event({ category: 'Frogger', action: 'death', value: level });
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
    }, [level, reset]);


    useEffect(() => {
      let last = performance.now();
    let raf;
    const loop = (time) => {
      const dt = (time - last) / 1000;
      last = time;

      const carResult = updateCars(carsRef.current, frogRef.current, dt);
      carsRef.current = carResult.lanes;
      const logResult = updateLogs(logsRef.current, frogRef.current, dt);
      logsRef.current = logResult.lanes;
      frogRef.current = logResult.frog;
      if (
        carResult.dead ||
        logResult.dead ||
        frogRef.current.x < 0 ||
        frogRef.current.x >= WIDTH
      ) {
        loseLife();
        frogRef.current = { ...initialFrog };
      } else {
        const padResult = handlePads(frogRef.current, padsRef.current);
        padsRef.current = padResult.pads;
        if (padResult.dead) {
          loseLife();
          frogRef.current = { ...initialFrog };
        } else if (padResult.levelComplete) {
          setStatus('Level Complete!');
          setScore((s) => s + 100);
          ReactGA.event({ category: 'Frogger', action: 'level_complete', value: level });
          setLevel((l) => {
            const newLevel = l + 1;
            ReactGA.event({ category: 'Frogger', action: 'level_start', value: newLevel });
            return newLevel;
          });
          setPads(PAD_POSITIONS.map(() => false));
          reset();
          frogRef.current = { ...initialFrog };
        } else {
          if (padResult.padHit) {
            setScore((s) => s + 100);
            setPads([...padsRef.current]);
            frogRef.current = { ...initialFrog };
          }
          setCars([...carsRef.current]);
          setLogs([...logsRef.current]);
          setFrog({ ...frogRef.current });
        }
      }

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    }, [level, loseLife, reset]);

  useEffect(() => {
    if (score >= nextLife.current) {
      setLives((l) => l + 1);
      nextLife.current += 500;
    }
  }, [score]);

  useEffect(() => {
    setCars((prev) =>
      prev.map((lane, i) => ({
        ...lane,
        ...rampLane(carLaneDefs[i], level, 0.3),
      }))
    );
    setLogs((prev) =>
      prev.map((lane, i) => ({
        ...lane,
        ...rampLane(logLaneDefs[i], level, 0.5),
      }))
    );
  }, [level]);

  const renderCell = (x, y) => {
    const isFrog = Math.floor(frog.x) === x && frog.y === y;
    const carLane = cars.find((l) => l.y === y);
    const logLane = logs.find((l) => l.y === y);

    let className = 'w-8 h-8';
    if (y === 0) {
      const idx = PAD_POSITIONS.indexOf(x);
      if (idx >= 0) className += pads[idx] ? ' bg-green-400' : ' bg-green-700';
      else className += ' bg-blue-700';
    } else if (y === 3 || y === 6) className += ' bg-green-700';
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

  const mobileControls = [
    null,
    { dx: 0, dy: -1, label: '↑' },
    null,
    { dx: -1, dy: 0, label: '←' },
    null,
    { dx: 1, dy: 0, label: '→' },
    null,
    { dx: 0, dy: 1, label: '↓' },
    null,
  ];

  return (
    <div
      id="frogger-container"
      className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white p-4"
    >
      <div className="grid grid-cols-7 gap-1">{grid}</div>
      <div className="mt-4">Score: {score} Lives: {lives}</div>
      <div className="mt-1">{status}</div>
      <div className="grid grid-cols-3 gap-1 mt-4 sm:hidden">
        {mobileControls.map((c, i) =>
          c ? (
            <button
              key={i}
              className="w-12 h-12 bg-gray-700 opacity-50 flex items-center justify-center"
              onTouchStart={() => startHold(c.dx, c.dy)}
              onTouchEnd={endHold}
              onMouseDown={() => startHold(c.dx, c.dy)}
              onMouseUp={endHold}
              onMouseLeave={endHold}
            >
              {c.label}
            </button>
          ) : (
            <div key={i} className="w-12 h-12" />
          ),
        )}
      </div>
    </div>
  );
};

export default Frogger;

export {
  makeRng,
  initLane,
  updateCars,
  updateLogs,
  handlePads,
  PAD_POSITIONS,
  carLaneDefs,
  logLaneDefs,
  rampLane,
};
