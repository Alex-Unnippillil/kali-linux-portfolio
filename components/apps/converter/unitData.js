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
};

export const categories = Object.keys(unitMap).map((key) => ({
  value: key,
  label: key.charAt(0).toUpperCase() + key.slice(1),
}));

export const convertUnit = (category, from, to, amount, precision) => {
  const fromUnit = unitMap[category][from];
  const toUnit = unitMap[category][to];
  const result = math.unit(amount, fromUnit).toNumber(toUnit);
  return typeof precision === 'number' ? math.round(result, precision) : result;
};

