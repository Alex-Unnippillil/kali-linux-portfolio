import { DEFAULT_ENGINE_CONFIG } from './constants';
import { ROTATIONS } from './pieces';
import { ActivePiece, Board, Cell, EngineConfig, PieceType } from './types';

export const getTotalRows = (config: EngineConfig): number =>
  config.visibleHeight + config.hiddenRows;

export const createBoard = (config: EngineConfig = DEFAULT_ENGINE_CONFIG): Board =>
  Array.from({ length: getTotalRows(config) }, () =>
    Array<Cell>(config.width).fill(null),
  );

export const forEachPieceCell = (
  piece: ActivePiece,
  cb: (x: number, y: number) => void,
) => {
  ROTATIONS[piece.type][piece.rotation].forEach((cell) => {
    cb(piece.x + cell.x, piece.y + cell.y);
  });
};

export const collides = (
  board: Board,
  piece: ActivePiece,
  config: EngineConfig = DEFAULT_ENGINE_CONFIG,
): boolean => {
  let blocked = false;
  forEachPieceCell(piece, (x, y) => {
    if (x < 0 || x >= config.width || y >= board.length) {
      blocked = true;
      return;
    }
    if (y >= 0 && board[y][x]) blocked = true;
  });
  return blocked;
};

export const mergePiece = (board: Board, piece: ActivePiece): Board => {
  const next = board.map((row) => [...row]);
  forEachPieceCell(piece, (x, y) => {
    if (y >= 0 && y < next.length && x >= 0 && x < next[0].length) {
      next[y][x] = piece.type;
    }
  });
  return next;
};

export const clearLines = (
  board: Board,
  config: EngineConfig = DEFAULT_ENGINE_CONFIG,
): { board: Board; linesCleared: number } => {
  const kept = board.filter((row) => row.some((cell) => !cell));
  const linesCleared = board.length - kept.length;
  while (kept.length < board.length) {
    kept.unshift(Array<Cell>(config.width).fill(null));
  }
  return { board: kept, linesCleared };
};

export const spawnPiece = (
  type: PieceType,
  config: EngineConfig = DEFAULT_ENGINE_CONFIG,
): ActivePiece => ({
  type,
  rotation: 0,
  x: Math.floor(config.width / 2) - 2,
  y: 0,
});

export const getGhostY = (
  board: Board,
  piece: ActivePiece,
  config: EngineConfig = DEFAULT_ENGINE_CONFIG,
): number => {
  let y = piece.y;
  while (!collides(board, { ...piece, y: y + 1 }, config)) {
    y += 1;
  }
  return y;
};
