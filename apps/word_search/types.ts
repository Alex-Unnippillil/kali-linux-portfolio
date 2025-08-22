export interface Position {
  row: number;
  col: number;
}

export interface WordPlacement {
  word: string;
  positions: Position[];
}
