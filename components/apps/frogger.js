import React, { useState, useEffect } from 'react';

const WIDTH = 7;
const HEIGHT = 8;

const initialFrog = { x: Math.floor(WIDTH / 2), y: HEIGHT - 1 };

const initialCars = [
  { y: 4, dir: 1, positions: [0, 3] },
  { y: 5, dir: -1, positions: [2, 5] },
];

const initialLogs = [
  { y: 1, dir: -1, positions: [1, 4] },
  { y: 2, dir: 1, positions: [0, 3, 6] },
];

const Frogger = () => {
  const [frog, setFrog] = useState(initialFrog);
  const [cars, setCars] = useState(initialCars);
  const [logs, setLogs] = useState(initialLogs);
  const [status, setStatus] = useState('');

  useEffect(() => {
    const handleKey = (e) => {
      setFrog((prev) => {
        let { x, y } = prev;
        if (e.key === 'ArrowLeft') x -= 1;
        if (e.key === 'ArrowRight') x += 1;
        if (e.key === 'ArrowUp') y -= 1;
        if (e.key === 'ArrowDown') y += 1;
        if (x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT) return prev;
        return { x, y };
      });
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const reset = () => {
    setFrog(initialFrog);
    setCars(initialCars);
    setLogs(initialLogs);
    setStatus('');
  };

  useEffect(() => {
    const interval = setInterval(() => {
      let newCars = [];
      let newLogs = [];

      setCars((prev) => {
        newCars = prev.map((lane) => ({
          ...lane,
          positions: lane.positions.map((x) => (x + lane.dir + WIDTH) % WIDTH),
        }));
        return newCars;
      });

      setLogs((prev) => {
        newLogs = prev.map((lane) => ({
          ...lane,
          positions: lane.positions.map((x) => (x + lane.dir + WIDTH) % WIDTH),
        }));
        return newLogs;
      });

      setFrog((prev) => {
        let newFrog = { ...prev };

        const logLane = newLogs.find((l) => l.y === newFrog.y);
        if (newFrog.y === 1 || newFrog.y === 2) {
          if (logLane && logLane.positions.includes(newFrog.x)) {
            newFrog.x = (newFrog.x + logLane.dir + WIDTH) % WIDTH;
          } else {
            setStatus('Game Over');
            setTimeout(reset, 500);
            return initialFrog;
          }
        }

        if (newFrog.x < 0 || newFrog.x >= WIDTH) {
          setStatus('Game Over');
          setTimeout(reset, 500);
          return initialFrog;
        }

        const carLane = newCars.find((l) => l.y === newFrog.y);
        if (carLane && carLane.positions.includes(newFrog.x)) {
          setStatus('Game Over');
          setTimeout(reset, 500);
          return initialFrog;
        }

        if (newFrog.y === 0) {
          setStatus('You Win!');
          setTimeout(reset, 500);
        }
        return newFrog;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const renderCell = (x, y) => {
    const isFrog = frog.x === x && frog.y === y;
    const carLane = cars.find((l) => l.y === y);
    const logLane = logs.find((l) => l.y === y);

    let className = 'w-8 h-8';
    if (y === 0 || y === 3 || y === 6) className += ' bg-green-700';
    else if (y >= 4 && y <= 5) className += ' bg-gray-700';
    else className += ' bg-blue-700';

    if (isFrog) className += ' bg-green-400';
    else if (carLane && carLane.positions.includes(x)) className += ' bg-red-500';
    else if (logLane && logLane.positions.includes(x)) className += ' bg-yellow-700';

    return <div key={`${x}-${y}`} className={className} />;
  };

  const grid = [];
  for (let y = 0; y < HEIGHT; y += 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      grid.push(renderCell(x, y));
    }
  }

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white p-4">
      <div className="grid grid-cols-7 gap-1">{grid}</div>
      <div className="mt-4">{status}</div>
    </div>
  );
};

export default Frogger;
