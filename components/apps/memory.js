import React, { useState, useEffect, useRef, useCallback } from 'react';
import GameLayout from './GameLayout';
import { createDeck } from './memory_utils';

const SIZE = 4;

const Memory = () => {
  const [cards, setCards] = useState([]);
  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState([]);
  const [highlight, setHighlight] = useState([]);
  const [moves, setMoves] = useState(0);
  const [time, setTime] = useState(0);
  const [stars, setStars] = useState(3);
  const [paused, setPaused] = useState(false);
  const [sound, setSound] = useState(true);
  const [best, setBest] = useState({ moves: null, time: null });
  const [announcement, setAnnouncement] = useState('');

  const runningRef = useRef(false);
  const startRef = useRef(0);
  const rafRef = useRef();
  const reduceMotion = useRef(false);

  const key = `memory_best_${SIZE}`;

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => {
      reduceMotion.current = mq.matches;
    };
    update();
    mq.addEventListener ? mq.addEventListener('change', update) : mq.addListener(update);
    return () => {
      mq.removeEventListener ? mq.removeEventListener('change', update) : mq.removeListener(update);
    };
  }, []);

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
    setHighlight([]);
    setMoves(0);
    setTime(0);
    setStars(3);
    setPaused(false);
    runningRef.current = false;
    startRef.current = 0;
    setAnnouncement('');
  }, []);

  useEffect(() => {
    reset();
    const stored = JSON.parse(localStorage.getItem(key) || '{}');
    setBest(stored);
  }, [reset, key]);

  const saveBest = useCallback(() => {
    const stored = JSON.parse(localStorage.getItem(key) || '{}');
    const bestMoves = stored.moves != null ? Math.min(stored.moves, moves) : moves;
    const bestTime = stored.time != null ? Math.min(stored.time, time) : time;
    const updated = { moves: bestMoves, time: bestTime };
    localStorage.setItem(key, JSON.stringify(updated));
    setBest(updated);
  }, [moves, time, key]);

  useEffect(() => {
    if (cards.length && matched.length === cards.length) {
      runningRef.current = false;
      saveBest();
      setAnnouncement(`You won in ${moves} moves and ${time} seconds`);
    }
  }, [matched, cards.length, saveBest, moves, time]);

  useEffect(() => {
    const pairs = cards.length / 2 || 1;
    if (moves <= pairs * 2) setStars(3);
    else if (moves <= pairs * 3) setStars(2);
    else setStars(1);
  }, [moves, cards.length]);

  const handleCardClick = (idx) => {
    if (paused || flipped.includes(idx) || matched.includes(idx)) return;
    if (!runningRef.current) {
      runningRef.current = true;
      startRef.current = performance.now();
    }
    beep();
    if (flipped.length === 0) {
      setFlipped([idx]);
    } else if (flipped.length === 1) {
      const first = flipped[0];
      const second = idx;
      const newFlipped = [first, second];
      setFlipped(newFlipped);
      setMoves((mv) => mv + 1);
      if (cards[first].value === cards[second].value) {
        setMatched([...matched, first, second]);
        setHighlight([first, second]);
        setAnnouncement('Match found');
        setTimeout(() => {
          setFlipped([]);
          setHighlight([]);
        }, reduceMotion.current ? 0 : 400);
      } else {
        setAnnouncement('No match');
        setTimeout(() => setFlipped([]), reduceMotion.current ? 0 : 800);
      }
    }
  };

  useEffect(() => {
    const loop = (timestamp) => {
      if (runningRef.current && !paused) {
        setTime(Math.floor((timestamp - startRef.current) / 1000));
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [paused]);

  return (
    <GameLayout gameId="memory">
      <div className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white p-4 select-none">
        <div aria-live="polite" role="status" className="sr-only">{announcement}</div>
        <div className="relative mb-4" style={{ width: '400px' }}>
          <div className="grid grid-cols-4 gap-2">
            {cards.map((card, i) => {
              const isFlipped = flipped.includes(i) || matched.includes(i);
              const isHighlighted = highlight.includes(i);
              return (
                <button
                  key={card.id}
                  onClick={() => handleCardClick(i)}
                  aria-label={isFlipped ? `Card ${card.value}` : 'Hidden card'}
                  disabled={flipped.includes(i) || matched.includes(i) || paused}
                  className={`relative w-full aspect-square [perspective:600px] rounded ${isHighlighted ? 'ring-4 ring-green-400' : ''}`}
                >
                  <div
                    className={`w-full h-full transition-transform ${reduceMotion.current ? '' : 'duration-500'} [transform-style:preserve-3d]`}
                    style={{ transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
                  >
                    <div className="absolute inset-0 rounded flex items-center justify-center bg-gray-700 text-white [backface-visibility:hidden]" />
                    <div
                      className={`absolute inset-0 rounded flex items-center justify-center [transform:rotateY(180deg)] [backface-visibility:hidden] ${isHighlighted ? 'bg-green-500 text-black' : 'bg-gray-100 text-gray-900'} transition-colors duration-300`}
                    >
                      <span className="text-2xl">{card.value}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          {paused && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white text-2xl">Paused</div>
          )}
        </div>
        <div className="flex space-x-4 mb-2">
          <div>Time: {time}s</div>
          <div>Moves: {moves}</div>
          <div>Rating: {'★'.repeat(stars)}{'☆'.repeat(3 - stars)}</div>
          {best.moves != null && <div>Best: {best.moves}m/{best.time}s</div>}
        </div>
        <div className="flex space-x-2">
          <button onClick={reset} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded">Reset</button>
          <button onClick={() => setPaused((p) => !p)} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded">
            {paused ? 'Resume' : 'Pause'}
          </button>
          <button onClick={() => setSound((s) => !s)} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded">
            Sound: {sound ? 'On' : 'Off'}
          </button>
        </div>
      </div>
    </GameLayout>
  );
};

export default Memory;
