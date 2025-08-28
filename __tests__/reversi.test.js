import { createBoard, computeLegalMoves, applyMove, evaluateBoard, } from '../components/apps/reversiLogic';
describe('Reversi rules', () => {
    test('generates legal moves correctly and flips pieces', () => {
        const board = createBoard();
        const moves = computeLegalMoves(board, 'B');
        expect(Object.keys(moves).sort()).toEqual(['2-3', '3-2', '4-5', '5-4']);
        const newBoard = applyMove(board, 2, 3, 'B', moves['2-3']);
        expect(newBoard[3][3]).toBe('B');
        expect(newBoard[2][3]).toBe('B');
    });
    test('requires pass when no moves available', () => {
        const board = Array.from({ length: 8 }, () => Array(8).fill('W'));
        board[0][1] = 'B';
        board[0][2] = null;
        const blackMoves = computeLegalMoves(board, 'B');
        const whiteMoves = computeLegalMoves(board, 'W');
        expect(Object.keys(blackMoves)).toHaveLength(0);
        expect(Object.keys(whiteMoves)).toHaveLength(1);
    });
    test('evaluation prefers corners', () => {
        const board = createBoard();
        board[0][0] = 'B';
        const withCorner = evaluateBoard(board, 'B');
        board[0][0] = 'W';
        const withoutCorner = evaluateBoard(board, 'B');
        expect(withCorner).toBeGreaterThan(withoutCorner);
    });
});
