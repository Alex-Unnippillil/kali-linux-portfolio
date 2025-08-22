import React, { useState, useRef, useEffect } from 'react';

const padStyles = [
  {
    color: { base: 'bg-green-700', active: 'bg-green-500' },
    symbol: '▲',
  },
  {
    color: { base: 'bg-red-700', active: 'bg-red-500' },
    symbol: '■',
  },
  {
    color: { base: 'bg-yellow-500', active: 'bg-yellow-300' },
    symbol: '●',
  },
  {
    color: { base: 'bg-blue-700', active: 'bg-blue-500' },
    symbol: '◆',
  },
];

const tones = [329.63, 261.63, 220, 164.81];

export const createToneSchedule = (length, start, step) =>
  Array.from({ length }, (_, i) => start + i * step);

const Simon = () => {
  const [sequence, setSequence] = useState([]);
  const [step, setStep] = useState(0);
  const [isPlayerTurn, setIsPlayerTurn] = useState(false);
  const [activePad, setActivePad] = useState(null);
  const [status, setStatus] = useState('Press Start');
  const [difficulty, setDifficulty] = useState('classic');
  const [accessibility, setAccessibility] = useState('normal');
  const [highScore, setHighScore] = useState(0);
  const [editing, setEditing] = useState(false);
  const [customPattern, setCustomPattern] = useState([]);
  const [sharedPatterns, setSharedPatterns] = useState([]);
  const audioCtx = useRef(null);

  useEffect(() => {
    fetch('/api/simon/high-scores')
      .then((res) => res.json())
      .then((data) => setHighScore(data.highScore || 0))
      .catch(() => {});
  }, []);

  const submitScore = async (score) => {
    try {
      const res = await fetch('/api/simon/high-scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score }),
      });
      const data = await res.json();
      setHighScore(data.highScore || score);
    } catch (e) {
      // ignore
    }
  };

  const savePattern = async () => {
    try {
      await fetch('/api/simon/patterns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pattern: customPattern }),
      });
      setCustomPattern([]);
    } catch (e) {
      // ignore
    }
  };

  const loadPatterns = async () => {
    try {
      const res = await fetch('/api/simon/patterns');
      const data = await res.json();
      setSharedPatterns(data.patterns || []);
    } catch (e) {
      setSharedPatterns([]);
    }
  };

  const scheduleTone = (freq, startTime) => {
    const ctx =
      audioCtx.current || new (window.AudioContext || window.webkitAudioContext)();
    audioCtx.current = ctx;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.frequency.value = freq;
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(0.5, startTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.4);
    oscillator.start(startTime);
    oscillator.stop(startTime + 0.5);
  };

  const flashPad = (idx) => {
    setActivePad(idx);
    if ('vibrate' in navigator) navigator.vibrate(50);
    setTimeout(() => setActivePad(null), 500);
  };

  const stepDuration = () => {
    if (difficulty === 'speed') {
      return Math.max(0.6 - sequence.length * 0.02, 0.2);
    }
    return 0.6;
  };

  const playSequence = () => {
    const ctx =
      audioCtx.current || new (window.AudioContext || window.webkitAudioContext)();
    audioCtx.current = ctx;
    setIsPlayerTurn(false);
    setStatus('Listen...');
    const start = ctx.currentTime + 0.1;
    const delta = stepDuration();
    const schedule = createToneSchedule(sequence.length, start, delta);
    schedule.forEach((time, i) => {
      const idx = sequence[i];
      scheduleTone(tones[idx], time);
      const delay = (time - ctx.currentTime) * 1000;
      setTimeout(() => flashPad(idx), delay);
    });
    const totalDelay = (schedule[schedule.length - 1] - ctx.currentTime + delta) * 1000;
    setTimeout(() => {
      setStatus('Your turn');
      setIsPlayerTurn(true);
      setStep(0);
    }, totalDelay);
  };

  useEffect(() => {
    if (sequence.length && !isPlayerTurn) {
      playSequence();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sequence]);

  const startGame = () => {
    const initial = customPattern.length
      ? [...customPattern]
      : [Math.floor(Math.random() * 4)];
    setSequence(initial);
    setStatus('Listen...');
    setCustomPattern([]);
    setEditing(false);
  };

  const handlePadClick = (idx) => {
    if (editing) {
      if (!audioCtx.current) {
        audioCtx.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      flashPad(idx);
      scheduleTone(tones[idx], audioCtx.current.currentTime);
      setCustomPattern((p) => [...p, idx]);
      return;
    }
    if (!isPlayerTurn) return;
    if (!audioCtx.current) {
      audioCtx.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    flashPad(idx);
    scheduleTone(tones[idx], audioCtx.current.currentTime);
    if (sequence[step] === idx) {
      if (step + 1 === sequence.length) {
        setIsPlayerTurn(false);
        setTimeout(() => {
          setSequence((seq) => [...seq, Math.floor(Math.random() * 4)]);
        }, 1000);
      } else {
        setStep(step + 1);
      }
    } else {
      submitScore(sequence.length - 1);
      setStatus('Wrong! Press Start');
      setSequence([]);
      setIsPlayerTurn(false);
      setStep(0);
    }
  };

  const padClass = (pad, idx) => {
    let colors = accessibility === 'colorblind'
      ? { base: 'bg-gray-700', active: 'bg-gray-500' }
      : pad.color;
    if (difficulty === 'inverted') {
      colors = { base: colors.active, active: colors.base };
    }
    return `h-32 w-32 rounded flex items-center justify-center text-3xl ${
      activePad === idx ? colors.active : colors.base
    }`;
  };

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white p-4">
      <div className="grid grid-cols-2 gap-4 mb-4">
        {padStyles.map((pad, idx) => (
          <button
            // eslint-disable-next-line react/no-array-index-key
            key={idx}
            className={padClass(pad, idx)}
            onPointerDown={() => handlePadClick(idx)}
          >
            {accessibility === 'colorblind' ? pad.symbol : ''}
          </button>
        ))}
      </div>
      <div className="mb-2">{status}</div>
      <div className="mb-4 text-sm">High Score: {highScore}</div>
      <div className="flex flex-wrap gap-4 justify-center">
        <select
          className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
        >
          <option value="classic">Classic</option>
          <option value="speed">Speed Up</option>
          <option value="inverted">Inverted</option>
        </select>
        <select
          className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
          value={accessibility}
          onChange={(e) => setAccessibility(e.target.value)}
        >
          <option value="normal">Normal</option>
          <option value="colorblind">Colorblind</option>
        </select>
        <button
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
          onClick={startGame}
        >
          Start
        </button>
        <button
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
          onClick={() => {
            setEditing((prev) => {
              const next = !prev;
              setStatus(next ? 'Editing Pattern' : 'Press Start');
              return next;
            });
            setCustomPattern([]);
          }}
        >
          {editing ? 'Close Editor' : 'Pattern Editor'}
        </button>
      </div>
      {editing && (
        <div className="flex flex-col items-center w-full mt-4">
          <div className="mb-2">Pattern: {customPattern.join('-')}</div>
          <div className="flex gap-2 mb-2 flex-wrap justify-center">
            <button
              className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
              onClick={savePattern}
            >
              Share Pattern
            </button>
            <button
              className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
              onClick={loadPatterns}
            >
              Load Shared
            </button>
            <button
              className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
              onClick={() => setCustomPattern([])}
            >
              Clear
            </button>
          </div>
          <ul className="text-sm max-h-24 overflow-y-auto w-full">
            {sharedPatterns.map((p, i) => (
              // eslint-disable-next-line react/no-array-index-key
              <li key={i}>{p.join('-')}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default Simon;
