import { convertUnit } from '../components/apps/converter/UnitConverter';

describe('Unit conversion', () => {
  it('converts meters to kilometers', () => {
    expect(convertUnit('length', 'meter', 'kilometer', '1e3')).toBe(1);
  });

  it('respects precision when provided', () => {
    expect(convertUnit('length', 'meter', 'kilometer', 1234, 2)).toBe(1.23);
  });

  it('throws on invalid unit', () => {
    expect(() => convertUnit('length', 'meter', 'lightyear', 1)).toThrow();
  });
});
