export type Color = "red" | "black";
export interface Piece {
  color: Color;
  king: boolean;
}
export type Board = (Piece | null)[][];
export declare const createBoard: () => Board;
export declare const inBounds: (r: number, c: number) => boolean;
export interface Move {
  from: [number, number];
  to: [number, number];
  captured?: [number, number];
}
export declare const cloneBoard: (board: Board) => Board;
export declare const getPieceMoves: (
  board: Board,
  r: number,
  c: number,
) => Move[];
export declare const getAllMoves: (board: Board, color: Color) => Move[];
export declare const hasMoves: (board: Board, color: Color) => boolean;
export declare const applyMove: (
  board: Board,
  move: Move,
) => {
  board: Board;
  capture: boolean;
  king: boolean;
};
export declare const boardToBitboards: (board: Board) => {
  red: bigint;
  black: bigint;
  kings: bigint;
};
export declare const bitCount: (n: bigint) => number;
export declare const evaluateBoard: (board: Board) => number;
export declare const isDraw: (noCaptureMoves: number) => boolean;
