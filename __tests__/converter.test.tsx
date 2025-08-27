import { convertUnit } from '../components/apps/converter/UnitConverter';

describe('Unit conversion', () => {
  it('converts meters to kilometers', () => {
    expect(convertUnit('length', 'meter', 'kilometer', 1000)).toBeCloseTo(1);
  });

  it('converts kilograms to pounds', () => {
    expect(convertUnit('weight', 'kilogram', 'pound', 1)).toBeCloseTo(2.20462, 5);
  });

  it('respects precision when provided', () => {
    expect(
      convertUnit('length', 'meter', 'kilometer', 1234, 2)
    ).toBeCloseTo(1.23, 2);
  });

  it('converts Celsius to Fahrenheit', () => {
    expect(convertUnit('temperature', 'celsius', 'fahrenheit', 0)).toBeCloseTo(32);
  });
});
