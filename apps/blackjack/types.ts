export interface Card {
  suit: string;
  value: string;
}

export interface Hand {
  cards: Card[];
  bet: number;
  isFinished?: boolean;
}
