import React, { useState, useRef, useEffect } from 'react';
import { Howl } from 'howler';
import GameLayout from './GameLayout';
import usePersistentState from '../usePersistentState';

// Colors for the four pads: green, red, yellow, blue
const PAD_COLORS = [
  { base: '#2e7d32', active: '#66bb6a' },
  { base: '#c62828', active: '#ef5350' },
  { base: '#f9a825', active: '#ffee58' },
  { base: '#1565c0', active: '#42a5f5' },
];

const TONES = [329.63, 261.63, 220, 164.81];
const ERROR_SOUND_SRC =
  'data:audio/wav;base64,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';

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

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

const Simon = () => {
  const canvasRef = useRef(null);
  const requestRef = useRef(null);
  const audioCtx = useRef(null);
  const errorSound = useRef(null);
  const cancelRef = useRef(false);

  const [sequence, setSequence] = useState([]);
  const [userStep, setUserStep] = useState(0);
  const [activePad, setActivePad] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [strict, setStrict] = useState(false);
  const [paused, setPaused] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [status, setStatus] = useState('Press Start');
  const [highScore, setHighScore] = usePersistentState('simon_highscore', 0);

  const playTone = (freq) => {
    if (!soundOn) return;
    const ctx =
      audioCtx.current || new (window.AudioContext || window.webkitAudioContext)();
    audioCtx.current = ctx;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.frequency.value = freq;
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.5, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.45);
  };

  const draw = (ctx) => {
    const { width, height } = ctx.canvas;
    const w2 = width / 2;
    const h2 = height / 2;
    ctx.clearRect(0, 0, width, height);
    PAD_COLORS.forEach((c, idx) => {
      const color = activePad === idx ? c.active : c.base;
      ctx.fillStyle = color;
      const x = idx % 2 === 0 ? 0 : w2;
      const y = idx < 2 ? 0 : h2;
      ctx.fillRect(x, y, w2, h2);
    });
    if (paused) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, 0, width, height);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const render = () => {
      draw(ctx);
      requestRef.current = requestAnimationFrame(render);
    };
    render();
    return () => cancelAnimationFrame(requestRef.current);
  }, [activePad, paused]);

  const flashPad = async (idx) => {
    setActivePad(idx);
    playTone(TONES[idx]);
    if ('vibrate' in navigator) navigator.vibrate(50);
    await sleep(500);
    setActivePad(null);
    await sleep(100);
  };

  const playSequence = async () => {
    if (paused) return;
    cancelRef.current = false;
    setPlaying(true);
    setStatus('Listen...');
    for (let i = 0; i < sequence.length; i += 1) {
      if (cancelRef.current) return;
      const idx = sequence[i];
      // eslint-disable-next-line no-await-in-loop
      await flashPad(idx);
    }
    if (cancelRef.current) return;
    setPlaying(false);
    setUserStep(0);
    setStatus('Your turn');
  };

  useEffect(() => {
    if (sequence.length && !playing && !paused) {
      playSequence();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sequence]);

  const startGame = () => {
    resetGame();
    setSequence([Math.floor(Math.random() * 4)]);
  };

  const resetGame = () => {
    cancelRef.current = true;
    setSequence([]);
    setUserStep(0);
    setPlaying(false);
    setStatus('Press Start');
    setPaused(false);
  };

  const handleError = () => {
    if (soundOn) {
      if (!errorSound.current) {
        errorSound.current = new Howl({ src: [ERROR_SOUND_SRC] });
      }
      errorSound.current.play();
    }
    const score = Math.max(sequence.length - 1, 0);
    if (score > highScore) setHighScore(score);
    if (strict) {
      resetGame();
    } else {
      setStatus('Try again');
      setUserStep(0);
      playSequence();
    }
  };

  const handleCanvasClick = (e) => {
    if (playing || paused || !sequence.length) return;
    const rect = e.target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const idx = x < rect.width / 2 ? (y < rect.height / 2 ? 0 : 2) : (y < rect.height / 2 ? 1 : 3);
    flashPad(idx);
    if (sequence[userStep] === idx) {
      if (userStep + 1 === sequence.length) {
        setSequence((seq) => [...seq, Math.floor(Math.random() * 4)]);
      } else {
        setUserStep(userStep + 1);
      }
    } else {
      handleError();
    }
  };

  const togglePause = () => {
    setPaused((p) => {
      const np = !p;
      if (np) {
        cancelRef.current = true;
        setPlaying(false);
        setStatus('Paused');
      } else if (sequence.length) {
        playSequence();
      }
      return np;
    });
  };

  return (
    <GameLayout onRestart={resetGame}>
      <div className="flex flex-col items-center gap-4">
        <canvas
          ref={canvasRef}
          width={200}
          height={200}
          className="touch-none"
          onClick={handleCanvasClick}
        />
        <div>{status}</div>
        <div className="flex gap-2">
          <button
            type="button"
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded"
            onClick={startGame}
          >
            Start
          </button>
          <button
            type="button"
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded"
            onClick={resetGame}
          >
            Reset
          </button>
          <button
            type="button"
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded"
            onClick={togglePause}
          >
            {paused ? 'Resume' : 'Pause'}
          </button>
        </div>
        <div className="flex gap-4 mt-2">
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={strict}
              onChange={() => setStrict(!strict)}
            />
            Strict
          </label>
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={soundOn}
              onChange={() => setSoundOn(!soundOn)}
            />
            Sound
          </label>
        </div>
        <div>High Score: {highScore}</div>
      </div>
    </GameLayout>
  );
};

export default Simon;

