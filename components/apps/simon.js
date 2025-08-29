import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Howl } from 'howler';
import seedrandom from 'seedrandom';
import GameLayout from './GameLayout';
import usePersistentState from '../usePersistentState';
import { vibrate } from './Games/common/haptics';

const padStyles = [
  {
    id: 'green',
    color: { base: 'bg-green-700', active: 'bg-green-500' },
    colorblind: { base: 'bg-emerald-700', active: 'bg-emerald-500' },
    symbol: '▲',
    label: 'green',
    pattern:
      'repeating-linear-gradient(45deg, rgba(255,255,255,0.2) 0, rgba(255,255,255,0.2) 10px, transparent 10px, transparent 20px)',
  },
  {
    id: 'red',
    color: { base: 'bg-red-700', active: 'bg-red-500' },
    colorblind: { base: 'bg-orange-700', active: 'bg-orange-500' },
    symbol: '■',
    label: 'red',
    pattern:
      'repeating-linear-gradient(-45deg, rgba(255,255,255,0.2) 0, rgba(255,255,255,0.2) 10px, transparent 10px, transparent 20px)',
  },
  {
    id: 'yellow',
    color: { base: 'bg-yellow-500', active: 'bg-yellow-300' },
    colorblind: { base: 'bg-purple-700', active: 'bg-purple-500' },
    symbol: '●',
    label: 'yellow',
    pattern:
      'repeating-linear-gradient(0deg, rgba(255,255,255,0.2) 0, rgba(255,255,255,0.2) 10px, transparent 10px, transparent 20px)',
  },
  {
    id: 'blue',
    color: { base: 'bg-blue-700', active: 'bg-blue-500' },
    colorblind: { base: 'bg-teal-700', active: 'bg-teal-500' },
    symbol: '◆',
    label: 'blue',
    pattern:
      'repeating-linear-gradient(90deg, rgba(255,255,255,0.2) 0, rgba(255,255,255,0.2) 10px, transparent 10px, transparent 20px)',
  },
];

const tones = [329.63, 261.63, 220, 164.81];
const ERROR_SOUND_SRC = 'data:audio/wav;base64,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';

/**
 * Create a schedule of times using a starting value, step and ramp factor.
 *
 * @param {number} length number of timestamps to generate
 * @param {number} start initial time
 * @param {number} step initial delta between times
 * @param {number} [ramp=1] multiplier applied to the step each iteration
 * @returns {number[]} generated schedule
 */
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

/**
 * Generate a sequence of pad indexes.
 *
 * @param {number} length length of the sequence
 * @param {string|number} seed optional seed for deterministic results
 * @returns {number[]} sequence of numbers between 0 and 3
 */
export const generateSequence = (length, seed) => {
  if (seed) {
    const rng = seedrandom(seed);
    const seq = new Array(length);
    for (let i = 0; i < length; i += 1) {
      seq[i] = Math.floor(rng() * 4);
    }
    return seq;
  }

  const values = new Uint8Array(length);
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(values);
  } else {
    for (let i = 0; i < length; i += 1) {
      values[i] = Math.floor(Math.random() * 256);
    }
  }

  for (let i = 0; i < length; i += 1) {
    values[i] &= 3;
  }

  return Array.from(values);
};

const Simon = () => {
  const [sequence, setSequence] = useState([]);
  const [step, setStep] = useState(0);
  const [isPlayerTurn, setIsPlayerTurn] = useState(false);
  const [activePad, setActivePad] = useState(null);
  const [status, setStatus] = useState('Press Start');
  const [mode, setMode] = useState('classic');
  const [bpm, setBpm] = useState(100);
  const [striped, setStriped] = useState(false);
  const [thickOutline, setThickOutline] = useState(false);
  const [audioOnly, setAudioOnly] = useState(false);
  const [colorblindPalette, setColorblindPalette] = useState(false);
  const [seed, setSeed] = useState('');
  const [strictMode, setStrictMode] = useState(true);
  const [leaderboard, setLeaderboard] = usePersistentState(
    'simon_leaderboard',
    []
  );
  const audioCtx = useRef(null);
  const errorSound = useRef(null);
  const rngRef = useRef(Math.random);
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
    if (ctx.state === 'suspended') ctx.resume();
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

  const flashPad = useCallback(
    (idx, duration) => {
      if (!prefersReducedMotion) vibrate(50);
      if (audioOnly) return;
      window.requestAnimationFrame(() => setActivePad(idx));
      setTimeout(
        () => window.requestAnimationFrame(() => setActivePad(null)),
        duration * 1000
      );
    },
    [audioOnly, prefersReducedMotion]
  );

  const stepDuration = useCallback(() => {
    const base = 60 / bpm;
    const reduction = mode === 'speed' ? 0.03 : 0.015;
    return Math.max(base - sequence.length * reduction, 0.2);
  }, [bpm, mode, sequence.length]);

  const playSequence = useCallback(() => {
    const ctx =
      audioCtx.current || new (window.AudioContext || window.webkitAudioContext)();
    audioCtx.current = ctx;
    if (ctx.state === 'suspended') ctx.resume();
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
  }, [flashPad, sequence, stepDuration]);

  useEffect(() => {
    if (sequence.length && !isPlayerTurn) {
      playSequence();
    }
  }, [sequence, isPlayerTurn, playSequence]);

  const startGame = useCallback(() => {
    rngRef.current = seed ? seedrandom(seed) : Math.random;
    setSequence([Math.floor(rngRef.current() * 4)]);
    setStatus('Listen...');
  }, [seed]);

  const restartGame = useCallback(() => {
    setSequence([]);
    setStep(0);
    setIsPlayerTurn(false);
    setStatus('Press Start');
  }, []);

  const handlePadClick = useCallback(
    (idx) => () => {
      if (!isPlayerTurn) return;
      const duration = stepDuration();
      flashPad(idx, duration);
      const start = (audioCtx.current?.currentTime || 0) + 0.001;
      scheduleTone(tones[idx], start, duration);

      if (sequence[step] !== idx) {
        if (!errorSound.current) {
          errorSound.current = new Howl({ src: [ERROR_SOUND_SRC] });
        }
        errorSound.current.play();
        setErrorFlash(true);
        if (strictMode) {
          const streak = Math.max(sequence.length - 1, 0);
          setLeaderboard((prev) =>
            [...prev, streak].sort((a, b) => b - a).slice(0, 5)
          );
        }
        setIsPlayerTurn(false);
        setStatus(
          strictMode ? 'Wrong pad! Game over.' : 'Wrong pad! Try again.'
        );
        setTimeout(() => {
          setErrorFlash(false);
          if (strictMode) {
            restartGame();
          } else {
            setStep(0);
            setStatus('Listen...');
            playSequence();
          }
        }, 600);
        return;
      }

      if (step + 1 === sequence.length) {
        setIsPlayerTurn(false);
        setTimeout(() => {
          setSequence((seq) => [...seq, Math.floor(rngRef.current() * 4)]);
        }, 1000);
      } else {
        setStep(step + 1);
      }
    },
    [
      flashPad,
      isPlayerTurn,
      restartGame,
      sequence,
      step,
      stepDuration,
      setLeaderboard,
      strictMode,
      playSequence,
    ]
  );


  const padClass = useCallback(
    (pad, idx) => {
      const colors =
        mode === 'colorblind' || audioOnly
          ? { base: 'bg-gray-700', active: 'bg-gray-500' }
          : colorblindPalette
            ? pad.colorblind
            : pad.color;
      const isActive = activePad === idx;
      const ring = thickOutline ? 'ring-8' : 'ring-4';
      return `h-32 w-32 rounded flex items-center justify-center text-3xl transition-shadow ${ring} ring-offset-2 ring-offset-gray-900 ${
        isActive
          ? `${colors.active} pad-pulse ring-white`
          : `${colors.base} ring-transparent`
      }`;
    },
    [activePad, audioOnly, colorblindPalette, mode, thickOutline]
  );

  return (
    <GameLayout onRestart={restartGame}>
      <div className={errorFlash ? 'buzz' : ''}>
        <div className="grid grid-cols-2 gap-4 mb-4">
          {padStyles.map((pad, idx) => (
            <button
              key={pad.id}
              className={padClass(pad, idx)}
              style={striped ? { backgroundImage: pad.pattern } : undefined}
              onPointerDown={handlePadClick(idx)}
              aria-label={`${pad.label} pad`}
            >
              {mode === 'colorblind' ? pad.symbol : ''}
            </button>
          ))}
        </div>
        <div className="mb-4" aria-live="assertive" role="status">
          {status}
        </div>
        <div className="flex flex-wrap gap-4 items-center">
          <select
            className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
            value={mode}
            onChange={(e) => setMode(e.target.value)}
          >
            <option value="classic">Classic</option>
            <option value="speed">Speed Up</option>
            <option value="colorblind">Colorblind</option>
          </select>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="60"
              max="140"
              value={bpm}
              onChange={(e) => setBpm(Number(e.target.value))}
            />
            <span>{bpm} BPM</span>
          </div>
          <input
            className="px-2 py-1 w-24 bg-gray-700 hover:bg-gray-600 rounded"
            placeholder="Seed"
            value={seed}
            onChange={(e) => setSeed(e.target.value)}
          />
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={strictMode}
              onChange={(e) => setStrictMode(e.target.checked)}
            />
            Strict
          </label>
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={striped}
              onChange={(e) => setStriped(e.target.checked)}
            />
            Stripes
          </label>
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={thickOutline}
              onChange={(e) => setThickOutline(e.target.checked)}
            />
            Thick outline
          </label>
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={colorblindPalette}
              onChange={(e) => setColorblindPalette(e.target.checked)}
            />
            Colorblind palette
          </label>
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={audioOnly}
              onChange={(e) => setAudioOnly(e.target.checked)}
            />
            Audio only
          </label>
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
