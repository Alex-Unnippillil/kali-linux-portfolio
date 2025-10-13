import {
  categories,
  convertUnit,
  getDefaultPrecision,
  getUnitDefinition,
  isValueWithinRange,
  listUnits,
  unitCatalog,
} from '../../components/apps/converter/units';

describe('unit catalog metadata', () => {
  it('provides a label and unit definitions for every category', () => {
    for (const { value, label } of categories) {
      expect(label).toBeTruthy();
      const units = unitCatalog[value]?.units;
      expect(units).toBeTruthy();
      for (const [name, def] of Object.entries(units ?? {})) {
        expect(def.symbol).toBeTruthy();
        expect(typeof def.min).toBe('number');
        expect(typeof def.max).toBe('number');
        expect(typeof def.precision).toBe('number');
        expect(listUnits(value)).toContain(name);
      }
    }
  });

  it('respects declared ranges when validating values', () => {
    expect(isValueWithinRange('length', 'meter', -1)).toBe(false);
    expect(isValueWithinRange('length', 'meter', 10)).toBe(true);
    expect(isValueWithinRange('temperature', 'celsius', -300)).toBe(false);
    expect(isValueWithinRange('temperature', 'kelvin', 0)).toBe(true);
  });
});

describe('unit conversions', () => {
  it.each([
    ['length', 'meter', 'kilometer', 1234, 1.234],
    ['mass', 'kilogram', 'pound', 5, 11.0231],
    ['temperature', 'celsius', 'fahrenheit', 0, 32],
    ['time', 'second', 'hour', 3600, 1],
    ['digital', 'gigabyte', 'megabyte', 2, 2000],
    ['area', 'square mile', 'acre', 1, 639.9994],
    ['volume', 'gallon', 'liter', 1, 3.78541],
    ['currency', 'USD', 'EUR', 10, 9],
  ])(
    '%s conversion from %s to %s',
    (category, from, to, input, expected) => {
      const result = convertUnit(category, from, to, input);
      expect(result).toBeCloseTo(expected, 4);
    },
  );

  it('rounds using category defaults when precision is provided', () => {
    const precision = getDefaultPrecision('length', 'kilometer');
    expect(convertUnit('length', 'meter', 'kilometer', 1234, precision)).toBeCloseTo(
      1.234,
      precision,
    );
  });

  it('throws when attempting to convert using unknown units', () => {
    expect(() => convertUnit('length', 'meter', 'parsec', 1)).toThrow(
      /Unsupported conversion/i,
    );
  });
});

describe('unit definition helpers', () => {
  it('exposes metadata for known units', () => {
    const meter = getUnitDefinition('length', 'meter');
    expect(meter).toMatchObject({ symbol: 'm', precision: expect.any(Number) });
    expect(getDefaultPrecision('length', 'meter')).toBe(meter?.precision);
  });

  it('returns undefined metadata for unknown units', () => {
    expect(getUnitDefinition('length', 'parsec')).toBeUndefined();
    expect(listUnits('unknown-category')).toEqual([]);
  });
});
