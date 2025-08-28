import { GameState } from '../apps/phaser_matter/gameLogic';
import level from '../public/apps/phaser_matter/level1.json';
describe('phaser matter platformer', () => {
    test('falling off map resets to spawn', () => {
        const gs = new GameState({ x: 10, y: 20 });
        const pos = gs.respawnIfOutOfBounds({ x: 5, y: 2000 }, 1000);
        expect(pos).toEqual({ x: 10, y: 20 });
    });
    test('checkpoint respawn overrides spawn', () => {
        const gs = new GameState({ x: 10, y: 20 });
        gs.setCheckpoint({ x: 100, y: 200 });
        const pos = gs.respawnIfOutOfBounds({ x: 5, y: 2000 }, 1000);
        expect(pos).toEqual({ x: 100, y: 200 });
    });
    test('level data defines parallax layers', () => {
        expect(Array.isArray(level.parallaxLayers)).toBe(true);
        expect(level.parallaxLayers.length).toBeGreaterThan(0);
    });
    test('level data defines checkpoints', () => {
        expect(Array.isArray(level.checkpoints)).toBe(true);
        expect(level.checkpoints.length).toBeGreaterThan(0);
    });
});
