import usePersistentState from '../../hooks/usePersistentState';
import { Board, SIZE } from '../../apps/games/_2048/logic';

export type HistoryEntry = { board: Board; rng: string };

const emptyBoard = (): Board => Array.from({ length: SIZE }, () => Array(SIZE).fill(0));

export const UNDO_LIMIT = 5;

export interface GameState {
  board: Board;
  history: HistoryEntry[];
  undosLeft: number;
  skin: 'classic' | 'neon';
  best: number;
  won: boolean;
  lost: boolean;
  rng: string;
}

const initialState: GameState = {
  board: emptyBoard(),
  history: [],
  undosLeft: UNDO_LIMIT,
  skin: 'classic',
  best: 0,
  won: false,
  lost: false,
  rng: '',
};

const isBoard = (b: any): b is Board =>
  Array.isArray(b) && b.length === SIZE && b.every(row => Array.isArray(row) && row.length === SIZE && row.every(cell => typeof cell === 'number'));

const validate = (v: unknown): v is GameState => {
  if (typeof v !== 'object' || v === null) return false;
  const s = v as GameState;
  return (
    isBoard(s.board) &&
    Array.isArray(s.history) &&
    typeof s.undosLeft === 'number' &&
    (s.skin === 'classic' || s.skin === 'neon') &&
    typeof s.best === 'number' &&
    typeof s.won === 'boolean' &&
    typeof s.lost === 'boolean' &&
    typeof s.rng === 'string'
  );
};

export default function useGameState() {
  return usePersistentState<GameState>('game-2048-state', initialState, validate);
}

export { emptyBoard };
