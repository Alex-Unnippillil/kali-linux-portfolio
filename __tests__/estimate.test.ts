import { calculateRisk, priceRange } from '../apps/estimate';

describe('Estimator helpers', () => {
  test('price range is calculated', () => {
    expect(priceRange(50, 50)).toEqual([1575, 1925]);
  });

  test('risk is average of inputs', () => {
    expect(calculateRisk(80, 40)).toBe(60);
  });
});
