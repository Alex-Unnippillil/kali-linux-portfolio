import React, { useEffect, useRef, useState } from 'react';
import * as PIXI from 'pixi.js';

const ITEMS = [
  '🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮',
  '🐷','🐸','🐵','🐔','🐧','🐦','🐤','🐺','🐗','🐴','🦄','🐝',
  '🐛','🦋','🐌','🐞','🐜','🪲','🐢','🐍'
];

const DIFFICULTIES = {
  easy: 4,
  medium: 6,
  hard: 8,
} as const;

type Difficulty = keyof typeof DIFFICULTIES;

const CARD_SIZE = 64;
const GAP = 8;
const CARD_BACK_COLOR = 0x3b82f6;
const ASSIST_COLOR = 0xff6666;
const FLIP_BACK_DELAY = 800;

interface Card {
  id: number;
  value: string;
  matched: boolean;
  container: PIXI.Container;
}

const shuffle = <T,>(arr: T[]): T[] => {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const Memory: React.FC = () => {
  const divRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application>();
  const cardsRef = useRef<Card[]>([]);
  const flippedRef = useRef<number[]>([]);
  const timerRef = useRef<NodeJS.Timeout>();
  const lastMismatchRef = useRef<number[] | null>(null);

  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [turns, setTurns] = useState(0);
  const [time, setTime] = useState(0);
  const [assist, setAssist] = useState(false);

  useEffect(() => {
    const app = new PIXI.Application();
    appRef.current = app;
    const container = divRef.current as HTMLDivElement;
    container.innerHTML = '';
    container.appendChild(app.view as HTMLCanvasElement);
    return () => {
      clearInterval(timerRef.current);
      app.destroy(true);
    };
  }, []);

  const startTimer = () => {
    clearInterval(timerRef.current);
    const start = performance.now();
    timerRef.current = setInterval(() => {
      setTime(Math.floor((performance.now() - start) / 1000));
    }, 1000);
  };

  const resetHighlights = () => {
    if (lastMismatchRef.current) {
      lastMismatchRef.current.forEach((idx) => {
        const back = cardsRef.current[idx].container
          .children[0] as PIXI.Graphics;
        back.tint = CARD_BACK_COLOR;
      });
      lastMismatchRef.current = null;
    }
  };

  const setup = () => {
    const app = appRef.current as PIXI.Application;
    app.stage.removeChildren();
    cardsRef.current.forEach((c) => c.container.destroy());

    const size = DIFFICULTIES[difficulty];
    const total = size * size;
    const needed = total / 2;
    const pool = shuffle(ITEMS.slice(0, needed));
    const deckValues = shuffle([...pool, ...pool]);

    cardsRef.current = deckValues.map((val, idx) => {
      const container = new PIXI.Container();
      const back = new PIXI.Graphics();
      back
        .beginFill(CARD_BACK_COLOR)
        .drawRoundedRect(0, 0, CARD_SIZE, CARD_SIZE, 8)
        .endFill();
      const front = new PIXI.Text(val, { fontSize: CARD_SIZE * 0.5 });
      front.anchor.set(0.5);
      front.position.set(CARD_SIZE / 2, CARD_SIZE / 2);
      front.visible = false;
      container.addChild(back);
      container.addChild(front);
      container.x = (idx % size) * (CARD_SIZE + GAP);
      container.y = Math.floor(idx / size) * (CARD_SIZE + GAP);
      container.eventMode = 'static';
      container.cursor = 'pointer';
      container.on('pointertap', () => flip(idx));
      app.stage.addChild(container);
      return { id: idx, value: val, matched: false, container };
    });

    app.renderer.resize(
      size * (CARD_SIZE + GAP) - GAP,
      size * (CARD_SIZE + GAP) - GAP
    );

    flippedRef.current = [];
    resetHighlights();
    setTurns(0);
    setTime(0);
    clearInterval(timerRef.current);
  };

  useEffect(() => {
    if (appRef.current) {
      setup();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [difficulty]);

  const flip = (idx: number) => {
    const cards = cardsRef.current;
    const card = cards[idx];
    if (card.matched || flippedRef.current.includes(idx)) return;

    if (flippedRef.current.length === 0) {
      resetHighlights();
    }

    const container = card.container;
    const back = container.children[0] as PIXI.Graphics;
    const front = container.children[1] as PIXI.Text;

    back.visible = false;
    front.visible = true;
    flippedRef.current.push(idx);

    if (turns === 0 && flippedRef.current.length === 1 && time === 0) {
      startTimer();
    }

    if (flippedRef.current.length === 2) {
      setTurns((t) => t + 1);
      const [a, b] = flippedRef.current;
      const cardA = cards[a];
      const cardB = cards[b];
      if (cardA.value === cardB.value) {
        cardA.matched = cardB.matched = true;
        flippedRef.current = [];
        if (cards.every((c) => c.matched)) {
          clearInterval(timerRef.current);
        }
      } else {
        if (assist) {
          resetHighlights();
          lastMismatchRef.current = [a, b];
          [a, b].forEach((i) => {
            const g = cards[i].container.children[0] as PIXI.Graphics;
            g.tint = ASSIST_COLOR;
          });
        }
        setTimeout(() => {
          [a, b].forEach((i) => {
            const cont = cards[i].container;
            (cont.children[1] as PIXI.Text).visible = false;
            (cont.children[0] as PIXI.Graphics).visible = true;
          });
          flippedRef.current = [];
        }, FLIP_BACK_DELAY);
      }
    }
  };

  const handleAssist = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAssist(e.target.checked);
    if (!e.target.checked) {
      resetHighlights();
    }
  };

  return (
    <div className="p-4 select-none">
      <div className="mb-2 flex items-center gap-4 flex-wrap">
        <label className="flex items-center gap-1">
          Difficulty:
          <select
            className="border p-1 text-sm"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as Difficulty)}
          >
            {Object.keys(DIFFICULTIES).map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={assist}
            onChange={handleAssist}
          />
          Assist
        </label>
        <button
          onClick={setup}
          className="border px-2 py-1 text-sm"
        >
          Reset
        </button>
        <div>Turns: {turns}</div>
        <div>Time: {time}s</div>
      </div>
      <div ref={divRef} />
    </div>
  );
};

export default Memory;

