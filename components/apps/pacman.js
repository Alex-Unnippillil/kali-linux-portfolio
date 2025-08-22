import React, { useRef, useEffect, useState } from 'react';

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
const dirs = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
];

const Pacman = () => {
  const canvasRef = useRef(null);
  const mazeRef = useRef(mazeTemplate.map((row) => row.slice()));
  const pacRef = useRef({ x: 1, y: 1, dir: { x: 0, y: 0 }, nextDir: { x: 0, y: 0 } });
  const ghostsRef = useRef([
    { x: 7, y: 3, dir: { x: 0, y: 1 }, color: 'red', start: { x: 7, y: 3 } },
    { x: 7, y: 3, dir: { x: 0, y: -1 }, color: 'pink', start: { x: 7, y: 3 } },
  ]);
  const [score, setScore] = useState(0);
  const powerRef = useRef(0);
  const statusRef = useRef('Playing');

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
    const pac = pacRef.current;
    ctx.fillStyle = 'yellow';
    ctx.beginPath();
    const angle = Math.atan2(pac.dir.y, pac.dir.x);
    const startAngle = angle + Math.PI / 6;
    const endAngle = angle - Math.PI / 6 + Math.PI * 2;
    ctx.moveTo(pac.x * tileSize + tileSize / 2, pac.y * tileSize + tileSize / 2);
    ctx.arc(
      pac.x * tileSize + tileSize / 2,
      pac.y * tileSize + tileSize / 2,
      tileSize / 2 - 2,
      startAngle,
      endAngle,
      false
    );
    ctx.closePath();
    ctx.fill();

    ghostsRef.current.forEach((g) => {
      ctx.fillStyle = powerRef.current > 0 ? 'blue' : g.color;
      ctx.beginPath();
      ctx.arc(g.x * tileSize + tileSize / 2, g.y * tileSize + tileSize / 2, tileSize / 2 - 2, 0, Math.PI * 2);
      ctx.fill();
    });
  };

  const step = () => {
    const maze = mazeRef.current;
    const pac = pacRef.current;

    if (pac.nextDir.x || pac.nextDir.y) {
      const nx = pac.x + pac.nextDir.x;
      const ny = pac.y + pac.nextDir.y;
      if (maze[ny] && maze[ny][nx] !== 1) {
        pac.dir = pac.nextDir;
        pac.nextDir = { x: 0, y: 0 };
      }
    }

    const tx = pac.x + pac.dir.x;
    const ty = pac.y + pac.dir.y;
    if (maze[ty] && maze[ty][tx] !== 1) {
      pac.x = tx;
      pac.y = ty;
      if (maze[ty][tx] === 2) {
        maze[ty][tx] = 0;
        setScore((s) => s + 1);
      } else if (maze[ty][tx] === 3) {
        maze[ty][tx] = 0;
        setScore((s) => s + 5);
        powerRef.current = 200;
      }
    }

    ghostsRef.current.forEach((g) => {
      let nx = g.x + g.dir.x;
      let ny = g.y + g.dir.y;
      if (maze[ny][nx] === 1) {
        const options = dirs.filter((d) => maze[g.y + d.y][g.x + d.x] !== 1);
        const choice = options[Math.floor(Math.random() * options.length)];
        g.dir = choice || { x: 0, y: 0 };
        nx = g.x + g.dir.x;
        ny = g.y + g.dir.y;
      }
      g.x = nx;
      g.y = ny;
      if (g.x === pac.x && g.y === pac.y) {
        if (powerRef.current > 0) {
          setScore((s) => s + 20);
          g.x = g.start.x;
          g.y = g.start.y;
        } else {
          statusRef.current = 'Game Over';
        }
      }
    });
    if (powerRef.current > 0) powerRef.current -= 1;
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
    window.addEventListener('keydown', handleKey);
    let id;
    const loop = () => {
      if (statusRef.current === 'Playing') {
        step();
        draw();
        id = requestAnimationFrame(loop);
      }
    };
    draw();
    loop();
    return () => {
      window.removeEventListener('keydown', handleKey);
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

