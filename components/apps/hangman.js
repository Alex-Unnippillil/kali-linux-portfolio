import React, { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import usePersistentState from '../../hooks/usePersistentState';
import {
  logEvent,
  logGameStart,
  logGameEnd,
  logGameError,
} from '../../utils/analytics';

const words = [
  'code',
  'bug',
  'html',
  'css',
  'linux',
  'react',
  'nextjs',
  'python',
  'docker',
  'node',
];

const maxWrong = 6;

const Hangman = () => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const audioCtxRef = useRef(null);

  const [word, setWord] = useState('');
  const [guessed, setGuessed] = useState([]);
  const [wrong, setWrong] = useState(0);
  const [hintUsed, setHintUsed] = useState(false);
  const [score, setScore] = useState(0);
  const [paused, setPaused] = useState(false);
  const [sound, setSound] = usePersistentState(
    'hangman-sound',
    true,
    (v) => typeof v === 'boolean',
  );
  const [highscore, setHighscore] = usePersistentState(
    'hangman-highscore',
    0,
    (v) => typeof v === 'number',
  );

  const playTone = (freq) => {
    if (!sound) return;
    try {
      const ctx =
        audioCtxRef.current ||
        (audioCtxRef.current = new (window.AudioContext ||
          window.webkitAudioContext)());
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        ctx.currentTime + 0.2,
      );
      osc.stop(ctx.currentTime + 0.2);
    } catch (err) {
      // ignore audio errors
    }
  };

  const pickWord = () =>
    words[Math.floor(Math.random() * words.length)];

  const reset = () => {
    try {
      setWord(pickWord());
      setGuessed([]);
      setWrong(0);
      setHintUsed(false);
      setScore(0);
      setPaused(false);
      logGameStart('hangman');
    } catch (err) {
      logGameError('hangman', err?.message || String(err));
    }
  };

  useEffect(() => {
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hintOnce = () => {
    if (hintUsed || paused) return;
    const remaining = word
      .split('')
      .filter((l) => !guessed.includes(l));
    if (!remaining.length) return;
    const letter =
      remaining[Math.floor(Math.random() * remaining.length)];
    setHintUsed(true);
    setScore((s) => s - 5);
    handleGuess(letter);
  };

  const handleGuess = (letter) => {
    if (
      paused ||
      guessed.includes(letter) ||
      wrong >= maxWrong ||
      word.split('').every((l) => guessed.includes(l))
    )
      return;
    logEvent({ category: 'hangman', action: 'guess', label: letter });
    setGuessed((g) => [...g, letter]);
    if (word.includes(letter)) {
      playTone(600);
      setScore((s) => s + 2);
    } else {
      playTone(200);
      setWrong((w) => w + 1);
      setScore((s) => s - 1);
    }
  };

  const togglePause = () => setPaused((p) => !p);
  const toggleSound = () => setSound((s) => !s);

  const keyHandler = (e) => {
    const k = e.key.toLowerCase();
    if (k === 'r') reset();
    else if (k === 'p') togglePause();
    else if (k === 'h') hintOnce();
    else if (k === 's') toggleSound();
    else if (/^[a-z]$/.test(k)) handleGuess(k);
  };

  useEffect(() => {
    window.addEventListener('keydown', keyHandler);
    return () => window.removeEventListener('keydown', keyHandler);
  });

  useEffect(() => {
    const won = word && word.split('').every((l) => guessed.includes(l));
    if (won || wrong >= maxWrong) {
      logGameEnd('hangman', won ? 'win' : 'lose');
      if (won)
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      if (score > highscore) setHighscore(score);
    }
  }, [wrong, guessed, word, score, highscore, setHighscore]);

  const draw = React.useCallback(
    (ctx) => {
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    ctx.fillStyle = '#fff';
    ctx.font = '20px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(
      `Score: ${score}  High: ${highscore}`,
      ctx.canvas.width / 2,
      30,
    );
    ctx.fillText(
      `Wrong: ${wrong}/${maxWrong}`,
      ctx.canvas.width / 2,
      60,
    );

    ctx.lineWidth = 4;
    ctx.strokeStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(20, 230);
    ctx.lineTo(180, 230);
    ctx.moveTo(40, 20);
    ctx.lineTo(40, 230);
    ctx.lineTo(120, 20);
    ctx.lineTo(120, 40);
    ctx.stroke();

    if (wrong > 0) {
      ctx.beginPath();
      ctx.arc(120, 60, 20, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (wrong > 1) {
      ctx.beginPath();
      ctx.moveTo(120, 80);
      ctx.lineTo(120, 140);
      ctx.stroke();
    }
    if (wrong > 2) {
      ctx.beginPath();
      ctx.moveTo(120, 100);
      ctx.lineTo(90, 120);
      ctx.stroke();
    }
    if (wrong > 3) {
      ctx.beginPath();
      ctx.moveTo(120, 100);
      ctx.lineTo(150, 120);
      ctx.stroke();
    }
    if (wrong > 4) {
      ctx.beginPath();
      ctx.moveTo(120, 140);
      ctx.lineTo(100, 170);
      ctx.stroke();
    }
    if (wrong > 5) {
      ctx.beginPath();
      ctx.moveTo(120, 140);
      ctx.lineTo(140, 170);
      ctx.stroke();
    }

    const letters = word.split('');
    letters.forEach((l, i) => {
      const x = 40 + i * 30;
      ctx.beginPath();
      ctx.moveTo(x, 200);
      ctx.lineTo(x + 20, 200);
      ctx.stroke();
      const char =
        guessed.includes(l) || wrong >= maxWrong
          ? l.toUpperCase()
          : '';
      ctx.fillText(char, x + 10, 190);
    });

    ctx.font = '16px monospace';
    ctx.fillText(
      'Type letters. H=hint R=reset P=pause S=sound',
      ctx.canvas.width / 2,
      240,
    );

    if (paused) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.fillStyle = '#fff';
      ctx.fillText('Paused', ctx.canvas.width / 2, 120);
    }

    const won = word && letters.every((l) => guessed.includes(l));
    if (won) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.fillStyle = '#0f0';
      ctx.fillText('You Won! Press R', ctx.canvas.width / 2, 120);
    } else if (wrong >= maxWrong) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.fillStyle = '#f00';
      ctx.fillText(
        `You Lost! ${word.toUpperCase()}`,
        ctx.canvas.width / 2,
        120,
      );
      ctx.fillText('Press R', ctx.canvas.width / 2, 150);
    }
  }, [word, guessed, wrong, paused, score, highscore]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const render = () => {
      draw(ctx);
      animationRef.current = requestAnimationFrame(render);
    };
    render();
    return () => cancelAnimationFrame(animationRef.current);
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      width={400}
      height={250}
      className="bg-ub-cool-grey w-full h-full"
    />
  );
};

export default Hangman;

