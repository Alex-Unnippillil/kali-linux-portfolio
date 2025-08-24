import { Card, createDeck, shuffle } from './cards';

const RANKS: Card['rank'][] = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];

function rankIndex(rank: Card['rank']): number {
  return RANKS.indexOf(rank);
}

function isRed(card: Card): boolean {
  return card.suit === 'hearts' || card.suit === 'diamonds';
}

function isOppositeColor(a: Card, b: Card): boolean {
  return isRed(a) !== isRed(b);
}

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
  // Try moving from waste to foundation first
  const wasteCard = state.waste.cards[state.waste.cards.length - 1];
  if (wasteCard) {
    for (const f of state.foundations) {
      if (canMoveToFoundation(wasteCard, f)) {
        f.cards.push(wasteCard);
        state.waste.cards.pop();
        return true;
      }
    }
  }

  // Then try from tableau to foundation
  for (const pile of state.tableaus) {
    const card = pile.cards[pile.cards.length - 1];
    if (!card) continue;
    for (const f of state.foundations) {
      if (canMoveToFoundation(card, f)) {
        f.cards.push(card);
        pile.cards.pop();
        return true;
      }
    }
  }

  return false;
}

export function autoComplete(state: GameState) {
  let moved = false;
  do {
    moved = autoMove(state);
  } while (moved);
}

export function canMoveToFoundation(card: Card, foundation: Pile): boolean {
  const top = foundation.cards[foundation.cards.length - 1];
  if (!top) return card.rank === 'A';
  return card.suit === top.suit && rankIndex(card.rank) === rankIndex(top.rank) + 1;
}

export function canPlaceOnTableau(card: Card, dest?: Card): boolean {
  if (!dest) return card.rank === 'K';
  return isOppositeColor(card, dest) && rankIndex(card.rank) === rankIndex(dest.rank) - 1;
}

export function moveStack(
  from: Pile,
  fromIndex: number,
  to: Pile
): boolean {
  const moving = from.cards.slice(fromIndex);
  if (moving.length === 0) return false;

  // Validate moving sequence
  for (let i = 0; i < moving.length - 1; i += 1) {
    if (!canPlaceOnTableau(moving[i], moving[i + 1])) return false;
  }

  const destTop = to.cards[to.cards.length - 1];
  if (!canPlaceOnTableau(moving[0], destTop)) return false;

  to.cards.push(...moving);
  from.cards.splice(fromIndex);
  return true;
}
