import { Card, createDeck, shuffle } from './cards';

export interface Pile { cards: Card[]; }
export interface GameState {
  stock: Pile;
  tableaus: Pile[];
}

export function newGame(): GameState {
  const deck = shuffle(createDeck(2));
  const tableaus: Pile[] = Array.from({ length: 10 }, () => ({ cards: [] }));
  for (let i = 0; i < 54; i += 1) {
    tableaus[i % 10].cards.push(deck.shift() as Card);
  }
  const stock: Pile = { cards: deck };
  return { stock, tableaus };
}

export function autoMove(state: GameState): boolean {
  for (const pile of state.tableaus) {
    const card = pile.cards[pile.cards.length - 1];
    if (card && card.rank === 'K') {
      pile.cards.pop();
      return true;
    }
  }
  return false;
}
