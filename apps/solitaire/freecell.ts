import { Card, createDeck, shuffle } from './cards';

export interface Pile { cards: Card[]; }
export interface GameState {
  cells: Pile[];
  foundations: Pile[];
  tableaus: Pile[];
}

export function newGame(): GameState {
  const deck = shuffle(createDeck());
  const tableaus: Pile[] = Array.from({ length: 8 }, () => ({ cards: [] }));
  for (let i = 0; deck.length; i = (i + 1) % 8) {
    const card = deck.shift();
    if (!card) break;
    tableaus[i].cards.push(card);
  }
  const cells: Pile[] = Array.from({ length: 4 }, () => ({ cards: [] }));
  const foundations: Pile[] = Array.from({ length: 4 }, () => ({ cards: [] }));
  return { cells, foundations, tableaus };
}

export function autoMove(state: GameState): boolean {
  for (const pile of state.tableaus) {
    const card = pile.cards[pile.cards.length - 1];
    if (card && card.rank === 'A') {
      state.foundations[0].cards.push(card);
      pile.cards.pop();
      return true;
    }
  }
  return false;
}
