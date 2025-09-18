import { clampPosition, computeMovementBounds } from '../utils/windowBounds';

describe('windowBounds helper', () => {
    it('clamps positions within the available desktop area', () => {
        const bounds = computeMovementBounds({ width: 500, height: 400 }, { width: 200, height: 150 });
        const result = clampPosition({ x: 420, y: -25 }, bounds);
        expect(result).toEqual({ x: 300, y: 0 });
    });

    it('handles containers smaller than the window gracefully', () => {
        const bounds = computeMovementBounds({ width: 100, height: 90 }, { width: 250, height: 200 });
        const result = clampPosition({ x: 10, y: 40 }, bounds);
        expect(bounds.right).toBe(0);
        expect(bounds.bottom).toBe(0);
        expect(result).toEqual({ x: 0, y: 0 });
    });
});
