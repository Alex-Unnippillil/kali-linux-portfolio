import { convertUnit } from '../components/apps/converter/UnitConverter';

describe('Unit conversion', () => {
  it('converts meters to kilometers', () => {
    expect(convertUnit('distance', 'meter', 'kilometer', 1000)).toBeCloseTo(1);
  });

  it('converts kilograms to pounds', () => {
    expect(convertUnit('weight', 'kilogram', 'pound', 1)).toBeCloseTo(2.20462, 5);
  });

  it('converts Celsius to Fahrenheit', () => {
    expect(
      convertUnit('temperature', 'celsius', 'fahrenheit', 100)
    ).toBeCloseTo(212);
  });

  it('converts Fahrenheit to Kelvin', () => {
    expect(
      convertUnit('temperature', 'fahrenheit', 'kelvin', 32)
    ).toBeCloseTo(273.15, 2);
  });

  it('respects precision when provided', () => {
    expect(
      convertUnit('distance', 'meter', 'kilometer', 1234, 2)
    ).toBeCloseTo(1.23, 2);
  });
});
