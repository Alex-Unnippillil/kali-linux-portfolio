import { Card, GameState, suits } from './engine';
import type { SolitaireSnapshot, Stats, Variant } from './types';

export const SNAPSHOT_VERSION = 1;

type RedealValue = number | 'unlimited';

interface PersistedGameState extends Omit<GameState, 'redeals'> {
  redeals: RedealValue;
}

export interface PersistedSolitaireSnapshot
  extends Omit<SolitaireSnapshot, 'game' | 'passLimit'> {
  passLimit: RedealValue;
  game: PersistedGameState;
}

const isVariant = (value: unknown): value is Variant =>
  value === 'klondike' || value === 'spider' || value === 'freecell';

const isRedealValue = (value: unknown): value is RedealValue =>
  value === 'unlimited' || (typeof value === 'number' && Number.isFinite(value) && value >= 0);

const isDrawMode = (value: unknown): value is 1 | 3 => value === 1 || value === 3;

const isSuit = (value: unknown): value is Card['suit'] =>
  typeof value === 'string' && (suits as readonly string[]).includes(value as Card['suit']);

const isColor = (value: unknown): value is Card['color'] =>
  value === 'red' || value === 'black';

const isCard = (value: unknown): value is Card => {
  if (!value || typeof value !== 'object') return false;
  const card = value as Record<string, unknown>;
  return (
    isSuit(card.suit) &&
    typeof card.value === 'number' &&
    Number.isInteger(card.value) &&
    card.value >= 1 &&
    card.value <= 13 &&
    typeof card.faceUp === 'boolean' &&
    isColor(card.color)
  );
};

const isCardArray = (value: unknown): value is Card[] =>
  Array.isArray(value) && value.every(isCard);

const isTableau = (value: unknown): value is Card[][] =>
  Array.isArray(value) && value.length === 7 && value.every(isCardArray);

const isFoundations = (value: unknown): value is Card[][] =>
  Array.isArray(value) && value.length === 4 && value.every(isCardArray);

const isStats = (value: unknown): value is Stats => {
  if (!value || typeof value !== 'object') return false;
  const stats = value as Record<string, unknown>;
  return (
    typeof stats.gamesPlayed === 'number' &&
    typeof stats.gamesWon === 'number' &&
    typeof stats.bestScore === 'number' &&
    typeof stats.bestTime === 'number' &&
    typeof stats.dailyStreak === 'number' &&
    (typeof stats.lastDaily === 'string' || stats.lastDaily === null)
  );
};

const isPersistedGameState = (value: unknown): value is PersistedGameState => {
  if (!value || typeof value !== 'object') return false;
  const state = value as Record<string, unknown>;
  return (
    isTableau(state.tableau) &&
    isCardArray(state.stock) &&
    isCardArray(state.waste) &&
    isFoundations(state.foundations) &&
    isDrawMode(state.draw) &&
    typeof state.score === 'number' &&
    isRedealValue(state.redeals)
  );
};

export const isPersistedSnapshot = (
  value: unknown,
): value is PersistedSolitaireSnapshot => {
  if (!value || typeof value !== 'object') return false;
  const snapshot = value as Record<string, unknown>;
  return (
    typeof snapshot.version === 'number' &&
    isVariant(snapshot.variant) &&
    isDrawMode(snapshot.drawMode) &&
    isRedealValue(snapshot.passLimit) &&
    isPersistedGameState(snapshot.game) &&
    typeof snapshot.moves === 'number' &&
    typeof snapshot.time === 'number' &&
    typeof snapshot.bankroll === 'number' &&
    isStats(snapshot.stats) &&
    typeof snapshot.isDaily === 'boolean' &&
    typeof snapshot.won === 'boolean' &&
    typeof snapshot.winnableOnly === 'boolean' &&
    typeof snapshot.timestamp === 'number'
  );
};

const cloneCard = (card: Card): Card => ({
  suit: card.suit,
  value: card.value,
  faceUp: Boolean(card.faceUp),
  color: card.suit === '♥' || card.suit === '♦' ? 'red' : 'black',
});

const clonePile = (pile: Card[]): Card[] => pile.map((card) => cloneCard(card));

const reviveGameState = (state: PersistedGameState): GameState => ({
  tableau: state.tableau.map((pile) => clonePile(pile)),
  stock: clonePile(state.stock),
  waste: clonePile(state.waste),
  foundations: state.foundations.map((pile) => clonePile(pile)),
  draw: state.draw,
  score: state.score,
  redeals: state.redeals === 'unlimited' ? Infinity : state.redeals,
});

export const reviveSnapshot = (value: unknown): SolitaireSnapshot | null => {
  if (!isPersistedSnapshot(value)) return null;
  if (value.version !== SNAPSHOT_VERSION) return null;

  const game = reviveGameState(value.game);
  const passLimit = value.passLimit === 'unlimited' ? Infinity : value.passLimit;

  return {
    version: value.version,
    variant: value.variant,
    drawMode: value.drawMode,
    passLimit,
    game,
    moves: value.moves,
    time: value.time,
    bankroll: value.bankroll,
    stats: {
      gamesPlayed: value.stats.gamesPlayed,
      gamesWon: value.stats.gamesWon,
      bestScore: value.stats.bestScore,
      bestTime: value.stats.bestTime,
      dailyStreak: value.stats.dailyStreak,
      lastDaily: value.stats.lastDaily ?? null,
    },
    isDaily: value.isDaily,
    won: value.won,
    winnableOnly: value.winnableOnly,
    timestamp: value.timestamp,
  };
};

const normalizePile = (pile: Card[]): Card[] => pile.map((card) => cloneCard(card));

export const prepareForStorage = (
  snapshot: SolitaireSnapshot,
): PersistedSolitaireSnapshot => ({
  ...snapshot,
  passLimit: snapshot.passLimit === Infinity ? 'unlimited' : snapshot.passLimit,
  game: {
    tableau: snapshot.game.tableau.map((pile) => normalizePile(pile)),
    stock: normalizePile(snapshot.game.stock),
    waste: normalizePile(snapshot.game.waste),
    foundations: snapshot.game.foundations.map((pile) => normalizePile(pile)),
    draw: snapshot.game.draw,
    score: snapshot.game.score,
    redeals: snapshot.game.redeals === Infinity ? 'unlimited' : snapshot.game.redeals,
  },
});
