import React, { useRef, useEffect, useState } from 'react';

/**
 * Small Pacman implementation used inside the portfolio.  The goal of this
 * rewrite is not to be a perfect clone of the arcade game but to provide a
 * reasonable approximation that demonstrates a faithful ghost AI, buffered
 * turns and support for different input methods.
 */

// 0: empty, 1: wall, 2: pellet, 3: energizer
const mazeTemplate = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,3,2,2,1,2,2,2,2,2,1,2,2,3,1],
  [1,2,1,2,1,2,1,1,1,2,1,2,1,2,1],
  [1,2,1,2,2,2,2,0,1,2,2,2,1,2,1],
  [1,2,1,1,1,1,2,1,1,2,1,1,1,2,1],
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

const tileSize = 20;
const speed = 1; // pixels per frame

const dirs = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
];

const SCATTER_CORNERS = {
  blinky: { x: 13, y: 0 },
  pinky: { x: 0, y: 0 },
  inky: { x: 13, y: 6 },
  clyde: { x: 0, y: 6 },
};

const modeSchedule = [
  { mode: 'scatter', duration: 7 * 60 },
  { mode: 'chase', duration: 20 * 60 },
  { mode: 'scatter', duration: 7 * 60 },
  { mode: 'chase', duration: 20 * 60 },
  { mode: 'scatter', duration: 5 * 60 },
  { mode: 'chase', duration: 20 * 60 },
  { mode: 'scatter', duration: 5 * 60 },
  { mode: 'chase', duration: Infinity },
];

const fruitSpawnDots = [10, 30];

const Pacman = () => {
  const canvasRef = useRef(null);
  const mazeRef = useRef(mazeTemplate.map((row) => row.slice()));
  const pacRef = useRef({
    x: tileSize, // pixel coords
    y: tileSize,
    dir: { x: 0, y: 0 },
    nextDir: { x: 0, y: 0 },
    lives: 3,
    extra: false,
  });
  const ghostsRef = useRef([
    { name: 'blinky', x: 7 * tileSize, y: 3 * tileSize, dir: { x: 0, y: -1 }, color: 'red' },
    { name: 'pinky', x: 7 * tileSize, y: 3 * tileSize, dir: { x: 0, y: -1 }, color: 'pink' },
    { name: 'inky', x: 7 * tileSize, y: 3 * tileSize, dir: { x: 0, y: -1 }, color: 'cyan' },
    { name: 'clyde', x: 7 * tileSize, y: 3 * tileSize, dir: { x: 0, y: -1 }, color: 'orange' },
  ]);
  const modeRef = useRef({ index: 0, timer: modeSchedule[0].duration });
  const frightTimerRef = useRef(0);
  const [score, setScore] = useState(0);
  const [pellets, setPellets] = useState(0);
  const fruitRef = useRef({ active: false, x: 7, y: 3 });
  const statusRef = useRef('Playing');

  const tileAt = (tx, ty) => (mazeRef.current[ty] ? mazeRef.current[ty][tx] : 1);

  const isCenter = (pos) => Math.abs(pos % tileSize - tileSize / 2) < 0.1;

  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  const targetFor = (ghost, pac) => {
    if (frightTimerRef.current > 0) return null;
    if (modeSchedule[modeRef.current.index].mode === 'scatter') {
      return SCATTER_CORNERS[ghost.name];
    }
    const px = Math.floor(pac.x / tileSize);
    const py = Math.floor(pac.y / tileSize);
    const pdx = pac.dir.x;
    const pdy = pac.dir.y;
    switch (ghost.name) {
      case 'blinky':
        return { x: px, y: py };
      case 'pinky':
        return { x: px + 4 * pdx, y: py + 4 * pdy };
      case 'inky':
        const blinky = ghostsRef.current[0];
        const bx = Math.floor(blinky.x / tileSize);
        const by = Math.floor(blinky.y / tileSize);
        const tx = px + 2 * pdx;
        const ty = py + 2 * pdy;
        return { x: tx * 2 - bx, y: ty * 2 - by };
      case 'clyde':
        const dist = Math.hypot(px - Math.floor(ghost.x / tileSize), py - Math.floor(ghost.y / tileSize));
        if (dist > 8) return { x: px, y: py };
        return SCATTER_CORNERS.clyde;
      default:
        return { x: px, y: py };
    }
  };

  const availableDirs = (gx, gy, dir) => {
    const rev = { x: -dir.x, y: -dir.y };
    return dirs.filter((d) => {
      if (d.x === rev.x && d.y === rev.y) return false;
      const nx = gx + d.x;
      const ny = gy + d.y;
      return tileAt(nx, ny) !== 1;
    });
  };

  const draw = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const maze = mazeRef.current;
    for (let y = 0; y < maze.length; y++) {
      for (let x = 0; x < maze[y].length; x++) {
        if (maze[y][x] === 1) {
          ctx.fillStyle = '#2222ff';
          ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
        } else if (maze[y][x] === 2) {
          ctx.fillStyle = 'white';
          ctx.beginPath();
          ctx.arc(x * tileSize + tileSize / 2, y * tileSize + tileSize / 2, 3, 0, Math.PI * 2);
          ctx.fill();
        } else if (maze[y][x] === 3) {
          ctx.fillStyle = 'white';
          ctx.beginPath();
          ctx.arc(x * tileSize + tileSize / 2, y * tileSize + tileSize / 2, 6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    if (fruitRef.current.active) {
      ctx.fillStyle = 'green';
      ctx.fillRect(fruitRef.current.x * tileSize + 4, fruitRef.current.y * tileSize + 4, tileSize - 8, tileSize - 8);
    }

    const pac = pacRef.current;
    ctx.fillStyle = 'yellow';
    ctx.beginPath();
    const angle = Math.atan2(pac.dir.y, pac.dir.x);
    const startAngle = angle + Math.PI / 6;
    const endAngle = angle - Math.PI / 6 + Math.PI * 2;
    ctx.moveTo(pac.x + tileSize / 2, pac.y + tileSize / 2);
    ctx.arc(pac.x + tileSize / 2, pac.y + tileSize / 2, tileSize / 2 - 2, startAngle, endAngle, false);
    ctx.closePath();
    ctx.fill();

    ghostsRef.current.forEach((g) => {
      ctx.fillStyle = frightTimerRef.current > 0 ? 'blue' : g.color;
      ctx.beginPath();
      ctx.arc(g.x + tileSize / 2, g.y + tileSize / 2, tileSize / 2 - 2, 0, Math.PI * 2);
      ctx.fill();
    });
  };

  const step = () => {
    const pac = pacRef.current;
    const maze = mazeRef.current;

    // handle pacman turning
    const px = pac.x / tileSize;
    const py = pac.y / tileSize;
    if (pac.nextDir.x || pac.nextDir.y) {
      const nx = Math.floor(px + pac.nextDir.x * 0.5);
      const ny = Math.floor(py + pac.nextDir.y * 0.5);
      if (tileAt(nx, ny) !== 1 && isCenter(pac.x) && isCenter(pac.y)) {
        pac.dir = pac.nextDir;
        pac.nextDir = { x: 0, y: 0 };
      }
    }

    // move pacman
    const tx = Math.floor((pac.x + pac.dir.x * speed + tileSize / 2) / tileSize);
    const ty = Math.floor((pac.y + pac.dir.y * speed + tileSize / 2) / tileSize);
    if (tileAt(tx, ty) !== 1) {
      pac.x += pac.dir.x * speed;
      pac.y += pac.dir.y * speed;
    } else {
      pac.dir = { x: 0, y: 0 };
    }

    const ptx = Math.floor((pac.x + tileSize / 2) / tileSize);
    const pty = Math.floor((pac.y + tileSize / 2) / tileSize);
    if (maze[pty][ptx] === 2 || maze[pty][ptx] === 3) {
      if (maze[pty][ptx] === 2) {
        setScore((s) => s + 10);
        setPellets((p) => p + 1);
      } else {
        setScore((s) => s + 50);
        frightTimerRef.current = 6 * 60;
      }
      maze[pty][ptx] = 0;
    }

    if (!fruitRef.current.active && fruitSpawnDots.includes(pellets + 1)) {
      fruitRef.current.active = true;
    }
    if (fruitRef.current.active && ptx === fruitRef.current.x && pty === fruitRef.current.y) {
      setScore((s) => s + 100);
      fruitRef.current.active = false;
    }

    // extra life
    if (!pac.extra && score >= 10000) {
      pac.extra = true;
      pac.lives += 1;
    }

    // mode switching
    if (frightTimerRef.current > 0) {
      frightTimerRef.current--;
    } else {
      modeRef.current.timer--;
      if (modeRef.current.timer <= 0 && modeRef.current.index < modeSchedule.length - 1) {
        modeRef.current.index += 1;
        modeRef.current.timer = modeSchedule[modeRef.current.index].duration;
      }
    }

    // move ghosts
    ghostsRef.current.forEach((g) => {
      const gx = g.x / tileSize;
      const gy = g.y / tileSize;
      if (isCenter(g.x) && isCenter(g.y)) {
        let options = availableDirs(Math.floor(gx), Math.floor(gy), g.dir);
        if (frightTimerRef.current > 0) {
          g.dir = options[Math.floor(Math.random() * options.length)] || g.dir;
        } else {
          const target = targetFor(g, pac);
          if (target) {
            options.sort((a, b) => {
              const da = distance({ x: Math.floor(gx) + a.x, y: Math.floor(gy) + a.y }, target);
              const db = distance({ x: Math.floor(gx) + b.x, y: Math.floor(gy) + b.y }, target);
              return da - db;
            });
          }
          g.dir = options[0] || g.dir;
        }
      }
      const ntx = Math.floor((g.x + g.dir.x * speed + tileSize / 2) / tileSize);
      const nty = Math.floor((g.y + g.dir.y * speed + tileSize / 2) / tileSize);
      if (tileAt(ntx, nty) !== 1) {
        g.x += g.dir.x * speed;
        g.y += g.dir.y * speed;
      }

      const gtx = Math.floor((g.x + tileSize / 2) / tileSize);
      const gty = Math.floor((g.y + tileSize / 2) / tileSize);
      if (gtx === ptx && gty === pty) {
        if (frightTimerRef.current > 0) {
          setScore((s) => s + 200);
          g.x = 7 * tileSize;
          g.y = 3 * tileSize;
        } else {
          statusRef.current = 'Game Over';
        }
      }
    });
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.width = mazeRef.current[0].length * tileSize;
    canvas.height = mazeRef.current.length * tileSize;
    const handleKey = (e) => {
      switch (e.key) {
        case 'ArrowUp':
          pacRef.current.nextDir = { x: 0, y: -1 };
          break;
        case 'ArrowDown':
          pacRef.current.nextDir = { x: 0, y: 1 };
          break;
        case 'ArrowLeft':
          pacRef.current.nextDir = { x: -1, y: 0 };
          break;
        case 'ArrowRight':
          pacRef.current.nextDir = { x: 1, y: 0 };
          break;
        default:
          break;
      }
    };
    const handleTouch = (e) => {
      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const dx = x - cx;
      const dy = y - cy;
      if (Math.abs(dx) > Math.abs(dy)) {
        pacRef.current.nextDir = { x: dx > 0 ? 1 : -1, y: 0 };
      } else {
        pacRef.current.nextDir = { x: 0, y: dy > 0 ? 1 : -1 };
      }
    };
    window.addEventListener('keydown', handleKey);
    canvas.addEventListener('touchstart', handleTouch);
    let id;
    const loop = () => {
      if (statusRef.current === 'Playing') {
        step();
        draw();
        // simple gamepad polling
        const pads = navigator.getGamepads ? navigator.getGamepads() : [];
        if (pads) {
          for (const pad of pads) {
            if (!pad) continue;
            const [ax, ay] = pad.axes;
            if (Math.abs(ax) > 0.3) pacRef.current.nextDir = { x: ax > 0 ? 1 : -1, y: 0 };
            if (Math.abs(ay) > 0.3) pacRef.current.nextDir = { x: 0, y: ay > 0 ? 1 : -1 };
          }
        }
        id = requestAnimationFrame(loop);
      }
    };
    draw();
    loop();
    return () => {
      window.removeEventListener('keydown', handleKey);
      canvas.removeEventListener('touchstart', handleTouch);
      cancelAnimationFrame(id);
    };
  }, []);

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white p-4">
      <canvas ref={canvasRef} className="bg-black" />
      <div className="mt-2">Score: {score}</div>
      {statusRef.current !== 'Playing' && <div className="mt-2">{statusRef.current}</div>}
    </div>
  );
};

export default Pacman;

