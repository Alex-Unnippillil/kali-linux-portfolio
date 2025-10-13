import { create, all } from 'mathjs';

export const math = create(all);

export const unitCatalog = {
  length: {
    label: 'Length',
    units: {
      meter: { symbol: 'm', min: 0, max: 1e9, precision: 2 },
      kilometer: { symbol: 'km', min: 0, max: 1e7, precision: 4 },
      mile: { symbol: 'mi', min: 0, max: 1e7, precision: 4 },
      foot: { symbol: 'ft', min: 0, max: 1e9, precision: 2 },
    },
  },
  mass: {
    label: 'Mass',
    units: {
      gram: { symbol: 'g', min: 0, max: 1e9, precision: 2 },
      kilogram: { symbol: 'kg', min: 0, max: 1e7, precision: 3 },
      pound: { symbol: 'lb', min: 0, max: 1e8, precision: 3 },
      ounce: { symbol: 'oz', min: 0, max: 1e9, precision: 2 },
    },
  },
  temperature: {
    label: 'Temperature',
    units: {
      celsius: { symbol: 'degC', min: -273.15, max: 1e6, precision: 1 },
      fahrenheit: { symbol: 'degF', min: -459.67, max: 1e6, precision: 1 },
      kelvin: { symbol: 'K', min: 0, max: 1e6, precision: 1 },
    },
  },
  time: {
    label: 'Time',
    units: {
      second: { symbol: 's', min: 0, max: 1e9, precision: 2 },
      minute: { symbol: 'min', min: 0, max: 1e7, precision: 2 },
      hour: { symbol: 'hour', min: 0, max: 1e6, precision: 2 },
      day: { symbol: 'day', min: 0, max: 1e5, precision: 2 },
    },
  },
  digital: {
    label: 'Digital Storage',
    units: {
      byte: { symbol: 'B', min: 0, max: 1e15, precision: 0 },
      kilobyte: { symbol: 'kB', min: 0, max: 1e12, precision: 2 },
      megabyte: { symbol: 'MB', min: 0, max: 1e9, precision: 2 },
      gigabyte: { symbol: 'GB', min: 0, max: 1e6, precision: 2 },
    },
  },
  area: {
    label: 'Area',
    units: {
      'square meter': { symbol: 'm^2', min: 0, max: 1e12, precision: 2 },
      'square kilometer': { symbol: 'km^2', min: 0, max: 1e6, precision: 6 },
      'square foot': { symbol: 'ft^2', min: 0, max: 1e12, precision: 2 },
      'square mile': { symbol: 'mi^2', min: 0, max: 1e8, precision: 6 },
      acre: { symbol: 'acre', min: 0, max: 1e9, precision: 4 },
    },
  },
  volume: {
    label: 'Volume',
    units: {
      liter: { symbol: 'L', min: 0, max: 1e9, precision: 2 },
      milliliter: { symbol: 'ml', min: 0, max: 1e12, precision: 2 },
      'cubic meter': { symbol: 'm^3', min: 0, max: 1e6, precision: 6 },
      'cubic foot': { symbol: 'ft^3', min: 0, max: 1e9, precision: 4 },
      gallon: { symbol: 'gal', min: 0, max: 1e9, precision: 2 },
    },
  },
  currency: {
    label: 'Currency',
    units: {
      USD: { symbol: 'USD', min: 0, max: 1e9, precision: 2 },
      EUR: { symbol: 'EUR', min: 0, max: 1e9, precision: 2 },
      GBP: { symbol: 'GBP', min: 0, max: 1e9, precision: 2 },
      JPY: { symbol: 'JPY', min: 0, max: 1e12, precision: 0 },
    },
  },
};

export const categories = Object.entries(unitCatalog).map(([value, { label }]) => ({
  value,
  label,
}));

export const unitMap = Object.fromEntries(
  Object.entries(unitCatalog).map(([category, { units }]) => [
    category,
    Object.fromEntries(
      Object.entries(units).map(([unitName, { symbol }]) => [unitName, symbol]),
    ),
  ]),
);

export const unitDetails = Object.fromEntries(
  Object.entries(unitCatalog).map(([category, { units }]) => [
    category,
    Object.fromEntries(
      Object.entries(units).map(([unitName, { min, max, precision }]) => [
        unitName,
        { min, max, precision },
      ]),
    ),
  ]),
);

export const currencyRates = {
  USD: 1,
  EUR: 0.9,
  GBP: 0.8,
  JPY: 110,
};

export const getUnitDefinition = (category, unit) => unitCatalog[category]?.units?.[unit];

export const convertUnit = (category, from, to, amount, precision) => {
  if (category === 'currency') {
    const fromRate = currencyRates[from];
    const toRate = currencyRates[to];
    if (typeof fromRate !== 'number' || typeof toRate !== 'number') {
      throw new Error(`Unsupported currency conversion from ${from} to ${to}`);
    }
    const result = amount * (toRate / fromRate);
    return typeof precision === 'number' ? math.round(result, precision) : result;
  }
  const fromUnit = getUnitDefinition(category, from)?.symbol;
  const toUnit = getUnitDefinition(category, to)?.symbol;
  if (!fromUnit || !toUnit) {
    throw new Error(`Unsupported conversion from ${from} to ${to} in ${category}`);
  }
  const result = math.unit(amount, fromUnit).toNumber(toUnit);
  return typeof precision === 'number' ? math.round(result, precision) : result;
};

export const listUnits = (category) => Object.keys(unitCatalog[category]?.units || {});

export const getDefaultPrecision = (category, unit) =>
  getUnitDefinition(category, unit)?.precision ?? 2;

export const isValueWithinRange = (category, unit, value) => {
  const definition = getUnitDefinition(category, unit);
  if (!definition) return false;
  const { min, max } = definition;
  return value >= min && value <= max;
};
