import React, { useState, useEffect } from 'react';
import { create, all } from 'mathjs';

const math = create(all);

const unitMap = {
  length: {
    meter: 'm',
    kilometer: 'km',
    mile: 'mi',
    foot: 'ft',
  },
  weight: {
    gram: 'g',
    kilogram: 'kg',
    pound: 'lb',
    ounce: 'oz',
  },
  temperature: {
    celsius: 'C',
    fahrenheit: 'F',
    kelvin: 'K',
  },
  base: {
    binary: 2,
    octal: 8,
    decimal: 10,
    hex: 16,
  },
  case: {
    lower: 'lower',
    upper: 'upper',
    title: 'title',
  },
  date: {
    millisecond: 1,
    second: 1000,
    minute: 60000,
    hour: 3600000,
    day: 86400000,
  },
};

export const convertUnit = (category, from, to, amount, precision) => {
  switch (category) {
    case 'length':
    case 'weight': {
      const fromUnit = unitMap[category][from];
      const toUnit = unitMap[category][to];
      if (!fromUnit || !toUnit) throw new Error('Invalid unit');
      const result = math.unit(amount, fromUnit).toNumber(toUnit);
      return typeof precision === 'number' ? math.round(result, precision) : result;
    }
    case 'temperature': {
      const fromUnit = unitMap.temperature[from];
      const toUnit = unitMap.temperature[to];
      if (!fromUnit || !toUnit) throw new Error('Invalid unit');
      let celsius;
      switch (from) {
        case 'celsius':
          celsius = amount;
          break;
        case 'fahrenheit':
          celsius = (amount - 32) * (5 / 9);
          break;
        case 'kelvin':
          celsius = amount - 273.15;
          break;
        default:
          throw new Error('Invalid unit');
      }
      let result;
      switch (to) {
        case 'celsius':
          result = celsius;
          break;
        case 'fahrenheit':
          result = celsius * (9 / 5) + 32;
          break;
        case 'kelvin':
          result = celsius + 273.15;
          break;
        default:
          throw new Error('Invalid unit');
      }
      return typeof precision === 'number' ? math.round(result, precision) : result;
    }
    case 'base': {
      const fromBase = unitMap.base[from];
      const toBase = unitMap.base[to];
      if (!fromBase || !toBase) throw new Error('Invalid unit');
      const dec = parseInt(String(amount), fromBase);
      if (isNaN(dec)) throw new Error('Invalid value');
      return dec.toString(toBase);
    }
    case 'case': {
      const str = String(amount);
      switch (to) {
        case 'upper':
          return str.toUpperCase();
        case 'lower':
          return str.toLowerCase();
        case 'title':
          return str
            .toLowerCase()
            .replace(/(^|\s)\S/g, (t) => t.toUpperCase());
        default:
          throw new Error('Invalid unit');
      }
    }
    case 'date': {
      const unit = unitMap.date[to];
      if (!unit) throw new Error('Invalid unit');
      const { start, end } = amount;
      const diff = new Date(end).getTime() - new Date(start).getTime();
      const result = diff / unit;
      return typeof precision === 'number' ? math.round(result, precision) : result;
    }
    case 'timezone': {
      const date = new Date(amount);
      const fromDate = new Date(date.toLocaleString('en-US', { timeZone: from }));
      const toDate = new Date(date.toLocaleString('en-US', { timeZone: to }));
      const diff = (toDate.getTime() - fromDate.getTime()) / 60000; // minutes
      return typeof precision === 'number' ? math.round(diff, precision) : diff;
    }
    default:
      throw new Error('Invalid category');
  }
};

const UnitConverter = () => {
  const [category, setCategory] = useState('length');
  const [fromUnit, setFromUnit] = useState('meter');
  const [toUnit, setToUnit] = useState('kilometer');
  const [value, setValue] = useState('');
  const [result, setResult] = useState('');
  const [precision, setPrecision] = useState(4);

  useEffect(() => {
    const units = Object.keys(unitMap[category]);
    setFromUnit(units[0]);
    setToUnit(units[1] || units[0]);
  }, [category]);

  useEffect(() => {
    if (value === '') {
      setResult('');
      return;
    }
    let num;
    try {
      num = math.evaluate(value);
    } catch {
      setResult('');
      return;
    }
    if (typeof num !== 'number' || isNaN(num)) {
      setResult('');
      return;
    }
    try {
      const converted = convertUnit(
        category,
        fromUnit,
        toUnit,
        num,
        precision
      );
      const formatted =
        typeof converted === 'number'
          ? math.format(converted, { notation: 'fixed', precision })
          : String(converted);
      setResult(formatted);
    } catch {
      setResult('');
    }
  }, [value, fromUnit, toUnit, category, precision]);

  const units = Object.keys(unitMap[category]);

  return (
    <div className="bg-gray-700 p-4 rounded flex flex-col gap-2">
      <h2 className="text-xl mb-2">Unit Converter</h2>
      <label className="flex flex-col">
        Category
        <select
          className="text-black p-1 rounded"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="length">Length</option>
          <option value="weight">Weight</option>
        </select>
      </label>
      <label className="flex flex-col">
        Value
        <input
          className="text-black p-1 rounded"
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      </label>
      <label className="flex flex-col">
        Precision
        <input
          className="text-black p-1 rounded"
          type="number"
          min="0"
          value={precision}
          onChange={(e) => setPrecision(Number(e.target.value))}
        />
      </label>
      <div className="grid grid-cols-2 gap-2 items-end">
        <label className="flex flex-col">
          From
          <select
            className="text-black p-1 rounded"
            value={fromUnit}
            onChange={(e) => setFromUnit(e.target.value)}
          >
            {units.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col">
          To
          <select
            className="text-black p-1 rounded"
            value={toUnit}
            onChange={(e) => setToUnit(e.target.value)}
          >
            {units.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </label>
      </div>
      <button
        data-testid="unit-swap"
        className="bg-gray-600 p-1 rounded"
        onClick={() => {
          setFromUnit(toUnit);
          setToUnit(fromUnit);
        }}
      >
        Swap
      </button>
      {result && (
        <div className="mt-2 flex items-center gap-2">
          <span data-testid="unit-result">
            {`${value} ${fromUnit} = ${result} ${toUnit}`}
          </span>
          <button
            data-testid="unit-copy"
            className="bg-gray-600 px-2 py-1 rounded"
            onClick={() =>
              navigator.clipboard?.writeText(
                `${result}`
              )
            }
          >
            Copy
          </button>
        </div>
      )}
    </div>
  );
};

export default UnitConverter;

