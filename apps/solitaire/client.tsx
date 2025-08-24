'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Application, Container, Graphics, Text } from 'pixi.js';
import * as Klondike from './klondike';
import type { Card, GameState, Pile } from './klondike';
import { saveGame, loadGame } from './storage';

const CARD_W = 80;
const CARD_H = 110;
const STOCK_X = 20;
const STOCK_Y = 20;
const WASTE_X = 120;
const WASTE_Y = 20;
const FOUNDATION_X = 260;
const FOUNDATION_Y = 20;
const TABLEAU_X = 20;
const TABLEAU_Y = 180;

export default function SolitaireClient() {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application>();
  const sprites = useRef(new Map<Card, Container>());
  const [state, setState] = useState<GameState>();
  const [drawMode, setDrawMode] = useState<1 | 3>(1);
  const announceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const app = new Application();
    app.init({ width: 900, height: 700, background: '#0f172a' }).then(() => {
      containerRef.current?.appendChild(app.canvas as HTMLCanvasElement);
      appRef.current = app;
      loadGame<GameState>('klondike').then((g) => {
        setState(g || Klondike.newGame());
      });
    });
    return () => app.destroy();
  }, []);

  useEffect(() => {
    if (!state) return;
    render();
    saveGame('klondike', state);
  }, [state]);

  const announce = (msg: string) => {
    if (announceRef.current) announceRef.current.textContent = msg;
  };

  const getSprite = (card: Card): Container => {
    let spr = sprites.current.get(card);
    if (!spr) {
      spr = createCardSprite(card);
      sprites.current.set(card, spr);
    }
    return spr;
  };

  const createCardSprite = (card: Card): Container => {
    const cont = new Container();
    const g = new Graphics();
    g.roundRect(0, 0, CARD_W, CARD_H, 8).fill(0xffffff).stroke({ color: 0x000000, width: 1 });
    const label = new Text(`${card.rank}${card.suit[0].toUpperCase()}`, {
      fill: 0x000000,
      fontSize: 16,
    });
    label.x = CARD_W / 2 - label.width / 2;
    label.y = CARD_H / 2 - label.height / 2;
    cont.addChild(g, label);
    cont.eventMode = 'static';
    let lastTap = 0;
    cont.on('pointertap', () => {
      const now = performance.now();
      if (now - lastTap < 300) {
        moveCardToFoundation(card);
      } else {
        moveCardToTableau(card);
      }
      lastTap = now;
    });
    (cont as any).card = card;
    return cont;
  };

  const animateTo = (spr: Container, x: number, y: number) => {
    const app = appRef.current!;
    const move = () => {
      const dx = x - spr.x;
      const dy = y - spr.y;
      spr.x += dx * 0.2;
      spr.y += dy * 0.2;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) {
        spr.x = x;
        spr.y = y;
        app.ticker.remove(move);
      }
    };
    app.ticker.add(move);
  };

  const place = (card: Card, x: number, y: number) => {
    const spr = getSprite(card);
    if (!appRef.current!.stage.children.includes(spr)) {
      appRef.current!.stage.addChild(spr);
    }
    spr.visible = true;
    animateTo(spr, x, y);
    return spr;
  };

  const render = () => {
    if (!appRef.current || !state) return;
    const app = appRef.current;
    const used = new Set<Container>();
    app.stage.removeChildren();

    // stock
    if (state.stock.cards.length > 0) {
      const back = new Graphics();
      back.rect(STOCK_X, STOCK_Y, CARD_W, CARD_H).fill(0x1e293b).stroke({ color: 0xffffff });
      back.eventMode = 'static';
      back.on('pointertap', drawFromStock);
      app.stage.addChild(back);
    } else {
      const empty = new Graphics();
      empty.rect(STOCK_X, STOCK_Y, CARD_W, CARD_H).stroke({ color: 0xffffff });
      empty.eventMode = 'static';
      empty.on('pointertap', drawFromStock);
      app.stage.addChild(empty);
    }

    // waste
    const wasteCard = state.waste.cards[state.waste.cards.length - 1];
    if (wasteCard) {
      const spr = place(wasteCard, WASTE_X, WASTE_Y);
      used.add(spr);
    } else {
      const empty = new Graphics();
      empty.rect(WASTE_X, WASTE_Y, CARD_W, CARD_H).stroke({ color: 0xffffff });
      app.stage.addChild(empty);
    }

    // foundations
    state.foundations.forEach((p, i) => {
      const card = p.cards[p.cards.length - 1];
      if (card) {
        const spr = place(card, FOUNDATION_X + i * 100, FOUNDATION_Y);
        used.add(spr);
      } else {
        const empty = new Graphics();
        empty.rect(FOUNDATION_X + i * 100, FOUNDATION_Y, CARD_W, CARD_H).stroke({ color: 0xffffff });
        app.stage.addChild(empty);
      }
    });

    // tableaus
    state.tableaus.forEach((p, i) => {
      p.cards.forEach((c, j) => {
        const spr = place(c, TABLEAU_X + i * 100, TABLEAU_Y + j * 30);
        used.add(spr);
      });
    });

    // cleanup unused sprites
    sprites.current.forEach((spr) => {
      if (!used.has(spr)) spr.visible = false;
    });

    highlightSuggestions();
  };

  const findCard = (s: GameState, card: Card): { pile: Pile; index: number } | undefined => {
    const wIndex = s.waste.cards.indexOf(card);
    if (wIndex >= 0) return { pile: s.waste, index: wIndex };
    for (const pile of s.tableaus) {
      const idx = pile.cards.indexOf(card);
      if (idx >= 0) return { pile, index: idx };
    }
    return undefined;
  };

  const moveCardToFoundation = (card: Card) => {
    setState((s) => {
      if (!s) return s;
      const info = findCard(s, card);
      if (!info) return s;
      if (info.index !== info.pile.cards.length - 1) return s;
      for (const f of s.foundations) {
        if (Klondike.canMoveToFoundation(card, f)) {
          f.cards.push(card);
          info.pile.cards.pop();
          announce(`Moved ${card.rank}${card.suit[0]} to foundation`);
          return { ...s };
        }
      }
      return s;
    });
  };

  const moveCardToTableau = (card: Card) => {
    setState((s) => {
      if (!s) return s;
      const info = findCard(s, card);
      if (!info) return s;
      if (info.pile === s.waste) {
        // move from waste
        const wasteCard = info.pile.cards[info.index];
        if (info.index !== info.pile.cards.length - 1) return s;
        for (const t of s.tableaus) {
          const top = t.cards[t.cards.length - 1];
          if (Klondike.canPlaceOnTableau(wasteCard, top)) {
            t.cards.push(wasteCard);
            info.pile.cards.pop();
            announce(`Moved ${wasteCard.rank}${wasteCard.suit[0]} to tableau`);
            return { ...s };
          }
        }
      } else {
        // move between tableaus
        for (const t of s.tableaus) {
          if (t === info.pile) continue;
          if (Klondike.moveStack(info.pile, info.index, t)) {
            announce('Moved stack to tableau');
            return { ...s };
          }
        }
      }
      return s;
    });
  };

  const highlightSuggestions = () => {
    if (!state) return;
    sprites.current.forEach((spr) => (spr.tint = 0xffffff));
    const toHighlight: Card[] = [];
    const wasteCard = state.waste.cards[state.waste.cards.length - 1];
    if (wasteCard && state.foundations.some((f) => Klondike.canMoveToFoundation(wasteCard, f))) {
      toHighlight.push(wasteCard);
    }
    state.tableaus.forEach((p) => {
      const c = p.cards[p.cards.length - 1];
      if (c && state.foundations.some((f) => Klondike.canMoveToFoundation(c, f))) {
        toHighlight.push(c);
      }
    });
    toHighlight.forEach((c) => {
      const spr = sprites.current.get(c);
      if (spr) spr.tint = 0x66ff66;
    });
  };

  const drawFromStock = () => {
    setState((s) => {
      if (!s) return s;
      if (s.stock.cards.length === 0) {
        s.stock.cards = s.waste.cards.reverse();
        s.waste.cards = [];
        announce('Reset stock');
        return { ...s };
      }
      const drawn = s.stock.cards.splice(-drawMode);
      s.waste.cards.push(...drawn.reverse());
      announce(`Drew ${drawn.length} card${drawn.length > 1 ? 's' : ''}`);
      return { ...s };
    });
  };

  const onAutoMove = () => {
    setState((s) => {
      if (!s) return s;
      const copy = { ...s };
      if (Klondike.autoMove(copy)) {
        announce('Auto moved');
        return copy;
      }
      return s;
    });
  };

  const onAutoComplete = () => {
    if (!state) return;
    const copy = { ...state };
    const step = () => {
      if (Klondike.autoMove(copy)) {
        setState({ ...copy });
        setTimeout(step, 200);
      } else {
        announce('Auto complete finished');
      }
    };
    step();
  };

  return (
    <div>
      <div ref={containerRef} />
      <div className="flex gap-2 mt-2">
        <button onClick={drawFromStock}>Draw</button>
        <button onClick={() => setDrawMode(drawMode === 1 ? 3 : 1)}>
          {drawMode === 1 ? '1-draw' : '3-draw'}
        </button>
        <button onClick={onAutoMove}>Auto Move</button>
        <button onClick={onAutoComplete}>Auto Complete</button>
      </div>
      <div ref={announceRef} aria-live="polite" className="sr-only" />
    </div>
  );
}

