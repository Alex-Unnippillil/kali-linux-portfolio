import { random } from '../rng';

export type Suit = '♠' | '♥' | '♦' | '♣';

export interface Card {
  suit: Suit;
  rank: number; // 1-13, Ace=1
  faceDown?: boolean;
}

export interface GameState {
  stock: Card[];
  waste: Card[];
  foundations: Record<Suit, Card[]>;
  tableau: Card[][];
  drawMode: 'draw1' | 'draw3';
  score: number;
  startTime: number;
  isWon: boolean;
}

const FOUNDATION_SCORE = 10;
const FLIP_BONUS = 5;

const suits: Suit[] = ['♠', '♥', '♦', '♣'];

export const createDeck = (): Card[] => {
  const deck: Card[] = [];
  suits.forEach((suit) => {
    for (let rank = 1; rank <= 13; rank += 1) {
      deck.push({ suit, rank });
    }
  });
  return deck;
};

const shuffle = (deck: Card[]) => {
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
};

export const initGame = (drawMode: 'draw1' | 'draw3' = 'draw1'): GameState => {
  const deck = createDeck();
  shuffle(deck);
  const tableau: Card[][] = [];
  for (let i = 0; i < 7; i += 1) {
    const pile: Card[] = [];
    for (let j = 0; j <= i; j += 1) {
      const card = deck.shift()!;
      if (j < i) card.faceDown = true;
      pile.push(card);
    }
    tableau.push(pile);
  }
  return {
    stock: deck.map((c) => ({ ...c, faceDown: true })),
    waste: [],
    foundations: {
      '♠': [],
      '♥': [],
      '♦': [],
      '♣': [],
    },
    tableau,
    drawMode,
    score: 0,
    startTime: Date.now(),
    isWon: false,
  };
};

export const setDrawMode = (state: GameState, mode: 'draw1' | 'draw3') => {
  if (state.drawMode === mode) return;
  state.drawMode = mode;
  state.stock = [...state.stock, ...state.waste.reverse()].map((c) => ({
    ...c,
    faceDown: true,
  }));
  state.waste = [];
};

export const toggleDrawMode = (state: GameState) =>
  setDrawMode(state, state.drawMode === 'draw1' ? 'draw3' : 'draw1');

export const draw = (state: GameState) => {
  if (state.stock.length === 0) {
    state.stock = state.waste.reverse().map((c) => ({ ...c, faceDown: true }));
    state.waste = [];
  }
  const count = Math.min(state.drawMode === 'draw1' ? 1 : 3, state.stock.length);
  for (let i = 0; i < count; i += 1) {
    const card = state.stock.shift()!;
    card.faceDown = false;
    state.waste.unshift(card);
  }
};

const cardColor = (suit: Suit) => (suit === '♥' || suit === '♦' ? 'red' : 'black');

export const canMoveToFoundation = (card: Card, foundation: Card[]) => {
  if (card.faceDown) return false;
  if (foundation.length === 0) return card.rank === 1;
  const top = foundation[foundation.length - 1];
  return top.suit === card.suit && top.rank + 1 === card.rank;
};

export const canMoveToTableau = (card: Card, pile: Card[]) => {
  if (card.faceDown) return false;
  if (pile.length === 0) return card.rank === 13;
  const top = pile[pile.length - 1];
  if (top.faceDown) return false;
  return cardColor(top.suit) !== cardColor(card.suit) && top.rank === card.rank + 1;
};

export const getAutoMoves = (state: GameState) => {
  const moves: { from: 'waste' | 'tableau'; fromIndex: number; card: Card }[] = [];
  const wasteTop = state.waste[0];
  if (wasteTop && canMoveToFoundation(wasteTop, state.foundations[wasteTop.suit])) {
    moves.push({ from: 'waste', fromIndex: 0, card: wasteTop });
  }
  state.tableau.forEach((pile, idx) => {
    const card = pile[pile.length - 1];
    if (card && canMoveToFoundation(card, state.foundations[card.suit])) {
      moves.push({ from: 'tableau', fromIndex: idx, card });
    }
  });
  return moves;
};

export const applyMoveToFoundation = (
  state: GameState,
  move: { from: 'waste' | 'tableau'; fromIndex: number; card: Card },
): boolean => {
  const foundation = state.foundations[move.card.suit];
  if (!canMoveToFoundation(move.card, foundation)) return false;

  if (move.from === 'waste') {
    state.waste.shift();
  } else {
    state.tableau[move.fromIndex].pop();
    const newTop = state.tableau[move.fromIndex][
      state.tableau[move.fromIndex].length - 1
    ];
    if (newTop && newTop.faceDown) {
      newTop.faceDown = false;
      state.score += FLIP_BONUS;
    }
  }
  foundation.push({ ...move.card, faceDown: false });
  state.score += FOUNDATION_SCORE;
  state.isWon = isVictory(state);
  return true;
};

export const autoMove = (state: GameState) => {
  let moved = false;
  let moves = getAutoMoves(state);
  while (moves.length) {
    const applied = applyMoveToFoundation(state, moves[0]);
    if (!applied) break;
    moved = true;
    moves = getAutoMoves(state);
  }
  state.isWon = isVictory(state);
  return moved;
};

export const getHint = (state: GameState): string | null => {
  if (state.isWon || isVictory(state)) {
    return 'You have already cleared all foundations.';
  }
  const auto = getAutoMoves(state);
  if (auto.length) {
    const m = auto[0];
    return `Move ${rankToString(m.card.rank)}${m.card.suit} to foundation`;
  }
  const wasteTop = state.waste[0];
  if (wasteTop) {
    for (let i = 0; i < state.tableau.length; i += 1) {
      if (canMoveToTableau(wasteTop, state.tableau[i])) {
        return `Move ${rankToString(wasteTop.rank)}${wasteTop.suit} to pile ${i + 1}`;
      }
    }
  }
  for (let i = 0; i < state.tableau.length; i += 1) {
    const card = state.tableau[i][state.tableau[i].length - 1];
    if (card) {
      for (let j = 0; j < state.tableau.length; j += 1) {
        if (i !== j && canMoveToTableau(card, state.tableau[j])) {
          return `Move ${rankToString(card.rank)}${card.suit} from pile ${i + 1} to pile ${j + 1}`;
        }
      }
    }
  }
  if (state.stock.length) {
    return 'Draw a card from the stock.';
  }
  if (state.waste.length) {
    return 'Recycle the waste pile into the stock by drawing.';
  }
  return null;
};

export const rankToString = (rank: number) => {
  const map = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  return map[rank - 1];
};

export const cardToString = (card: Card) => `${rankToString(card.rank)}${card.suit}`;

export const isVictory = (state: GameState) =>
  Object.values(state.foundations).every((pile) => pile.length === 13);

