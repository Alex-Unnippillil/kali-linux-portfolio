import React, { useState, useEffect, useRef } from 'react';

const DEFAULT_IMAGES = ['🐶','🐱','🐭','🦊','🐻','🐼','🐸','🐵','🐤','🐙','🦄','🐝'];

const shuffle = (arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const createDeck = (size, images) => {
  const needed = (size * size) / 2;
  const imgs = images.length ? images.slice(0, needed) : DEFAULT_IMAGES.slice(0, needed);
  while (imgs.length < needed) {
    imgs.push(DEFAULT_IMAGES[imgs.length % DEFAULT_IMAGES.length]);
  }
  const deck = imgs.flatMap((img, idx) => [
    { id: idx * 2, img, flipped: false, matched: false },
    { id: idx * 2 + 1, img, flipped: false, matched: false },
  ]);
  return shuffle(deck);
};

const Memory = () => {
  const [size, setSize] = useState(4); // grid size
  const [customImages, setCustomImages] = useState([]);
  const [cards, setCards] = useState([]);
  const [flipped, setFlipped] = useState([]);
  const [moves, setMoves] = useState(0);
  const [start, setStart] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef(null);
  const wsRef = useRef(null);
  const [status, setStatus] = useState('Select size and start');

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:3001');
    wsRef.current = ws;
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'win') {
          setStatus('Opponent finished first!');
          clearInterval(timerRef.current);
        }
      } catch (err) {
        // ignore
      }
    };
    return () => ws.close();
  }, []);

  useEffect(() => {
    if (start) {
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - start) / 1000));
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [start]);

  const startGame = () => {
    setCards(createDeck(size, customImages));
    setFlipped([]);
    setMoves(0);
    setStart(Date.now());
    setElapsed(0);
    setStatus('Find all pairs!');
  };

  const handleFlip = (idx) => {
    if (flipped.length === 2 || cards[idx].flipped || cards[idx].matched) return;
    const newCards = cards.slice();
    newCards[idx].flipped = true;
    const newFlipped = [...flipped, idx];
    setCards(newCards);
    setFlipped(newFlipped);
    if (newFlipped.length === 2) {
      setMoves((m) => m + 1);
      const [a, b] = newFlipped;
      if (newCards[a].img === newCards[b].img) {
        newCards[a].matched = true;
        newCards[b].matched = true;
        setCards(newCards);
        setFlipped([]);
        if (newCards.every((c) => c.matched)) {
          finishGame();
        }
      } else {
        setTimeout(() => {
          newCards[a].flipped = false;
          newCards[b].flipped = false;
          setCards(newCards);
          setFlipped([]);
        }, 800);
      }
    }
  };

  const finishGame = () => {
    clearInterval(timerRef.current);
    const time = Math.floor((Date.now() - start) / 1000);
    setStatus(`You win in ${time}s!`);
    const bestKey = `memory-best-${size}`;
    const prev = localStorage.getItem(bestKey);
    if (!prev || time < Number(prev)) {
      localStorage.setItem(bestKey, String(time));
    }
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: 'win', time }));
    }
  };

  const handleFiles = (e) => {
    const files = Array.from(e.target.files || []);
    const urls = files.map((f) => {
      const url = URL.createObjectURL(f);
      // Placeholder for upload to server or S3
      // const form = new FormData();
      // form.append('file', f);
      // fetch('/api/upload', { method: 'POST', body: form });
      return url;
    });
    setCustomImages(urls);
  };

  const cardSize = 64;

  return (
    <div className="h-full w-full flex flex-col items-center justify-start bg-ub-cool-grey text-white p-4 select-none overflow-auto">
      <div className="mb-4 flex flex-wrap gap-2 items-center justify-center">
        <select
          className="bg-gray-700 px-2 py-1"
          value={size}
          onChange={(e) => setSize(Number(e.target.value))}
        >
          {[2,4,6].map((s) => (
            <option key={s} value={s}>{`${s}x${s}`}</option>
          ))}
        </select>
        <input type="file" accept="image/*" multiple onChange={handleFiles} />
        <button className="px-3 py-1 bg-gray-700" onClick={startGame}>Start</button>
        <div className="ml-4">Moves: {moves}</div>
        <div>Time: {elapsed}s</div>
      </div>
      <div className="mb-2">{status}</div>
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${size}, ${cardSize}px)` }}
      >
        {cards.map((card, idx) => (
          <button
            key={card.id}
            type="button"
            onClick={() => handleFlip(idx)}
            style={{ width: cardSize, height: cardSize, perspective: '600px' }}
          >
            <div
              style={{
                position: 'relative',
                width: '100%',
                height: '100%',
                textAlign: 'center',
                transition: 'transform 0.6s',
                transformStyle: 'preserve-3d',
                transform: card.flipped || card.matched ? 'rotateY(180deg)' : 'none',
              }}
            >
              <div
                className="absolute inset-0 flex items-center justify-center bg-gray-600"
                style={{ backfaceVisibility: 'hidden' }}
              >
                ❓
              </div>
              <div
                className="absolute inset-0 flex items-center justify-center bg-gray-200 text-2xl"
                style={{ transform: 'rotateY(180deg)', backfaceVisibility: 'hidden' }}
              >
                {card.img.startsWith('blob:') ? (
                  <img src={card.img} alt="" className="w-full h-full object-cover" />
                ) : (
                  card.img
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default Memory;
