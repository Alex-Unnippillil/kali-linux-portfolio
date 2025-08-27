import React, { useEffect, useRef, useState } from 'react';
import usePersistentState from '../usePersistentState';

const Platformer = () => {
  const [levels, setLevels] = useState([]);
  const [progress, setProgress] = usePersistentState('platformer-progress', {
    level: 0,
    checkpoint: null,
    bestTimes: {},
  });
  const frameRef = useRef(null);

  useEffect(() => {
    fetch('/apps/platformer/levels.json')
      .then(r => r.json())
      .then(d => {
        const list = d.levels || [];
        try {
          if (localStorage.getItem('platformer-custom-level')) list.push('custom');
        } catch {}
        setLevels(list);
      });
  }, []);

  useEffect(() => {
    const handler = e => {
      if (!e.data) return;
      if (e.data.type === 'checkpoint') {
        setProgress(p => ({ ...p, checkpoint: e.data.checkpoint }));
      } else if (e.data.type === 'levelComplete') {
        setProgress(p => {
          const levelPath = levels[p.level];
          const bestTimes = { ...p.bestTimes };
          const time = parseFloat(e.data.time);
          if (!isNaN(time)) {
            const prev = bestTimes[levelPath];
            if (!prev || time < prev) bestTimes[levelPath] = time;
          }
          const nextLevel = Math.min(p.level + 1, levels.length - 1);
          return { level: nextLevel, checkpoint: null, bestTimes };
        });
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [levels, setProgress]);

  const levelPath = levels[progress.level];
  if (!levelPath) return <div className="w-full h-full flex items-center justify-center">All levels complete!</div>;

  const src = `/apps/platformer/index.html?lvl=${encodeURIComponent(levelPath)}${
    progress.checkpoint ? `&cp=${progress.checkpoint.x},${progress.checkpoint.y}` : ''
  }`;

  return (
    <div className="relative w-full h-full">
      <iframe
        ref={frameRef}
        src={src}
        title="Platformer"
        className="w-full h-full"
        frameBorder="0"
      ></iframe>
      <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white p-2 rounded">
        <select
          value={progress.level}
          onChange={e =>
            setProgress(p => ({ ...p, level: parseInt(e.target.value), checkpoint: null }))
          }
        >
          {levels.map((lvl, i) => (
            <option key={lvl} value={i}>
              {lvl === 'custom' ? 'Custom' : `Level ${i + 1}`}
              {progress.bestTimes[lvl]
                ? ` (${progress.bestTimes[lvl].toFixed(2)}s)`
                : ''}
            </option>
          ))}
        </select>
        {progress.bestTimes[levelPath] && (
          <div className="text-xs mt-1">
            Best: {progress.bestTimes[levelPath].toFixed(2)}s
          </div>
        )}
      </div>
    </div>
  );
};

export default Platformer;
