import { checkWinner, createEmptyBoard, getWinningCells, isBoardFull, type Cell } from '../../../games/connect-four/solver';
import type { MatchMode, MatchState, StatsState, Token } from './types';

export const opponentOf = (p: Token) => (p === 'red' ? 'yellow' : 'red');

export const cloneBoard = (board: Cell[][]) => board.map((row) => row.slice());

export const isMode = (v: unknown): v is 'cpu' | 'local' => v === 'cpu' || v === 'local';
export const isToken = (v: unknown): v is Token => v === 'red' || v === 'yellow';
export const isBool = (v: unknown): v is boolean => typeof v === 'boolean';
export const isMatchMode = (v: unknown): v is MatchMode => v === 'single' || v === 'best_of_3';
export const isMatchState = (v: unknown): v is MatchState =>
  Boolean(
    v &&
      typeof v === 'object' &&
      typeof (v as MatchState).red === 'number' &&
      typeof (v as MatchState).yellow === 'number' &&
      typeof (v as MatchState).draws === 'number' &&
      typeof (v as MatchState).games === 'number',
  );

export const isStatsState = (v: unknown): v is StatsState =>
  Boolean(v && typeof v === 'object' && (v as StatsState).cpu && (v as StatsState).local);

export const evaluateMoveOutcome = (board: Cell[][], token: Token) => {
  if (checkWinner(board, token)) {
    return {
      winner: token as Token | 'draw',
      winningCells: getWinningCells(board, token) ?? [],
    };
  }
  if (isBoardFull(board)) {
    return { winner: 'draw' as const, winningCells: [] };
  }
  return { winner: null, winningCells: [] };
};

export const makeInitialBoard = () => createEmptyBoard();
