import {
  attemptRotation,
  canMove,
  createEmptyBoard,
  createPiece,
  getRotationState,
} from '../../../games/tetris/srs';

describe('Super Rotation System', () => {
  it('applies JLSTZ wall kicks when obstructed', () => {
    const board = createEmptyBoard();
    board[0][5] = 'T';
    const piece = createPiece('J');
    const position = { x: 4, y: 0 };

    const result = attemptRotation(piece, board, position);

    expect(result).not.toBeNull();
    expect(result?.piece.rotation).toBe(1);
    expect(result?.position).toEqual({ x: 3, y: 1 });
    expect(
      canMove(board, result!.piece.shape, result!.position.x, result!.position.y),
    ).toBe(true);
  });

  it('uses I-piece kicks to slide over obstructions', () => {
    const board = createEmptyBoard();
    const spawn = { x: 3, y: 0 };
    const initial = createPiece('I');
    const firstRotation = attemptRotation(initial, board, spawn);

    expect(firstRotation).not.toBeNull();

    const verticalPiece = firstRotation!.piece;
    const verticalPos = firstRotation!.position;

    const obstructedBoard = createEmptyBoard();
    obstructedBoard[verticalPos.y + 2][verticalPos.x] = 'T';

    const result = attemptRotation(verticalPiece, obstructedBoard, verticalPos);

    expect(result).not.toBeNull();
    expect(result?.piece.rotation).toBe(2);
    expect(result?.position).toEqual({ x: verticalPos.x + 2, y: verticalPos.y });
    expect(
      canMove(
        obstructedBoard,
        result!.piece.shape,
        result!.position.x,
        result!.position.y,
      ),
    ).toBe(true);
  });

  it('fails rotation when every kick location is blocked', () => {
    const board = createEmptyBoard();
    const piece = createPiece('T');
    const position = { x: 4, y: 2 };
    const targetRotation = getRotationState('T', 1);
    const offsets = [
      [0, 0],
      [-1, 0],
      [-1, 1],
      [0, -2],
      [-1, -2],
    ];

    offsets.forEach(([dx, dy]) => {
      targetRotation.forEach((row, r) => {
        row.forEach((cell, c) => {
          if (!cell) return;
          const x = position.x + dx + c;
          const y = position.y + dy + r;
          if (y >= 0) {
            board[y][x] = 'Z';
          }
        });
      });
    });

    const result = attemptRotation(piece, board, position);

    expect(result).toBeNull();
  });
});
