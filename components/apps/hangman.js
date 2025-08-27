import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import confetti from 'canvas-confetti';
import usePersistentState from '../../hooks/usePersistentState';
import {
  logEvent,
  logGameStart,
  logGameEnd,
  logGameError,
} from '../../utils/analytics';
import { DICTIONARIES } from '../../apps/hangman/engine';

const letters = 'abcdefghijklmnopqrstuvwxyz'.split('');
const dictionaryNames = Object.keys(DICTIONARIES);


// Helper to draw a line segment with a dashed reveal animation
const drawLine = (ctx, x1, y1, x2, y2, progress) => {
  ctx.save();
  ctx.setLineDash([100]);
  ctx.lineDashOffset = (1 - progress) * 100;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
};

// Individual hangman parts rendered progressively
const HANGMAN_PARTS = [
  (ctx, p) => {
    ctx.save();
    ctx.setLineDash([100]);
    ctx.lineDashOffset = (1 - p) * 100;
    ctx.beginPath();
    ctx.arc(120, 60, 20, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  },
  (ctx, p) => drawLine(ctx, 120, 80, 120, 140, p),
  (ctx, p) => drawLine(ctx, 120, 100, 90, 120, p),
  (ctx, p) => drawLine(ctx, 120, 100, 150, 120, p),
  (ctx, p) => drawLine(ctx, 120, 140, 100, 170, p),
  (ctx, p) => drawLine(ctx, 120, 140, 140, 170, p),
];

const maxWrong = HANGMAN_PARTS.length;

const Hangman = () => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const audioCtxRef = useRef(null);
  const partProgressRef = useRef(new Array(maxWrong).fill(0));
  const partStartRef = useRef(new Array(maxWrong).fill(0));
  const gallowsProgressRef = useRef(0);
  const gallowsStartRef = useRef(0);
  const reduceMotionRef = useRef(false);

  const [dict, setDict] = useState('family');
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
  const [announcement, setAnnouncement] = useState('');

  const won = word && word.split('').every((l) => guessed.includes(l));
  const lost = wrong >= maxWrong && !won;
  const frequencies = useMemo(() => {
    const counts = Object.fromEntries(letters.map((l) => [l, 0]));
    (DICTIONARIES[dict] || []).forEach((w) =>
      w.split('').forEach((c) => {
        if (counts[c] !== undefined) counts[c] += 1;
      }),
    );
    const max = Math.max(...Object.values(counts));
    return { counts, max };
  }, [dict]);

  const playTone = useCallback(
    (freq) => {
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
    },
    [sound],
  );

  const pickWord = useCallback(() => {
    const list = DICTIONARIES[dict] || DICTIONARIES.family;
    return list[Math.floor(Math.random() * list.length)];
  }, [dict]);

  const reset = useCallback(() => {
    try {
      setWord(pickWord());
      setGuessed([]);
      setWrong(0);
      setHintUsed(false);
      setScore(0);
      setPaused(false);
      partProgressRef.current = new Array(maxWrong).fill(0);
      partStartRef.current = new Array(maxWrong).fill(0);
      gallowsProgressRef.current = 0;
      gallowsStartRef.current = performance.now();
      setAnnouncement('');
      logGameStart('hangman');
    } catch (err) {
      logGameError('hangman', err?.message || String(err));
    }
  }, [pickWord]);

  useEffect(() => {
    reset();
  }, [reset]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => (reduceMotionRef.current = mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const hintOnce = useCallback(() => {
    if (hintUsed || paused) return;
    const remaining = word
      .split('')
      .filter((l) => !guessed.includes(l) && !'aeiou'.includes(l));
    if (!remaining.length) return;
    const letter =
      remaining[Math.floor(Math.random() * remaining.length)];
    setHintUsed(true);
    setScore((s) => s - 5);
    handleGuess(letter);
  }, [hintUsed, paused, word, guessed, handleGuess]);

  const handleGuess = useCallback(
    (letter) => {
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
        setAnnouncement(`Correct guess: ${letter}`);
      } else {
        playTone(200);
        const idx = wrong;
        partStartRef.current[idx] = performance.now();
        partProgressRef.current[idx] = reduceMotionRef.current ? 1 : 0;
        setWrong((w) => w + 1);
        setScore((s) => s - 1);
        const remaining = maxWrong - (wrong + 1);
        setAnnouncement(
          `Wrong guess: ${letter}. ${remaining} ${
            remaining === 1 ? 'try' : 'tries'
          } left.`,
        );
      }
    },
    [paused, guessed, wrong, maxWrong, word, playTone, logEvent],
  );

  const togglePause = useCallback(() => setPaused((p) => !p), []);
  const toggleSound = useCallback(() => setSound((s) => !s), []);

  const keyHandler = useCallback(
    (e) => {
      const k = e.key.toLowerCase();
      if (k === 'r') reset();
      else if (k === 'p') togglePause();
      else if (k === 'h') hintOnce();
      else if (k === 's') toggleSound();
      else if (/^[a-z]$/.test(k)) handleGuess(k);
    },
    [reset, togglePause, hintOnce, toggleSound, handleGuess],
  );

  useEffect(() => {
    window.addEventListener('keydown', keyHandler);
    return () => window.removeEventListener('keydown', keyHandler);
  }, [keyHandler]);

  useEffect(() => {
    if (won || wrong >= maxWrong) {
      logGameEnd('hangman', won ? 'win' : 'lose');
      if (won) {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        setAnnouncement('You won! Press R to play again.');
      } else {
        setAnnouncement(`You lost! ${word.toUpperCase()}. Press R to restart.`);
      }
      if (score > highscore) setHighscore(score);
    }
  }, [won, wrong, word, score, highscore, setHighscore]);

  const draw = useCallback(
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

    const now = performance.now();
    let gProg = gallowsProgressRef.current;
    if (gProg < 1) {
      const start = gallowsStartRef.current;
      gProg = reduceMotionRef.current
        ? 1
        : Math.min((now - start) / 500, 1);
      gallowsProgressRef.current = gProg;
    }

    drawLine(ctx, 20, 230, 180, 230, gProg);
    drawLine(ctx, 40, 20, 40, 230, gProg);
    drawLine(ctx, 40, 20, 120, 20, gProg);
    drawLine(ctx, 120, 20, 120, 40, gProg);

    HANGMAN_PARTS.forEach((seg, i) => {
      let prog = partProgressRef.current[i];
      if (i < wrong && prog < 1) {
        const start = partStartRef.current[i];
        prog = reduceMotionRef.current
          ? 1
          : Math.min((now - start) / 300, 1);
        partProgressRef.current[i] = prog;
      }
      if (prog > 0) seg(ctx, prog);
    });

    const chars = word.split('');
    chars.forEach((l, i) => {
      const x = 40 + i * 30;
      ctx.beginPath();
      ctx.moveTo(x, 200);
      ctx.lineTo(x + 20, 200);
      ctx.stroke();
      const char =
        guessed.includes(l) || wrong >= maxWrong ? l.toUpperCase() : '';
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

    if (won) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.fillStyle = '#0f0';
      ctx.fillText('You Won! Press R', ctx.canvas.width / 2, 120);
    } else if (lost) {
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
  }, [word, guessed, wrong, paused, score, highscore, won, lost]);

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
    <>
      <div className="flex justify-center space-x-2 mb-2">
        <select
          className="text-black px-1"
          value={dict}
          onChange={(e) => setDict(e.target.value)}
        >
          {dictionaryNames.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <button
          onClick={hintOnce}
          disabled={hintUsed || paused}
          className="px-2 py-1 bg-ub-orange text-black rounded"
        >
          Hint
        </button>
      </div>
      <div className="grid grid-cols-13 gap-1 text-xs mb-2">
        {letters.map((l) => {
          const intensity =
            frequencies.max ? frequencies.counts[l] / frequencies.max : 0;
          const color = `rgba(255,0,0,${intensity})`;
          return (
            <span
              key={l}
              style={{ backgroundColor: color }}
              className="px-1 rounded"
            >
              {l}
            </span>
          );
        })}
      </div>
      <canvas
        ref={canvasRef}
        width={400}
        height={250}
        className={`bg-ub-cool-grey w-full h-full ${lost ? 'grayscale' : ''}`}
      />
      <div aria-live="polite" role="status" className="sr-only">
        {announcement}
      </div>
    </>
  );
};

export default Hangman;

