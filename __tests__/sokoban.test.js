import { defaultLevels } from '../apps/sokoban/levels';
import { loadLevel, move, undo, isSolved, findHint, wouldDeadlock } from '../apps/sokoban/engine';
describe('sokoban engine', () => {
    test('simple level solvable', () => {
        const state = loadLevel(defaultLevels[0]);
        const moved = move(state, 'ArrowRight');
        expect(isSolved(moved)).toBe(true);
    });
    test('undo restores previous state', () => {
        const state = loadLevel(defaultLevels[0]);
        const moved = move(state, 'ArrowRight');
        const undone = undo(moved);
        expect(undone.player).toEqual(state.player);
        expect(Array.from(undone.boxes)).toEqual(Array.from(state.boxes));
        expect(undone.pushes).toBe(state.pushes);
    });
    test('detects corner deadlock', () => {
        const level = ['#####', '#@$##', '# . #', '#####'];
        const state = loadLevel(level);
        expect(state.deadlocks.size).toBe(1);
    });
    test('solver hint gives first move', () => {
        const state = loadLevel(defaultLevels[0]);
        const hint = findHint(state);
        expect(hint).toBe('ArrowRight');
    });
    test('preflight corner deadlock', () => {
        const level = ['#####', '#@$ #', '#  ##', '#####'];
        const state = loadLevel(level);
        expect(wouldDeadlock(state, 'ArrowRight')).toBe(true);
    });
    test('preflight edge deadlock', () => {
        const level = ['#####', '#   #', '# $ #', '# @ #', '#####'];
        const state = loadLevel(level);
        expect(wouldDeadlock(state, 'ArrowUp')).toBe(true);
    });
});
