export type Suit = '♠' | '♥' | '♦' | '♣';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export type Card = { suit: Suit; rank: Rank };

export type Phase = 'BETTING' | 'DEALING' | 'PLAYER_TURN' | 'DEALER_TURN' | 'SETTLEMENT';
export type PlayerAction = 'HIT' | 'STAND' | 'DOUBLE' | 'SPLIT' | 'SURRENDER';

export type HandResult = 'win' | 'lose' | 'push';

export interface HandState {
  id: string;
  cards: Card[];
  bet: number;
  finished: boolean;
  doubled: boolean;
  surrendered: boolean;
  splitFromAces: boolean;
  canDraw: boolean;
  result?: HandResult;
  payout?: number;
}

export interface ShoeState {
  cards: Card[];
  dealt: number;
  shufflePoint: number;
  penetration: number;
  runningCount: number;
  decks: number;
}

export interface RoundLogEvent {
  id: string;
  message: string;
}

export interface RoundState {
  phase: Phase;
  bankroll: number;
  bet: number;
  repeatBet: number;
  insuranceBet: number;
  insuranceTaken: boolean;
  dealerHand: Card[];
  playerHands: HandState[];
  currentHandIndex: number;
  shoe: ShoeState;
  stats: {
    wins: number;
    losses: number;
    pushes: number;
    hands: number;
    streak: number;
    bestStreak: number;
  };
  eventLog: RoundLogEvent[];
  lastOutcome: string;
  warning?: string;
}

export interface GameConfig {
  decks: number;
  penetration: number;
  blackjackPayout: 1.5 | 1.2;
  dealerHitsSoft17: boolean;
  allowSurrender: boolean;
  allowDoubleAfterSplit: boolean;
  maxSplits: number;
  splitAcesOneCardOnly: boolean;
  minBet: number;
  maxHands: number;
  dealerPeek: boolean;
}

export interface PersistedBlackjackState {
  version: number;
  bankroll: number;
  bet: number;
  repeatBet: number;
  stats: RoundState['stats'];
  config: Partial<GameConfig>;
}
