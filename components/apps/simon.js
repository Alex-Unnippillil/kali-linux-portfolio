import React, { useState, useRef, useEffect } from 'react';
import GameLayout from './GameLayout';
import usePersistentState from '../usePersistentState';

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
const baseSpeeds = {
  slow: 0.9,
  normal: 0.6,
  fast: 0.3,
};

const Simon = () => {
  const [sequence, setSequence] = useState([]);
  const [step, setStep] = useState(0);
  const [isPlayerTurn, setIsPlayerTurn] = useState(false);
  const [activePad, setActivePad] = useState(null);
  const [status, setStatus] = useState('Press Start');
  const [mode, setMode] = useState('classic');
  const [speed, setSpeed] = useState('normal');
  const [leaderboard, setLeaderboard] = usePersistentState(
    'simon_leaderboard',
    []
  );
  const audioCtx = useRef(null);

  const scheduleTone = (freq, startTime, duration) => {
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
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
    oscillator.start(startTime);
    oscillator.stop(startTime + duration + 0.05);
  };

  const flashPad = (idx, duration) => {
    setActivePad(idx);
    if ('vibrate' in navigator) navigator.vibrate(50);
    setTimeout(() => setActivePad(null), duration * 1000);
  };

  const stepDuration = () => {
    const base = baseSpeeds[speed] || baseSpeeds.normal;
    if (mode === 'speed') {
      return Math.max(base - sequence.length * 0.02, 0.2);
    }
    return base;
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
      scheduleTone(tones[idx], time, delta);
      const delay = (time - ctx.currentTime) * 1000;
      setTimeout(() => flashPad(idx, delta), delay);
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
    setSequence([Math.floor(Math.random() * 4)]);
    setStatus('Listen...');
  };

  const restartGame = () => {
    setSequence([]);
    setStep(0);
    setIsPlayerTurn(false);
    setStatus('Press Start');
  };

  const handlePadClick = (idx) => {
    if (!isPlayerTurn) return;
    const duration = stepDuration();
    flashPad(idx, duration);
    scheduleTone(tones[idx], audioCtx.current.currentTime, duration);
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
      const streak = Math.max(sequence.length - 1, 0);
      setLeaderboard((prev) =>
        [...prev, streak].sort((a, b) => b - a).slice(0, 5)
      );
      restartGame();
    }
  };

  const padClass = (pad, idx) => {
    const colors = mode === 'colorblind'
      ? { base: 'bg-gray-700', active: 'bg-gray-500' }
      : pad.color;
    return `h-32 w-32 rounded flex items-center justify-center text-3xl ${
      activePad === idx ? colors.active : colors.base
    }`;
  };

  return (
    <GameLayout onRestart={restartGame}>
      <div className="grid grid-cols-2 gap-4 mb-4">
        {padStyles.map((pad, idx) => (
          <button
            // eslint-disable-next-line react/no-array-index-key
            key={idx}
            className={padClass(pad, idx)}
            onPointerDown={() => handlePadClick(idx)}
          >
            {mode === 'colorblind' ? pad.symbol : ''}
          </button>
        ))}
      </div>
      <div className="mb-4">{status}</div>
      <div className="flex gap-4">
        <select
          className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
          value={mode}
          onChange={(e) => setMode(e.target.value)}
        >
          <option value="classic">Classic</option>
          <option value="speed">Speed Up</option>
          <option value="colorblind">Colorblind</option>
        </select>
        <select
          className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
          value={speed}
          onChange={(e) => setSpeed(e.target.value)}
        >
          <option value="slow">Slow</option>
          <option value="normal">Normal</option>
          <option value="fast">Fast</option>
        </select>
        <button
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
          onClick={startGame}
        >
          Start
        </button>
      </div>
      <div className="mt-4 text-center">
        <div className="mb-1">Leaderboard</div>
        <ol className="list-decimal list-inside">
          {leaderboard.map((score, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <li key={i}>{score}</li>
          ))}
        </ol>
      </div>
    </GameLayout>
  );
};

export default Simon;
