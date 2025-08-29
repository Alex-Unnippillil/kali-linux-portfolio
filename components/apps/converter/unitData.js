import { create, all } from 'mathjs';

export const math = create(all);

export const unitMap = {
  length: {
    meter: 'm',
    kilometer: 'km',
    mile: 'mi',
    foot: 'ft',
  },
  mass: {
    gram: 'g',
    kilogram: 'kg',
    pound: 'lb',
    ounce: 'oz',
  },
  temperature: {
    celsius: 'degC',
    fahrenheit: 'degF',
    kelvin: 'K',
  },
  time: {
    second: 's',
    minute: 'min',
    hour: 'hour',
    day: 'day',
  },
  digital: {
    byte: 'B',
    kilobyte: 'kB',
    megabyte: 'MB',
    gigabyte: 'GB',
  },
  currency: {
    USD: 'USD',
    EUR: 'EUR',
    GBP: 'GBP',
    JPY: 'JPY',
  },
};

export const unitDetails = {
  length: {
    meter: { min: 0, max: 1e9, precision: 2 },
    kilometer: { min: 0, max: 1e7, precision: 4 },
    mile: { min: 0, max: 1e7, precision: 4 },
    foot: { min: 0, max: 1e9, precision: 2 },
  },
  mass: {
    gram: { min: 0, max: 1e9, precision: 2 },
    kilogram: { min: 0, max: 1e7, precision: 3 },
    pound: { min: 0, max: 1e8, precision: 3 },
    ounce: { min: 0, max: 1e9, precision: 2 },
  },
  temperature: {
    celsius: { min: -273.15, max: 1e6, precision: 1 },
    fahrenheit: { min: -459.67, max: 1e6, precision: 1 },
    kelvin: { min: 0, max: 1e6, precision: 1 },
  },
  time: {
    second: { min: 0, max: 1e9, precision: 2 },
    minute: { min: 0, max: 1e7, precision: 2 },
    hour: { min: 0, max: 1e6, precision: 2 },
    day: { min: 0, max: 1e5, precision: 2 },
  },
  digital: {
    byte: { min: 0, max: 1e15, precision: 0 },
    kilobyte: { min: 0, max: 1e12, precision: 2 },
    megabyte: { min: 0, max: 1e9, precision: 2 },
    gigabyte: { min: 0, max: 1e6, precision: 2 },
  },
  currency: {
    USD: { min: 0, max: 1e9, precision: 2 },
    EUR: { min: 0, max: 1e9, precision: 2 },
    GBP: { min: 0, max: 1e9, precision: 2 },
    JPY: { min: 0, max: 1e12, precision: 0 },
  },
};

export const categories = Object.keys(unitMap).map((key) => ({
  value: key,
  label: key.charAt(0).toUpperCase() + key.slice(1),
}));

const currencyRates = {
  USD: 1,
  EUR: 0.9,
  GBP: 0.8,
  JPY: 110,
};

export const convertUnit = (category, from, to, amount, precision) => {
  if (category === 'currency') {
    const result = amount * (currencyRates[to] / currencyRates[from]);
    return typeof precision === 'number' ? math.round(result, precision) : result;
  }
  const fromUnit = unitMap[category][from];
  const toUnit = unitMap[category][to];
  const result = math.unit(amount, fromUnit).toNumber(toUnit);
  return typeof precision === 'number' ? math.round(result, precision) : result;
};

