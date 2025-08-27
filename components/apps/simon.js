import React, { useState, useRef, useEffect } from 'react';
import { Howl } from 'howler';
import GameLayout from './GameLayout';
import usePersistentState from '../usePersistentState';

const padStyles = [
  {
    color: { base: 'bg-green-700', active: 'bg-green-500' },
    symbol: '▲',
    label: 'green',
  },
  {
    color: { base: 'bg-red-700', active: 'bg-red-500' },
    symbol: '■',
    label: 'red',
  },
  {
    color: { base: 'bg-yellow-500', active: 'bg-yellow-300' },
    symbol: '●',
    label: 'yellow',
  },
  {
    color: { base: 'bg-blue-700', active: 'bg-blue-500' },
    symbol: '◆',
    label: 'blue',
  },
];

const tones = [329.63, 261.63, 220, 164.81];
const ERROR_SOUND_SRC = 'data:audio/wav;base64,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';

export const createToneSchedule = (length, start, step, ramp = 1) => {
  const times = [];
  let time = start;
  let current = step;
  for (let i = 0; i < length; i += 1) {
    times.push(time);
    time += current;
    current *= ramp;
  }
  return times;
};
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
  const errorSound = useRef(null);
  const [errorFlash, setErrorFlash] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = () => setPrefersReducedMotion(media.matches);
    handleChange();
    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, []);

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
    window.requestAnimationFrame(() => setActivePad(idx));
    if ('vibrate' in navigator && !prefersReducedMotion) navigator.vibrate(50);
    setTimeout(
      () => window.requestAnimationFrame(() => setActivePad(null)),
      duration * 1000
    );
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
    const baseDelta = stepDuration();
    const ramp = 0.97;
    const schedule = createToneSchedule(
      sequence.length,
      start,
      baseDelta,
      ramp
    );
    let currentDelta = baseDelta;
    let finalDelta = baseDelta;
    schedule.forEach((time, i) => {
      const idx = sequence[i];
      scheduleTone(tones[idx], time, currentDelta);
      const delay = (time - ctx.currentTime) * 1000;
      setTimeout(() => flashPad(idx, currentDelta), delay);
      finalDelta = currentDelta;
      currentDelta *= ramp;
    });
    const totalDelay =
      (schedule[schedule.length - 1] - ctx.currentTime + finalDelta) * 1000;
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
      if (!errorSound.current) {
        errorSound.current = new Howl({ src: [ERROR_SOUND_SRC] });
      }
      errorSound.current.play();
      setErrorFlash(true);
      const streak = Math.max(sequence.length - 1, 0);
      setLeaderboard((prev) =>
        [...prev, streak].sort((a, b) => b - a).slice(0, 5)
      );
      setIsPlayerTurn(false);
      setStatus('Wrong pad! Game over.');
      setTimeout(() => {
        setErrorFlash(false);
        restartGame();
      }, 600);
    }
  };

  const padClass = (pad, idx) => {
    const colors = mode === 'colorblind'
      ? { base: 'bg-gray-700', active: 'bg-gray-500' }
      : pad.color;
    const isActive = activePad === idx;
    return `h-32 w-32 rounded flex items-center justify-center text-3xl transition-shadow ring-4 ring-offset-2 ring-offset-gray-900 ${
      isActive
        ? `${colors.active} pad-pulse ring-white`
        : `${colors.base} ring-transparent`
    }`;
  };

  return (
    <GameLayout onRestart={restartGame}>
      <div className={errorFlash ? 'buzz' : ''}>
        <div className="grid grid-cols-2 gap-4 mb-4">
          {padStyles.map((pad, idx) => (
            <button
              // eslint-disable-next-line react/no-array-index-key
              key={idx}
              className={padClass(pad, idx)}
              onPointerDown={() => handlePadClick(idx)}
              aria-label={`${pad.label} pad`}
            >
              {mode === 'colorblind' ? pad.symbol : ''}
            </button>
          ))}
        </div>
        <div className="mb-4" aria-live="assertive" role="status">
          {status}
        </div>
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
      </div>
    </GameLayout>
  );
};

export default Simon;
