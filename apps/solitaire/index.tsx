import React, { useEffect, useState } from 'react';
import * as Klondike from './klondike';
import * as Spider from './spider';
import * as FreeCell from './freecell';
import { saveGame, loadGame, getStats } from './storage';

export type VariantName = 'klondike' | 'spider' | 'freecell';
interface Variant<T> {
  newGame: () => T;
  autoMove: (state: T) => boolean;
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
    }
  };

  const onDoubleClick = () => onAutoMove();

  const renderTableaus = () => {
    if (!state) return null;
    const piles = state.tableaus || [];
    return piles.map((p: any, i: number) => {
      const card = p.cards[p.cards.length - 1];
      const label = card ? `${card.rank}${card.suit[0]}` : 'empty';
      return (
        <div key={i} onDoubleClick={onDoubleClick} className="border p-2 w-12 text-center">
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
      <div className="flex flex-wrap gap-2 mb-2">{renderTableaus()}</div>
      <div className="mb-2">
        <button className="mr-2 border px-2" onClick={onNewGame}>
          New Game
        </button>
        <button className="border px-2" onClick={onAutoMove}>
          Auto Move
        </button>
      </div>
      <div className="text-sm">
        Wins: {stats.wins} Losses: {stats.losses} Streak: {stats.streak}
      </div>
    </div>
  );
}
