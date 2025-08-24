import React, { useEffect, useState } from 'react';
import * as Klondike from './klondike';
import * as Spider from './spider';
import * as FreeCell from './freecell';
import { saveGame, loadGame, getStats } from './storage';

export type VariantName = 'klondike' | 'spider' | 'freecell';
interface Variant<T> {
  newGame: () => T;
  autoMove: (state: T) => boolean;
  autoComplete?: (state: T) => void;
  canMoveToFoundation?: (card: any, foundation: any) => boolean;
  moveStack?: (from: any, fromIndex: number, to: any) => boolean;
}

const VARIANTS: Record<VariantName, Variant<any>> = {
  klondike: Klondike,
  spider: Spider,
  freecell: FreeCell,
};

export default function Solitaire() {
  const [variant, setVariant] = useState<VariantName>('klondike');
  const [state, setState] = useState<any>();
  const [stats, setStats] = useState({ wins: 0, losses: 0, streak: 0 });

  useEffect(() => {
    (async () => {
      const loaded = await loadGame<any>(variant);
      if (loaded) setState(loaded);
      else setState(VARIANTS[variant].newGame());
      setStats(await getStats(variant));
    })();
  }, [variant]);

  const onNewGame = () => {
    const s = VARIANTS[variant].newGame();
    setState(s);
    saveGame(variant, s);
  };

  const onAutoMove = () => {
    const s = { ...state };
    if (VARIANTS[variant].autoMove(s)) {
      setState({ ...s });
      saveGame(variant, s);
      if (checkWin(s)) celebrate();
    }
  };

  const checkWin = (s: any) =>
    s.foundations && s.foundations.every((p: any) => p.cards.length === 13);

  const celebrate = async () => {
    const confetti = (await import('canvas-confetti')).default;
    confetti({ particleCount: 100, spread: 70 });
  };

  const onAutoComplete = async () => {
    const s = { ...state };
    if (VARIANTS[variant].autoComplete) VARIANTS[variant].autoComplete(s);
    else while (VARIANTS[variant].autoMove(s));
    setState({ ...s });
    saveGame(variant, s);
    if (checkWin(s)) await celebrate();
  };

  const onCardDoubleClick = async (pileIndex: number) => {
    const s = { ...state };
    const pile = s.tableaus[pileIndex];
    const card = pile.cards[pile.cards.length - 1];
    if (card && VARIANTS[variant].canMoveToFoundation) {
      for (const f of s.foundations) {
        if (VARIANTS[variant].canMoveToFoundation(card, f)) {
          f.cards.push(card);
          pile.cards.pop();
          setState({ ...s });
          saveGame(variant, s);
          if (checkWin(s)) await celebrate();
          return;
        }
      }
    } else {
      onAutoMove();
    }
  };

  const onDragStart = (
    e: React.DragEvent,
    pileIndex: number,
    cardIndex: number
  ) => {
    e.dataTransfer.setData(
      'text/plain',
      JSON.stringify({ pileIndex, cardIndex })
    );
  };

  const onDropTableau = (e: React.DragEvent, destIndex: number) => {
    e.preventDefault();
    const data = JSON.parse(e.dataTransfer.getData('text/plain'));
    const s = { ...state };
    if (!VARIANTS[variant].moveStack) return;
    const moved = VARIANTS[variant].moveStack(
      s.tableaus[data.pileIndex],
      data.cardIndex,
      s.tableaus[destIndex]
    );
    if (moved) {
      setState({ ...s });
      saveGame(variant, s);
    }
  };

  const onDropFoundation = async (e: React.DragEvent, destIndex: number) => {
    e.preventDefault();
    const data = JSON.parse(e.dataTransfer.getData('text/plain'));
    const s = { ...state };
    if (!VARIANTS[variant].canMoveToFoundation) return;
    const fromPile = s.tableaus[data.pileIndex];
    const card = fromPile.cards[fromPile.cards.length - 1];
    const foundation = s.foundations[destIndex];
    if (data.cardIndex === fromPile.cards.length - 1 && card) {
      if (VARIANTS[variant].canMoveToFoundation(card, foundation)) {
        foundation.cards.push(card);
        fromPile.cards.pop();
        setState({ ...s });
        saveGame(variant, s);
        if (checkWin(s)) await celebrate();
      }
    }
  };

  const renderTableaus = () => {
    if (!state) return null;
    const piles = state.tableaus || [];
    return piles.map((p: any, i: number) => (
      <div
        key={i}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => onDropTableau(e, i)}
        className="border p-1 min-h-8"
      >
        {p.cards.map((card: any, j: number) => {
          const label = `${card.rank}${card.suit[0]}`;
          const isTop = j === p.cards.length - 1;
          return (
            <div
              key={j}
              draggable
              onDragStart={(e) => onDragStart(e, i, j)}
              onDoubleClick={isTop ? () => onCardDoubleClick(i) : undefined}
              className="p-1 w-12 text-center select-none"
            >
              {label}
            </div>
          );
        })}
      </div>
    ));
  };

  const renderFoundations = () => {
    if (!state) return null;
    const foundations = state.foundations || [];
    return foundations.map((p: any, i: number) => {
      const card = p.cards[p.cards.length - 1];
      const label = card ? `${card.rank}${card.suit[0]}` : 'empty';
      return (
        <div
          key={i}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => onDropFoundation(e, i)}
          className="border p-2 w-12 text-center"
        >
          {label}
        </div>
      );
    });
  };

  return (
    <div className="p-4">
      <h1 className="text-xl mb-2">Solitaire</h1>
      <div className="mb-2">
        <label htmlFor="variant">Variant:</label>
        <select
          id="variant"
          value={variant}
          onChange={(e) => setVariant(e.target.value as VariantName)}
          className="ml-2 border"
        >
          <option value="klondike">Klondike</option>
          <option value="spider">Spider</option>
          <option value="freecell">FreeCell</option>
        </select>
      </div>
      <div className="flex gap-2 mb-4">{renderFoundations()}</div>
      <div className="flex flex-wrap gap-2 mb-2">{renderTableaus()}</div>
      <div className="mb-2">
        <button className="mr-2 border px-2" onClick={onNewGame}>
          New Game
        </button>
        <button className="mr-2 border px-2" onClick={onAutoMove}>
          Auto Move
        </button>
        <button className="border px-2" onClick={onAutoComplete}>
          Auto Complete
        </button>
      </div>
      <div className="text-sm">
        Wins: {stats.wins} Losses: {stats.losses} Streak: {stats.streak}
      </div>
    </div>
  );
}
