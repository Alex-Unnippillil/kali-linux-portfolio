import { slide, moveLeft, addRandomTile } from '../apps/games/_2048/logic';
import { reset, serialize } from '../apps/games/rng';
describe('2048 logic', () => {
    it('slides and merges', () => {
        expect(slide([2, 0, 2, 0])).toEqual([4, 0, 0, 0]);
        expect(slide([2, 2, 2, 0])).toEqual([4, 2, 0, 0]);
    });
    it('moves left across the board', () => {
        const board = [
            [2, 0, 2, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
        ];
        expect(moveLeft(board)).toEqual([
            [4, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
        ]);
    });
    it('uses seeded RNG for random tiles', () => {
        const board = Array.from({ length: 4 }, () => Array(4).fill(0));
        reset('test');
        addRandomTile(board);
        const state1 = serialize();
        const board1 = board.map((row) => [...row]);
        reset('test');
        const board2 = Array.from({ length: 4 }, () => Array(4).fill(0));
        addRandomTile(board2);
        expect(board2).toEqual(board1);
        expect(serialize()).toBe(state1);
    });
});
