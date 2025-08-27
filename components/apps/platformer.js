import React, { useEffect, useState } from 'react';
import usePersistentState from '../usePersistentState';
import ExternalFrame from '../ExternalFrame';

const Platformer = () => {
  const [levels, setLevels] = useState([]);
  const [progress, setProgress] = usePersistentState('platformer-progress', {
    level: 0,
    checkpoint: null,
  });
  useEffect(() => {
    fetch('/apps/platformer/levels.json')
      .then(r => r.json())
      .then(d => setLevels(d.levels || []));
  }, []);

  useEffect(() => {
    const handler = e => {
      if (!e.data) return;
      if (e.data.type === 'checkpoint') {
        setProgress(p => ({ ...p, checkpoint: e.data.checkpoint }));
      } else if (e.data.type === 'levelComplete') {
        setProgress(p => ({ level: p.level + 1, checkpoint: null }));
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [setProgress]);

  const levelPath = levels[progress.level];
  if (!levelPath) return <div className="w-full h-full flex items-center justify-center">All levels complete!</div>;

  const src = `/apps/platformer/index.html?lvl=${encodeURIComponent(levelPath)}${
    progress.checkpoint ? `&cp=${progress.checkpoint.x},${progress.checkpoint.y}` : ''
  }`;

  return (
    <ExternalFrame
      src={src}
      title="Platformer"
      className="w-full h-full"
      frameBorder="0"
      allowlist={[`/apps/platformer`]}
    />
  );
};

export default Platformer;
