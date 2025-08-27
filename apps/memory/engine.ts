import { createDeck } from '../../components/apps/memory_utils';

export interface Card {
  id: number;
  value: string;
}

export interface GameState {
  size: number;
  cards: Card[];
  flipped: number[];
  matched: Set<number>;
  moves: number;
  time: number;
}

export function createGame(size: number): GameState {
  return {
    size,
    cards: createDeck(size),
    flipped: [],
    matched: new Set(),
    moves: 0,
    time: 0,
  };
}

export function flipCard(state: GameState, index: number): GameState {
  if (state.flipped.includes(index) || state.matched.has(index)) {
    return state;
  }
  const newState: GameState = {
    ...state,
    flipped: [...state.flipped],
    matched: new Set(state.matched),
    moves: state.moves,
    time: state.time,
  };

  if (newState.flipped.length === 0) {
    newState.flipped.push(index);
  } else if (newState.flipped.length === 1) {
    const first = newState.flipped[0];
    const second = index;
    newState.flipped.push(second);
    newState.moves += 1;
    if (newState.cards[first].value === newState.cards[second].value) {
      newState.matched.add(first);
      newState.matched.add(second);
    }
    newState.flipped = [];
  }
  return newState;
}

export function tick(state: GameState): GameState {
  return { ...state, time: state.time + 1 };
}

export function saveGame(state: GameState): string {
  const data = {
    size: state.size,
    cards: state.cards,
    flipped: state.flipped,
    matched: Array.from(state.matched),
    moves: state.moves,
    time: state.time,
  };
  return JSON.stringify(data);
}

export function loadGame(serialized: string): GameState {
  const data = JSON.parse(serialized);
  return {
    size: data.size,
    cards: data.cards,
    flipped: data.flipped || [],
    matched: new Set<number>(data.matched || []),
    moves: data.moves || 0,
    time: data.time || 0,
  };
}
