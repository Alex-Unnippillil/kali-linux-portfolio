import React, { useRef, useState, useEffect } from 'react';
import {
  initializeGame,
  drawFromStock,
  moveWasteToTableau,
  moveTableauToTableau,
  moveToFoundation,
  valueToString,
} from './solitaire/engine';

const CARD_WIDTH = 60;
const CARD_HEIGHT = 90;
const H_GAP = 20;
const V_GAP = 20;
const OFFSET_X = 20;
const OFFSET_Y = 20;
const TABLEAU_Y = OFFSET_Y + CARD_HEIGHT + 40;

const isInside = (x, y, rx, ry, rw, rh) =>
  x >= rx && x <= rx + rw && y >= ry && y <= ry + rh;

const drawBack = (ctx, x, y) => {
  ctx.fillStyle = '#1e3a8a';
  ctx.fillRect(x, y, CARD_WIDTH, CARD_HEIGHT);
  ctx.strokeStyle = '#000';
  ctx.strokeRect(x, y, CARD_WIDTH, CARD_HEIGHT);
};

const drawEmpty = (ctx, x, y) => {
  ctx.strokeStyle = '#fff';
  ctx.strokeRect(x, y, CARD_WIDTH, CARD_HEIGHT);
};

const drawCard = (ctx, card, x, y) => {
  ctx.fillStyle = '#fff';
  ctx.fillRect(x, y, CARD_WIDTH, CARD_HEIGHT);
  ctx.strokeStyle = '#000';
  ctx.strokeRect(x, y, CARD_WIDTH, CARD_HEIGHT);
  ctx.fillStyle = card.color === 'red' ? '#dc2626' : '#000';
  ctx.font = '16px sans-serif';
  ctx.fillText(`${valueToString(card.value)}${card.suit}`, x + 5, y + 20);
};

const Solitaire = () => {
  const canvasRef = useRef(null);
  const [game, setGame] = useState(() => initializeGame(1));
  const [drag, setDrag] = useState(null); // {source,pile,index,offsetX,offsetY,x,y}
  const [paused, setPaused] = useState(false);
  const [sound, setSound] = useState(true);
  const [stats, setStats] = useState({ games: 0, wins: 0 });
  const [won, setWon] = useState(false);

  useEffect(() => {
    const saved = JSON.parse(
      typeof window !== 'undefined'
        ? localStorage.getItem('solitaireStats') || '{}'
        : '{}',
    );
    setStats({ games: saved.games || 0, wins: saved.wins || 0 });
  }, []);

  const playSound = () => {
    if (!sound) return;
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    osc.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  };

  const reset = () => {
    setGame(initializeGame(1));
    setDrag(null);
    setPaused(false);
    setWon(false);
    setStats((s) => {
      const ns = { ...s, games: s.games + 1 };
      if (typeof window !== 'undefined') {
        localStorage.setItem('solitaireStats', JSON.stringify(ns));
      }
      return ns;
    });
  };

  const togglePause = () => setPaused((p) => !p);
  const toggleSound = () => setSound((s) => !s);

  useEffect(() => {
    if (!won && game.foundations.every((p) => p.length === 13)) {
      setWon(true);
      setStats((s) => {
        const ns = { ...s, wins: s.wins + 1 };
        if (typeof window !== 'undefined') {
          localStorage.setItem('solitaireStats', JSON.stringify(ns));
        }
        return ns;
      });
    }
  }, [game, won]);

  const getMouse = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onMouseDown = (e) => {
    if (paused) return;
    const { x, y } = getMouse(e);
    // Stock
    if (isInside(x, y, OFFSET_X, OFFSET_Y, CARD_WIDTH, CARD_HEIGHT)) {
      setGame((g) => {
        const n = drawFromStock(g);
        if (n !== g) playSound();
        return n;
      });
      return;
    }
    // Waste
    const wx = OFFSET_X + CARD_WIDTH + H_GAP;
    if (
      game.waste.length &&
      isInside(x, y, wx, OFFSET_Y, CARD_WIDTH, CARD_HEIGHT)
    ) {
      setDrag({
        source: 'waste',
        pile: -1,
        index: game.waste.length - 1,
        offsetX: x - wx,
        offsetY: y - OFFSET_Y,
        x,
        y,
      });
      return;
    }
    // Tableau
    for (let i = 0; i < 7; i += 1) {
      const pile = game.tableau[i];
      const tx = OFFSET_X + i * (CARD_WIDTH + H_GAP);
      for (let j = pile.length - 1; j >= 0; j -= 1) {
        const card = pile[j];
        const ty = TABLEAU_Y + j * V_GAP;
        if (card.faceUp && isInside(x, y, tx, ty, CARD_WIDTH, CARD_HEIGHT)) {
          setDrag({
            source: 'tableau',
            pile: i,
            index: j,
            offsetX: x - tx,
            offsetY: y - ty,
            x,
            y,
          });
          return;
        }
      }
    }
  };

  const onMouseMove = (e) => {
    if (!drag) return;
    const { x, y } = getMouse(e);
    setDrag((d) => ({ ...d, x, y }));
  };

  const onMouseUp = (e) => {
    if (!drag) return;
    const { x, y } = getMouse(e);
    // Foundations
    for (let i = 0; i < 4; i += 1) {
      const fx = OFFSET_X + (CARD_WIDTH + H_GAP) * (i + 3);
      if (isInside(x, y, fx, OFFSET_Y, CARD_WIDTH, CARD_HEIGHT)) {
        setGame((g) => {
          const n = moveToFoundation(
            g,
            drag.source,
            drag.source === 'tableau' ? drag.pile : null,
          );
          if (n !== g) playSound();
          return n;
        });
        setDrag(null);
        return;
      }
    }
    // Tableau drop
    for (let i = 0; i < 7; i += 1) {
      const tx = OFFSET_X + i * (CARD_WIDTH + H_GAP);
      if (isInside(x, y, tx, TABLEAU_Y - CARD_HEIGHT, CARD_WIDTH, 600)) {
        setGame((g) => {
          let n;
          if (drag.source === 'waste') n = moveWasteToTableau(g, i);
          else n = moveTableauToTableau(g, drag.pile, drag.index, i);
          if (n !== g) playSound();
          return n;
        });
        setDrag(null);
        return;
      }
    }
    setDrag(null);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animation;
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#0f5132';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Stock
      if (game.stock.length) drawBack(ctx, OFFSET_X, OFFSET_Y);
      else drawEmpty(ctx, OFFSET_X, OFFSET_Y);

      // Waste
      const wx = OFFSET_X + CARD_WIDTH + H_GAP;
      if (!(drag && drag.source === 'waste')) {
        const top = game.waste[game.waste.length - 1];
        if (top) drawCard(ctx, top, wx, OFFSET_Y);
        else drawEmpty(ctx, wx, OFFSET_Y);
      }

      // Foundations
      for (let i = 0; i < 4; i += 1) {
        const fx = OFFSET_X + (CARD_WIDTH + H_GAP) * (i + 3);
        const pile = game.foundations[i];
        const top = pile[pile.length - 1];
        if (top) drawCard(ctx, top, fx, OFFSET_Y);
        else drawEmpty(ctx, fx, OFFSET_Y);
      }

      // Tableau
      for (let i = 0; i < 7; i += 1) {
        const pile = game.tableau[i];
        const tx = OFFSET_X + i * (CARD_WIDTH + H_GAP);
        for (let j = 0; j < pile.length; j += 1) {
          if (
            drag &&
            drag.source === 'tableau' &&
            drag.pile === i &&
            j >= drag.index
          )
            continue;
          const card = pile[j];
          const ty = TABLEAU_Y + j * V_GAP;
          if (card.faceUp) drawCard(ctx, card, tx, ty);
          else drawBack(ctx, tx, ty);
        }
      }

      // Dragged cards
      if (drag) {
        const dx = drag.x - drag.offsetX;
        const dy = drag.y - drag.offsetY;
        if (drag.source === 'waste') {
          const card = game.waste[game.waste.length - 1];
          if (card) drawCard(ctx, card, dx, dy);
        } else {
          const stack = game.tableau[drag.pile].slice(drag.index);
          stack.forEach((card, idx) => drawCard(ctx, card, dx, dy + idx * V_GAP));
        }
      }

      if (!paused) animation = requestAnimationFrame(render);
    };
    if (!paused) animation = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animation);
  }, [game, drag, paused]);

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-black text-white select-none">
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        className="touch-none"
      />
      <div className="mt-2 space-x-2">
        <button className="px-2 py-1 bg-gray-700" onClick={reset}>
          Reset
        </button>
        <button className="px-2 py-1 bg-gray-700" onClick={togglePause}>
          {paused ? 'Resume' : 'Pause'}
        </button>
        <button className="px-2 py-1 bg-gray-700" onClick={toggleSound}>
          Sound: {sound ? 'On' : 'Off'}
        </button>
        <span className="ml-4">G:{stats.games} W:{stats.wins}</span>
        {won && <span className="ml-2">You win!</span>}
      </div>
    </div>
  );
};

export default Solitaire;
