import { Card, createDeck, shuffle } from './cards';

export interface Pile { cards: Card[]; }
export interface GameState {
  stock: Pile;
  waste: Pile;
  foundations: Pile[];
  tableaus: Pile[];
}

export function newGame(): GameState {
  const deck = shuffle(createDeck());
  const tableaus: Pile[] = Array.from({ length: 7 }, (_, i) => ({
    cards: deck.splice(0, i + 1),
  }));
  const stock: Pile = { cards: deck };
  const waste: Pile = { cards: [] };
  const foundations: Pile[] = Array.from({ length: 4 }, () => ({ cards: [] }));
  return { stock, waste, foundations, tableaus };
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
