export type Suit = '♠' | '♥' | '♦' | '♣';
export type Card = {
  suit: Suit;
  value: number;
  color: 'red' | 'black';
  faceUp: boolean;
};

export type GameState = {
  tableau: Card[][];
  stock: Card[];
  waste: Card[];
  foundations: Card[][];
  draw: 1 | 3;
  score: number;
  redeals: number; // remaining times waste can be recycled into stock
};

export type DragPayload = {
  source: 'tableau' | 'waste';
  pile: number;
  index: number;
};

export const suits: Suit[] = ['♠', '♥', '♦', '♣'];
const colors: Record<Suit, 'red' | 'black'> = {
  '♠': 'black',
  '♣': 'black',
  '♥': 'red',
  '♦': 'red',
};

const mulberry32 = (a: number) => {
  return () => {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const createDeck = (seed?: number): Card[] => {
  const deck: Card[] = [];
  suits.forEach((suit) => {
    for (let value = 1; value <= 13; value += 1) {
      deck.push({ suit, value, color: colors[suit], faceUp: false });
    }
  });
  // Shuffle using Fisher-Yates. Allow deterministic shuffles when a seed
  // is provided so that a "daily deal" can be reproduced on every load.
  const rand = seed !== undefined ? mulberry32(seed) : Math.random;
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
};

export const initializeGame = (
  draw: 1 | 3 = 1,
  deck?: Card[],
  seed?: number,
  passLimit: number = 3,
): GameState => {
  const workingDeck = deck || createDeck(seed);
  const tableau: Card[][] = Array.from({ length: 7 }, () => []);
  // Deal tableau
  for (let i = 0; i < 7; i += 1) {
    for (let j = 0; j <= i; j += 1) {
      const card = workingDeck.pop();
      if (!card) break;
      tableau[i].push(card);
    }
    const top = tableau[i][tableau[i].length - 1];
    if (top) top.faceUp = true;
  }

  return {
    tableau,
    stock: workingDeck,
    waste: [],
    foundations: Array.from({ length: 4 }, () => []),
    draw,
    score: 0,
    redeals: passLimit,
  };
};

// Draw cards from the stock pile. When the stock is empty the waste can be
// recycled back into the stock a limited number of times.  This function also
// respects the current draw mode (draw-1 or draw-3).
export const drawFromStock = (state: GameState): GameState => {
  // No cards left in the stock – try to recycle the waste pile.
  if (state.stock.length === 0) {
    // If the waste is empty or we have no redeals remaining nothing happens.
    if (state.waste.length === 0 || state.redeals === 0) return state;

    // Rebuild the stock by flipping the waste pile face down in reverse order.
    const recycled = state.waste
      .slice()
      .reverse()
      .map((c) => ({ ...c, faceUp: false }));

    return {
      ...state,
      stock: recycled,
      waste: [],
      redeals: state.redeals - 1,
      // Vegas scoring penalises redeals by 100 points.
      score: state.score - 100,
    };
  }

  // Determine how many cards to draw based on the selected mode.
  const count = Math.min(state.draw, state.stock.length);
  const remaining = state.stock.slice(0, state.stock.length - count);
  const drawn = state.stock
    .slice(-count)
    .map((c) => ({ ...c, faceUp: true }));

  return { ...state, stock: remaining, waste: [...state.waste, ...drawn] };
};

export const isValidTableauRun = (cards: Card[]): boolean => {
  if (!cards.length) return false;
  if (!cards.every((card) => card.faceUp)) return false;
  for (let i = 0; i < cards.length - 1; i += 1) {
    const current = cards[i];
    const next = cards[i + 1];
    if (current.value !== next.value + 1) return false;
    if (current.color === next.color) return false;
  }
  return true;
};

export const canPlaceOnTableau = (card: Card, dest: Card[]): boolean => {
  if (dest.length === 0) return card.value === 13;
  const top = dest[dest.length - 1];
  return top.faceUp && top.color !== card.color && top.value === card.value + 1;
};

export const canDropOnTableau = (
  state: GameState,
  drag: DragPayload,
  destIndex: number,
): boolean => {
  if (drag.source === 'tableau') {
    if (drag.pile === destIndex) return false;
    const pile = state.tableau[drag.pile];
    if (!pile || drag.index < 0 || drag.index >= pile.length) return false;
    const moving = pile.slice(drag.index);
    if (!isValidTableauRun(moving)) return false;
    return canPlaceOnTableau(moving[0], state.tableau[destIndex]);
  }
  const card = state.waste[state.waste.length - 1];
  if (!card) return false;
  return canPlaceOnTableau(card, state.tableau[destIndex]);
};

export const canDropOnFoundation = (
  state: GameState,
  drag: DragPayload,
  foundationIndex: number,
): boolean => {
  if (drag.source === 'tableau') {
    const pile = state.tableau[drag.pile];
    if (!pile || drag.index < 0 || drag.index >= pile.length) return false;
    if (drag.index !== pile.length - 1) return false;
    const card = pile[pile.length - 1];
    if (!card || !card.faceUp) return false;
    if (suits.indexOf(card.suit) !== foundationIndex) return false;
    const dest = state.foundations[foundationIndex];
    if (dest.length === 0) return card.value === 1;
    return dest[dest.length - 1].value + 1 === card.value;
  }
  const card = state.waste[state.waste.length - 1];
  if (!card) return false;
  if (suits.indexOf(card.suit) !== foundationIndex) return false;
  const dest = state.foundations[foundationIndex];
  if (dest.length === 0) return card.value === 1;
  return dest[dest.length - 1].value + 1 === card.value;
};

export const moveWasteToTableau = (state: GameState, destIndex: number): GameState => {
  if (state.waste.length === 0) return state;
  const card = state.waste[state.waste.length - 1];
  if (!canPlaceOnTableau(card, state.tableau[destIndex])) return state;
  const newWaste = state.waste.slice(0, -1);
  const newTableau = state.tableau.map((p, i) =>
    i === destIndex ? [...p, card] : p,
  );
  return { ...state, waste: newWaste, tableau: newTableau };
};

export const moveTableauToTableau = (
  state: GameState,
  from: number,
  cardIndex: number,
  to: number,
): GameState => {
  const pile = state.tableau[from];
  const moving = pile.slice(cardIndex);
  if (!isValidTableauRun(moving)) return state;
  if (!canPlaceOnTableau(moving[0], state.tableau[to])) return state;
  const newTableau = state.tableau.map((p, i) => {
    if (i === from) {
      const remaining = p.slice(0, cardIndex);
      if (remaining.length && !remaining[remaining.length - 1].faceUp) {
        remaining[remaining.length - 1] = {
          ...remaining[remaining.length - 1],
          faceUp: true,
        };
        return remaining;
      }
      return remaining;
    }
    if (i === to) return [...p, ...moving];
    return p;
  });
  const score = state.tableau[from].length - moving.length > 0 &&
    !state.tableau[from][state.tableau[from].length - moving.length - 1]?.faceUp
    ? state.score + 5
    : state.score;
  return { ...state, tableau: newTableau, score };
};

export const moveToFoundation = (
  state: GameState,
  source: 'waste' | 'tableau',
  fromIndex: number | null,
): GameState => {
  const foundations = state.foundations.map((p) => p.slice());
  let card: Card | undefined;
  if (source === 'waste') {
    card = state.waste[state.waste.length - 1];
    if (!card) return state;
    const dest = foundations[suits.indexOf(card.suit)];
    if (dest.length === 0 && card.value !== 1) return state;
    if (dest.length > 0 && dest[dest.length - 1].value + 1 !== card.value) return state;
    const newWaste = state.waste.slice(0, -1);
    dest.push(card);
    return { ...state, waste: newWaste, foundations, score: state.score + 10 };
  }
  const pile = state.tableau[fromIndex!];
  card = pile[pile.length - 1];
  if (!card || !card.faceUp) return state;
  const dest = foundations[suits.indexOf(card.suit)];
  if (dest.length === 0 && card.value !== 1) return state;
  if (dest.length > 0 && dest[dest.length - 1].value + 1 !== card.value) return state;
  const newTableau = state.tableau.map((p, i) => {
    if (i === fromIndex) {
      const remaining = p.slice(0, -1);
      if (remaining.length && !remaining[remaining.length - 1].faceUp) {
        remaining[remaining.length - 1] = {
          ...remaining[remaining.length - 1],
          faceUp: true,
        };
      }
      return remaining;
    }
    return p;
  });
  dest.push(card);
  return { ...state, tableau: newTableau, foundations, score: state.score + 10 };
};

export const autoMove = (
  state: GameState,
  source: 'waste' | 'tableau',
  index: number | null,
): GameState => {
  if (source === 'waste') {
    return moveToFoundation(state, 'waste', null);
  }
  return moveToFoundation(state, 'tableau', index);
};

// Automatically move any available cards to the foundations.  This repeats
// until no further moves are possible, effectively "finishing" a solved game.
export const autoComplete = (state: GameState): GameState => {
  let current = state;
  let previous: GameState;

  do {
    previous = current;

    // Waste cards take priority – try to move the top waste card first.
    const wasteFirst = moveToFoundation(previous, 'waste', null);
    if (wasteFirst !== previous) {
      current = wasteFirst;
      continue; // Skip tableau check to re-evaluate from new state
    }

    // Try each tableau pile in turn.
    for (let i = 0; i < previous.tableau.length; i += 1) {
      const next = moveToFoundation(previous, 'tableau', i);
      if (next !== previous) {
        current = next;
        break;
      }
    }
  } while (current !== previous);

  return current;
};

export const isWin = (state: GameState): boolean =>
  state.foundations.every((p) => p.length === 13);

export const valueToString = (value: number): string => {
  if (value === 1) return 'A';
  if (value === 11) return 'J';
  if (value === 12) return 'Q';
  if (value === 13) return 'K';
  return String(value);
};

export const findHint = (
  state: GameState,
): { source: 'waste' | 'tableau'; pile: number; index: number } | null => {
  if (state.waste.length) {
    const w = state.waste[state.waste.length - 1];
    const f = state.foundations[suits.indexOf(w.suit)];
    if (
      (f.length === 0 && w.value === 1) ||
      (f.length > 0 && f[f.length - 1].value + 1 === w.value)
    ) {
      return { source: 'waste', pile: -1, index: state.waste.length - 1 };
    }
    for (let i = 0; i < state.tableau.length; i += 1) {
      if (canPlaceOnTableau(w, state.tableau[i])) {
        return { source: 'waste', pile: -1, index: state.waste.length - 1 };
      }
    }
  }
  for (let i = 0; i < state.tableau.length; i += 1) {
    const pile = state.tableau[i];
    if (!pile.length) continue;
    const top = pile[pile.length - 1];
    if (!top.faceUp) continue;
    const f = state.foundations[suits.indexOf(top.suit)];
    if (
      (f.length === 0 && top.value === 1) ||
      (f.length > 0 && f[f.length - 1].value + 1 === top.value)
    ) {
      return { source: 'tableau', pile: i, index: pile.length - 1 };
    }
    for (let j = 0; j < state.tableau.length; j += 1) {
      if (i === j) continue;
      if (canPlaceOnTableau(top, state.tableau[j])) {
        return { source: 'tableau', pile: i, index: pile.length - 1 };
      }
    }
  }
  for (let i = 0; i < state.tableau.length; i += 1) {
    const pile = state.tableau[i];
    if (!pile.length) continue;
    for (let index = 0; index < pile.length; index += 1) {
      const moving = pile.slice(index);
      if (!isValidTableauRun(moving)) continue;
      for (let j = 0; j < state.tableau.length; j += 1) {
        if (i === j) continue;
        if (canPlaceOnTableau(moving[0], state.tableau[j])) {
          return { source: 'tableau', pile: i, index };
        }
      }
    }
  }
  return null;
};
