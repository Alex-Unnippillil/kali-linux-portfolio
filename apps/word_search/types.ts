export interface Position {
  readonly row: number;
  readonly col: number;
}

export interface WordPlacement {
  readonly word: string;
  readonly positions: Position[];
}
