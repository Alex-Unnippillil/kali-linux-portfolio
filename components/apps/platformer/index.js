import React, { useEffect, useRef, useState } from 'react';
import usePersistentState from '../../usePersistentState';
import LevelEditor from './editor';

const Platformer = () => {
  const [levels, setLevels] = useState([]);
  const [customLevels, setCustomLevels] = usePersistentState(
    'platformer-custom-levels',
    []
  );
  const [progress, setProgress] = usePersistentState(
    'platformer-progress',
    {
      level: 0,
      checkpoint: null,
    }
  );
  const [mode, setMode] = useState('menu');
  const [current, setCurrent] = useState(null);
  const frameRef = useRef(null);

  useEffect(() => {
    fetch('/apps/platformer/levels.json')
      .then((r) => r.json())
      .then((d) => setLevels(d.levels || []));
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (!e.data) return;
      if (e.data.type === 'checkpoint' && current?.type === 'builtin') {
        setProgress((p) => ({ ...p, checkpoint: e.data.checkpoint }));
      } else if (e.data.type === 'levelComplete') {
        if (current?.type === 'builtin') {
          setProgress((p) => ({ level: p.level + 1, checkpoint: null }));
        }
        setMode('menu');
        setCurrent(null);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [current, setProgress]);

  const playBuiltin = (index) => {
    const path = levels[index];
    if (!path) return;
    setCurrent({ type: 'builtin', index, path });
    setMode('play');
  };

  const playCustom = (index) => {
    const lvl = customLevels[index];
    if (!lvl) return;
    const blob = new Blob([JSON.stringify(lvl.data)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    setCurrent({ type: 'custom', url });
    setMode('play');
  };

  const handleEditorSave = (name, data) => {
    setCustomLevels([...customLevels, { name, data }]);
    setMode('menu');
  };

  const handleBack = () => {
    setMode('menu');
    setCurrent(null);
  };

  if (mode === 'editor') {
    return <LevelEditor onSave={handleEditorSave} onCancel={handleBack} />;
  }

  if (mode === 'play' && current) {
    const base = `/apps/platformer/index.html?lvl=${encodeURIComponent(
      current.type === 'builtin' ? current.path : current.url
    )}`;
    const cp =
      current.type === 'builtin' &&
      progress.level === current.index &&
      progress.checkpoint
        ? `&cp=${progress.checkpoint.x},${progress.checkpoint.y}`
        : '';
    const src = base + cp;
    return (
      <div className="w-full h-full relative">
        <iframe
          ref={frameRef}
          src={src}
          title="Platformer"
          className="w-full h-full"
          frameBorder="0"
        />
        <button
          className="absolute top-2 left-2 px-2 py-1 bg-gray-700 text-white rounded"
          onClick={handleBack}
        >
          Menu
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 w-full h-full flex flex-col text-white bg-ub-cool-grey overflow-auto">
      <div className="text-lg font-bold mb-2">Platformer</div>
      <div className="mb-4">
        <div className="font-semibold">Default Levels</div>
        <ul className="ml-4 list-disc">
          {levels.map((_, i) => (
            <li key={i}>
              <button
                className="underline"
                onClick={() => playBuiltin(i)}
              >
                {`Level ${i + 1}`}
              </button>
            </li>
          ))}
        </ul>
      </div>
      {customLevels.length > 0 && (
        <div className="mb-4">
          <div className="font-semibold">Custom Levels</div>
          <ul className="ml-4 list-disc">
            {customLevels.map((lvl, i) => (
              <li key={i}>
                <button
                  className="underline"
                  onClick={() => playCustom(i)}
                >
                  {lvl.name || `Custom ${i + 1}`}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <button
        className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded self-start"
        onClick={() => setMode('editor')}
      >
        Create Level
      </button>
    </div>
  );
};

export default Platformer;

