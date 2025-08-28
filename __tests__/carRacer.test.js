import { getMedal } from '../components/apps/car-racer';
describe('car racer medals', () => {
    test('awards medals based on score', () => {
        expect(getMedal(0)).toBeNull();
        expect(getMedal(600)).toBe('bronze');
        expect(getMedal(1100)).toBe('silver');
        expect(getMedal(1600)).toBe('gold');
    });
});
