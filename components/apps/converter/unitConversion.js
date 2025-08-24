import Big from 'big.js';

export const unitRates = {
  length: {
    meter: '1',
    kilometer: '1000',
    mile: '1609.34',
    foot: '0.3048',
  },
  weight: {
    gram: '1',
    kilogram: '1000',
    pound: '453.592',
    ounce: '28.3495',
  },
  bytes: {
    bit: '0.125',
    byte: '1',
    kilobyte: '1024',
    megabyte: '1048576',
    gigabyte: '1073741824',
  },
  time: {
    second: '1',
    minute: '60',
    hour: '3600',
    day: '86400',
  },
};

export const convertUnit = (category, from, to, amount) => {
  const base = new Big(amount).times(unitRates[category][from]);
  return base.div(unitRates[category][to]);
};
