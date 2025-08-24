import React, { useState, useRef, useEffect } from 'react';

const padStyles = [
  {
    color: { base: 'bg-green-700', active: 'bg-green-500' },
    colorblind: { base: 'bg-emerald-700', active: 'bg-emerald-500' },
    symbol: '▲',
  },
  {
    color: { base: 'bg-red-700', active: 'bg-red-500' },
    colorblind: { base: 'bg-orange-700', active: 'bg-orange-500' },
    symbol: '■',
  },
  {
    color: { base: 'bg-yellow-500', active: 'bg-yellow-300' },
    colorblind: { base: 'bg-fuchsia-700', active: 'bg-fuchsia-500' },
    symbol: '●',
  },
  {
    color: { base: 'bg-blue-700', active: 'bg-blue-500' },
    colorblind: { base: 'bg-cyan-700', active: 'bg-cyan-500' },
    symbol: '◆',
  },
];

const tones = [329.63, 261.63, 220, 164.81];

export const createToneSchedule = (length, start, step) =>
  Array.from({ length }, (_, i) => start + i * step);

export const generateSequence = (seq) => [...seq, Math.floor(Math.random() * 4)];

export const isInputOnBeat = (expected, input, calibration = 0, window = 0.1) =>
  Math.abs(input - (expected + calibration / 1000)) <= window;

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
  const [strictMode, setStrictMode] = useState(false);
  const [calibration, setCalibration] = useState(0);
  const [expectedTimes, setExpectedTimes] = useState([]);
  const audioCtx = useRef(null);

  useEffect(() => {
    const settings = JSON.parse(
      typeof window !== 'undefined'
        ? localStorage.getItem('simon-settings') || '{}'
        : '{}'
    );
    if (settings.difficulty) setDifficulty(settings.difficulty);
    if (settings.accessibility) setAccessibility(settings.accessibility);
    if (settings.strictMode) setStrictMode(settings.strictMode);
    if (typeof settings.calibration === 'number')
      setCalibration(settings.calibration);
    const storedScore =
      typeof window !== 'undefined'
        ? Number(localStorage.getItem('simon-highScore')) || 0
        : 0;
    setHighScore(storedScore);
    fetch('/api/simon/high-scores')
      .then((res) => res.json())
      .then((data) => {
        if (data.highScore) setHighScore(data.highScore);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(
        'simon-settings',
        JSON.stringify({ difficulty, accessibility, strictMode, calibration })
      );
    }
  }, [difficulty, accessibility, strictMode, calibration]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('simon-highScore', String(highScore));
    }
  }, [highScore]);

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

  const scheduleTone = (
    freq,
    startTime,
    type = 'sine',
    adsr = { attack: 0.01, decay: 0.1, sustain: 0.2, release: 0.2, gain: 0.5 }
  ) => {
    const ctx =
      audioCtx.current ||
      new (window.AudioContext || window.webkitAudioContext)({
        latencyHint: 'interactive',
      });
    audioCtx.current = ctx;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.value = freq;
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    const { attack, decay, sustain, release, gain } = adsr;
    const sustainLevel = gain * 0.7;
    const peak = startTime + attack;
    const decayTime = peak + decay;
    const sustainTime = decayTime + sustain;
    const end = sustainTime + release;

    gainNode.gain.setValueAtTime(0.0001, startTime);
    gainNode.gain.linearRampToValueAtTime(gain, peak);
    gainNode.gain.linearRampToValueAtTime(sustainLevel, decayTime);
    gainNode.gain.setValueAtTime(sustainLevel, sustainTime);
    gainNode.gain.linearRampToValueAtTime(0.0001, end);

    oscillator.start(startTime);
    oscillator.stop(end);
  };

  const playError = (time) => {
    scheduleTone(110, time, 'square');
  };

  const flashPad = (idx) => {
    setActivePad(idx);
    if ('vibrate' in navigator) navigator.vibrate(50);
    setTimeout(() => setActivePad(null), 500);
  };

  const stepDuration = (len = sequence.length) => {
    const rate = difficulty === 'speed' ? 0.04 : 0.02;
    return Math.max(0.7 - len * rate, 0.2);
  };

  const playPattern = (pattern, { onComplete } = {}) => {
    const ctx =
      audioCtx.current ||
      new (window.AudioContext || window.webkitAudioContext)({
        latencyHint: 'interactive',
      });
    audioCtx.current = ctx;
    const start = ctx.currentTime + 0.1;
    const delta = stepDuration(pattern.length);
    const audioStart = start - calibration / 1000;
    const schedule = createToneSchedule(pattern.length, audioStart, delta);
    const visualSchedule = schedule.map((t) => t + calibration / 1000);
    setExpectedTimes(visualSchedule);
    schedule.forEach((time, i) => {
      const idx = pattern[i];
      scheduleTone(tones[idx], time);
      const delay = (visualSchedule[i] - ctx.currentTime) * 1000;
      setTimeout(() => flashPad(idx), delay);
    });
    const totalDelay =
      (visualSchedule[visualSchedule.length - 1] - ctx.currentTime + delta) * 1000;
    if (onComplete) setTimeout(onComplete, totalDelay);
    return totalDelay;
  };

  const playSequence = () => {
    setIsPlayerTurn(false);
    setStatus('Listen...');
    const totalDelay = playPattern(sequence, {
      onComplete: () => {
        setStatus('Your turn');
        setIsPlayerTurn(true);
        setStep(0);
      },
    });
    return totalDelay;
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
      : generateSequence([]);
    setSequence(initial);
    setStatus('Listen...');
    setCustomPattern([]);
    setEditing(false);
  };

  const handlePadClick = (idx) => {
    if (editing) {
      if (!audioCtx.current) {
        audioCtx.current = new (window.AudioContext || window.webkitAudioContext)({
          latencyHint: 'interactive',
        });
      }
      flashPad(idx);
      scheduleTone(tones[idx], audioCtx.current.currentTime);
      setCustomPattern((p) => [...p, idx]);
      return;
    }
    if (!isPlayerTurn) return;
    if (!audioCtx.current) {
      audioCtx.current = new (window.AudioContext || window.webkitAudioContext)({
        latencyHint: 'interactive',
      });
    }
    flashPad(idx);
    const now = audioCtx.current.currentTime;
    scheduleTone(tones[idx], now);
    const expected = expectedTimes[step];
    const timingOk = expected ? isInputOnBeat(expected, now, 0, 0.3) : true;
    if (sequence[step] === idx && timingOk) {
      if (step + 1 === sequence.length) {
        setIsPlayerTurn(false);
        setTimeout(() => {
          setSequence((seq) => generateSequence(seq));
        }, 1000);
      } else {
        setStep(step + 1);
      }
    } else {
      playError(now);
      if (strictMode) {
        submitScore(sequence.length - 1);
        setStatus('Wrong! Press Start');
        setSequence([]);
        setIsPlayerTurn(false);
        setStep(0);
      } else {
        setStatus('Wrong! Watch again');
        setIsPlayerTurn(false);
        setStep(0);
        setTimeout(() => {
          playSequence();
        }, 1000);
      }
    }
  };

  const padClass = (pad, idx) => {
    let colors = accessibility === 'colorblind' ? pad.colorblind : pad.color;
    if (difficulty === 'inverted') {
      colors = { base: colors.active, active: colors.base };
    }
    return `h-40 w-40 rounded flex items-center justify-center text-5xl ${
      activePad === idx ? colors.active : colors.base
    }`;
  };

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-panel text-white p-4">
      <div className="grid grid-cols-2 gap-4 mb-4">
        {padStyles.map((pad, idx) => (
          <button
            // eslint-disable-next-line react/no-array-index-key
            key={idx}
            type="button"
            aria-label={`Pad ${idx + 1}`}
            className={padClass(pad, idx)}
            onPointerDown={() => handlePadClick(idx)}
          >
            {accessibility === 'colorblind' ? pad.symbol : ''}
          </button>
        ))}
      </div>
      <div className="mb-2" aria-live="polite">{status}</div>
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
        <select
          className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
          value={strictMode ? 'strict' : 'normal'}
          onChange={(e) => setStrictMode(e.target.value === 'strict')}
        >
          <option value="normal">Normal</option>
          <option value="strict">Strict</option>
        </select>
        <div className="flex items-center gap-2">
          <label htmlFor="calibration" className="text-xs">
            Calibrate
          </label>
          <input
            id="calibration"
            type="range"
            min="-200"
            max="200"
            value={calibration}
            onChange={(e) => setCalibration(Number(e.target.value))}
            className="w-32"
          />
          <span className="text-xs">{calibration}ms</span>
        </div>
        <button
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
          onClick={startGame}
        >
          Start
        </button>
        <button
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded disabled:opacity-50"
          onClick={playSequence}
          disabled={!sequence.length || !isPlayerTurn}
        >
          Repeat
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
              className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded disabled:opacity-50"
              onClick={() => playPattern(customPattern)}
              disabled={!customPattern.length}
            >
              Preview
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
