import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
} from 'react';
import GameLayout from './GameLayout';
import { createDeck } from './memory_utils';

// fixed grid size
const SIZE = 4;

const Memory = () => {
  const canvasRef = useRef(null);

  const [cards, setCards] = useState([]);
  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState([]);
  const [moves, setMoves] = useState(0);
  const [time, setTime] = useState(0);
  const [stars, setStars] = useState(3);
  const [paused, setPaused] = useState(false);
  const [sound, setSound] = useState(true);
  const [best, setBest] = useState({ moves: null, time: null });

  const runningRef = useRef(false);
  const startRef = useRef(0);
  const rafRef = useRef();

  // refs to avoid stale closures in rAF loop
  const cardsRef = useRef(cards);
  const flippedRef = useRef(flipped);
  const matchedRef = useRef(matched);
  const pausedRef = useRef(paused);

  useEffect(() => {
    cardsRef.current = cards;
  }, [cards]);
  useEffect(() => {
    flippedRef.current = flipped;
  }, [flipped]);
  useEffect(() => {
    matchedRef.current = matched;
  }, [matched]);
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  const key = `memory_best_${SIZE}`;

  const beep = useCallback(() => {
    if (!sound || typeof window === 'undefined') return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = 600;
      osc.connect(ctx.destination);
      osc.start();
      setTimeout(() => {
        osc.stop();
        ctx.close();
      }, 100);
    } catch {
      // ignore audio errors
    }
  }, [sound]);

  const reset = useCallback(() => {
    setCards(createDeck(SIZE));
    setFlipped([]);
    setMatched([]);
    setMoves(0);
    setTime(0);
    setStars(3);
    setPaused(false);
    runningRef.current = false;
    startRef.current = 0;
  }, []);

  useEffect(() => {
    reset();
    const stored = JSON.parse(localStorage.getItem(key) || '{}');
    setBest(stored);
  }, [reset, key]);

  const saveBest = useCallback(() => {
    const stored = JSON.parse(localStorage.getItem(key) || '{}');
    const bestMoves =
      stored.moves != null ? Math.min(stored.moves, moves) : moves;
    const bestTime =
      stored.time != null ? Math.min(stored.time, time) : time;
    const updated = { moves: bestMoves, time: bestTime };
    localStorage.setItem(key, JSON.stringify(updated));
    setBest(updated);
  }, [moves, time, key]);

  useEffect(() => {
    if (cards.length && matched.length === cards.length) {
      runningRef.current = false;
      saveBest();
    }
  }, [matched, cards.length, saveBest]);

  // star rating based on move count
  useEffect(() => {
    const pairs = cards.length / 2 || 1;
    if (moves <= pairs * 2) setStars(3);
    else if (moves <= pairs * 3) setStars(2);
    else setStars(1);
  }, [moves, cards.length]);

  const handleClick = (e) => {
    if (pausedRef.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const ratio = window.devicePixelRatio || 1;
    const cellW = canvas.width / ratio / SIZE;
    const cellH = canvas.height / ratio / SIZE;
    const col = Math.floor(x / cellW);
    const row = Math.floor(y / cellH);
    const idx = row * SIZE + col;
    const f = flippedRef.current;
    const m = matchedRef.current;
    if (f.includes(idx) || m.includes(idx)) return;
    if (!runningRef.current) {
      runningRef.current = true;
      startRef.current = performance.now();
    }
    beep();
    if (f.length === 0) {
      setFlipped([idx]);
    } else if (f.length === 1) {
      const first = f[0];
      const second = idx;
      const newFlipped = [first, second];
      setFlipped(newFlipped);
      setMoves((mv) => mv + 1);
      if (cardsRef.current[first].value === cardsRef.current[second].value) {
        setMatched([...m, first, second]);
        setTimeout(() => setFlipped([]), 600);
      } else {
        setTimeout(() => setFlipped([]), 800);
      }
    }
  };

  // canvas setup and animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const ratio = window.devicePixelRatio || 1;
    const sizePx = 400;
    canvas.style.width = `${sizePx}px`;
    canvas.style.height = `${sizePx}px`;
    canvas.width = sizePx * ratio;
    canvas.height = sizePx * ratio;
    ctx.scale(ratio, ratio);

    const draw = () => {
      const w = sizePx;
      const h = sizePx;
      const cellW = w / SIZE;
      const cellH = h / SIZE;
      ctx.clearRect(0, 0, w, h);
      const c = cardsRef.current;
      const f = flippedRef.current;
      const m = matchedRef.current;
      for (let i = 0; i < c.length; i++) {
        const row = Math.floor(i / SIZE);
        const col = i % SIZE;
        const x = col * cellW;
        const y = row * cellH;
        const isFlipped = f.includes(i) || m.includes(i);
        ctx.fillStyle = isFlipped ? '#ddd' : '#666';
        ctx.fillRect(x + 5, y + 5, cellW - 10, cellH - 10);
        ctx.strokeStyle = '#444';
        ctx.strokeRect(x + 5, y + 5, cellW - 10, cellH - 10);
        if (isFlipped) {
          ctx.font = `${cellW * 0.6}px serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#000';
          ctx.fillText(c[i].value, x + cellW / 2, y + cellH / 2);
        }
      }
      if (pausedRef.current) {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#fff';
        ctx.font = '24px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Paused', w / 2, h / 2);
      }
    };

    const loop = (timestamp) => {
      if (runningRef.current && !pausedRef.current) {
        setTime(Math.floor((timestamp - startRef.current) / 1000));
      }
      draw();
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <GameLayout gameId="memory">
      <div className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white p-4 select-none">
        <canvas
          ref={canvasRef}
          width={400}
          height={400}
          onClick={handleClick}
          className="mb-4 border border-gray-700 bg-gray-800"
        />
        <div className="flex space-x-4 mb-2">
          <div>Time: {time}s</div>
          <div>Moves: {moves}</div>
          <div>
            Rating: {'★'.repeat(stars)}{'☆'.repeat(3 - stars)}
          </div>
          {best.moves != null && (
            <div>
              Best: {best.moves}m/{best.time}s
            </div>
          )}
        </div>
        <div className="flex space-x-2">
          <button
            onClick={reset}
            className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
          >
            Reset
          </button>
          <button
            onClick={() => setPaused((p) => !p)}
            className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
          >
            {paused ? 'Resume' : 'Pause'}
          </button>
          <button
            onClick={() => setSound((s) => !s)}
            className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
          >
            Sound: {sound ? 'On' : 'Off'}
          </button>
        </div>
      </div>
    </GameLayout>
  );
};

export default Memory;

