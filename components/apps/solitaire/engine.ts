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
};

export const suits: Suit[] = ['♠', '♥', '♦', '♣'];
const colors: Record<Suit, 'red' | 'black'> = {
  '♠': 'black',
  '♣': 'black',
  '♥': 'red',
  '♦': 'red',
};

export const createDeck = (): Card[] => {
  const deck: Card[] = [];
  suits.forEach((suit) => {
    for (let value = 1; value <= 13; value += 1) {
      deck.push({ suit, value, color: colors[suit], faceUp: false });
    }
  });
  // Shuffle using Fisher-Yates
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
};

export const initializeGame = (draw: 1 | 3 = 1, deck: Card[] = createDeck()): GameState => {
  const tableau: Card[][] = Array.from({ length: 7 }, () => []);
  // Deal tableau
  for (let i = 0; i < 7; i += 1) {
    for (let j = 0; j <= i; j += 1) {
      const card = deck.pop();
      if (!card) break;
      tableau[i].push(card);
    }
    const top = tableau[i][tableau[i].length - 1];
    if (top) top.faceUp = true;
  }

  return {
    tableau,
    stock: deck,
    waste: [],
    foundations: Array.from({ length: 4 }, () => []),
    draw,
    score: 0,
  };
};

export const drawFromStock = (state: GameState): GameState => {
  if (state.stock.length === 0) {
    if (state.waste.length === 0) return state;
    const newStock = state.waste
      .slice()
      .reverse()
      .map((c) => ({ ...c, faceUp: false }));
    return { ...state, stock: newStock, waste: [], score: state.score - 100 };
  }
  const drawCount = Math.min(state.draw, state.stock.length);
  const newStock = state.stock.slice(0, state.stock.length - drawCount);
  const drawn = state.stock.slice(-drawCount).map((c) => ({ ...c, faceUp: true }));
  return { ...state, stock: newStock, waste: [...state.waste, ...drawn] };
};

const canPlaceOnTableau = (card: Card, dest: Card[]): boolean => {
  if (dest.length === 0) return card.value === 13;
  const top = dest[dest.length - 1];
  return top.faceUp && top.color !== card.color && top.value === card.value + 1;
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
  if (moving.length === 0 || !moving[0].faceUp) return state;
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

export const valueToString = (value: number): string => {
  if (value === 1) return 'A';
  if (value === 11) return 'J';
  if (value === 12) return 'Q';
  if (value === 13) return 'K';
  return String(value);
};
