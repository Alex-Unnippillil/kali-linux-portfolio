import React, { useRef, useEffect } from 'react';

export const TILE = 40;
export const PAD_POSITIONS = [TILE, TILE * 3, TILE * 5, TILE * 7, TILE * 9];

const rng = (seed) => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};

export const initLane = (def, seed = Date.now()) => ({
  ...def,
  cars: [],
  timer: rng(seed)() * def.spawnRate,
  rng: rng(seed),
});

export const updateCars = (lanes, frog, dt) => {
  const newLanes = lanes.map((lane) => {
    let timer = lane.timer - dt;
    const cars = lane.cars
      .map((c) => ({ ...c, x: c.x + lane.speed * lane.dir * dt }))
      .filter((c) => c.x + c.width > 0 && c.x < 400);

    if (timer <= 0) {
      const width = lane.length * TILE;
      const x = lane.dir === 1 ? -width : 400;
      cars.push({ x, width, height: TILE });
      timer += lane.spawnRate + lane.rng() * lane.spawnRate;
    }
    return { ...lane, cars, timer };
  });

  const frogBox = { x: frog.x, y: frog.y, width: TILE, height: TILE };
  const dead = newLanes.some(
    (lane) =>
      lane.y === frog.y &&
      lane.cars.some(
        (c) => frogBox.x < c.x + c.width && frogBox.x + frogBox.width > c.x
      )
  );
  return { lanes: newLanes, dead };
};

export const handlePads = (frog, pads) => {
  const index = PAD_POSITIONS.indexOf(frog.x);
  if (frog.y !== 0 || index === -1)
    return { pads, padHit: false, dead: true };
  if (pads[index]) return { pads, padHit: false, dead: true };
  const next = [...pads];
  next[index] = true;
  return { pads: next, padHit: true, dead: false };
};

export const rampLane = (lane, level, minRate) => {
  const inc = level - 1;
  return {
    ...lane,
    speed: lane.speed * (1 + 0.2 * inc),
    spawnRate: Math.max(minRate, lane.spawnRate * (1 - 0.1 * inc)),
  };
};

export const carLaneDefs = [
  { y: 0, dir: 1, speed: 1, spawnRate: 1, length: 1 },
];
export const logLaneDefs = [
  { y: 0, dir: 1, speed: 1, spawnRate: 1, length: 1 },
];

const Frogger = () => {
  const bgRef = useRef(null);
  const spriteRef = useRef(null);

  useEffect(() => {
    const bg = bgRef.current;
    const fg = spriteRef.current;
    const bgCtx = bg.getContext('2d');
    const ctx = fg.getContext('2d');
    const width = fg.width;
    const height = fg.height;
    const tile = TILE;

    let level = parseInt(localStorage.getItem('frogger-level') || '1', 10);
    let score = 0;

    const lanes = [];

    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const playTone = (freq, duration = 0.1) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        audioCtx.currentTime + duration
      );
      osc.stop(audioCtx.currentTime + duration);
    };

    const drawBackground = () => {
      bgCtx.fillStyle = '#222';
      bgCtx.fillRect(0, 0, width, height);
      bgCtx.fillStyle = '#444';
      for (let i = 1; i < 9; i++) {
        if (i === 9) continue;
        bgCtx.fillRect(0, i * tile, width, 2);
      }
      bgCtx.fillStyle = '#0a0';
      bgCtx.fillRect(0, 0, width, tile);
      bgCtx.fillRect(0, height - tile, width, tile);
    };

    const initLevel = () => {
      lanes.length = 0;
      const baseSpeed = 1 + level * 0.5;
      const patterns = [
        { dir: 1, spawnRate: 120 },
        { dir: -1, spawnRate: 100 },
        { dir: 1, spawnRate: 80 },
      ];
      patterns.forEach((p, i) => {
        lanes.push(
          initLane(
            {
              y: height - tile * (2 + i),
              dir: p.dir,
              speed: baseSpeed + i * 0.2,
              spawnRate: p.spawnRate,
              length: 2,
            },
            i + 1
          )
        );
      });
      resetFrog();
    };

    const frog = { x: width / 2 - tile / 2, y: height - tile, size: tile };

    const resetFrog = () => {
      frog.x = width / 2 - tile / 2;
      frog.y = height - tile;
    };

    const moveFrog = (dx, dy) => {
      audioCtx.resume();
      frog.x = Math.min(Math.max(0, frog.x + dx * tile), width - tile);
      frog.y = Math.min(Math.max(0, frog.y + dy * tile), height - tile);
      playTone(440, 0.05);
    };

    const handleKey = (e) => {
      if (e.key === 'ArrowUp') moveFrog(0, -1);
      else if (e.key === 'ArrowDown') moveFrog(0, 1);
      else if (e.key === 'ArrowLeft') moveFrog(-1, 0);
      else if (e.key === 'ArrowRight') moveFrog(1, 0);
    };

    window.addEventListener('keydown', handleKey);

    let touchStart = null;
    const handleTouchStart = (e) => {
      const t = e.touches[0];
      touchStart = { x: t.clientX, y: t.clientY };
    };
    const handleTouchEnd = (e) => {
      if (!touchStart) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - touchStart.x;
      const dy = t.clientY - touchStart.y;
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);
      if (Math.max(absX, absY) > 20) {
        if (absX > absY) moveFrog(dx > 0 ? 1 : -1, 0);
        else moveFrog(0, dy > 0 ? 1 : -1);
      }
      touchStart = null;
    };
    fg.addEventListener('touchstart', handleTouchStart);
    fg.addEventListener('touchend', handleTouchEnd);

    const reset = () => {
      level = 1;
      score = 0;
      localStorage.setItem('frogger-level', level.toString());
      initLevel();
    };

    const update = () => {
      ctx.clearRect(0, 0, width, height);

      const result = updateCars(lanes, frog, 1);
      lanes.splice(0, lanes.length, ...result.lanes);
      if (result.dead) {
        playTone(200, 0.2);
        resetFrog();
        score = Math.max(0, score - 10);
      }

      if (frog.y <= 0) {
        const padResult = handlePads(
          { x: frog.x, y: 0 },
          PAD_POSITIONS.map(() => false)
        );
        if (padResult.padHit) {
          playTone(800, 0.2);
          level += 1;
          score += 100;
          localStorage.setItem('frogger-level', level.toString());
          initLevel();
        } else {
          playTone(200, 0.2);
          resetFrog();
        }
      }

      lanes.forEach((lane) => {
        ctx.fillStyle = '#888';
        lane.cars.forEach((v) => {
          ctx.fillRect(v.x, lane.y, v.width, TILE);
        });
      });

      ctx.fillStyle = '#0f0';
      ctx.fillRect(frog.x, frog.y, frog.size, frog.size);
      ctx.fillStyle = 'white';
      ctx.font = '16px sans-serif';
      ctx.fillText(`Score: ${score} Level: ${level}`, 10, 20);

      requestAnimationFrame(update);
    };

    drawBackground();
    initLevel();
    requestAnimationFrame(update);

    return () => {
      window.removeEventListener('keydown', handleKey);
      fg.removeEventListener('touchstart', handleTouchStart);
      fg.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  return (
    <div className="w-full h-full relative">
      <canvas
        ref={bgRef}
        width={400}
        height={400}
        className="absolute inset-0 w-full h-full"
      />
      <canvas
        ref={spriteRef}
        width={400}
        height={400}
        className="absolute inset-0 w-full h-full"
      />
    </div>
  );
};

export default Frogger;

