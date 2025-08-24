import React, { useState, useEffect } from 'react';

const unitRates = {
  length: {
    meter: 1,
    kilometer: 1000,
    mile: 1609.34,
    foot: 0.3048,
  },
  weight: {
    gram: 1,
    kilogram: 1000,
    pound: 453.592,
    ounce: 28.3495,
  },
};

export const convertUnit = (category, from, to, amount) => {
  const base = amount * unitRates[category][from];
  return base / unitRates[category][to];
};

// Converter plugin for units. Accepts an optional onConvert callback to
// record conversions in a shared history list.
const UnitConverter = ({ onConvert }) => {
  const [category, setCategory] = useState('length');
  const [fromUnit, setFromUnit] = useState('meter');
  const [toUnit, setToUnit] = useState('kilometer');
  const [value, setValue] = useState('');
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const units = Object.keys(unitRates[category]);
    setFromUnit(units[0]);
    setToUnit(units[1] || units[0]);
  }, [category]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (value === '' || isNaN(parseFloat(value))) {
        setResult('');
        setError('Please enter a number, e.g., 42');
        return;
      }
      const converted = convertUnit(
        category,
        fromUnit,
        toUnit,
        parseFloat(value)
      );
      const formatted = converted.toFixed(4);
      setResult(formatted);
      setError('');
      if (onConvert) {
        onConvert(
          `${value} ${fromUnit} -> ${toUnit}`,
          `${formatted} ${toUnit}`
        );
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [value, fromUnit, toUnit, category, onConvert]);

  const units = Object.keys(unitRates[category]);

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
          type="number"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      </label>
      {error && <div className="text-red-400 text-sm">{error}</div>}
      <div className="grid grid-cols-2 gap-2">
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
      <div
        data-testid="unit-result"
        className="mt-2 flex items-center gap-2"
      >
        {result && (
          <>
            <span>{`${value} ${fromUnit} = ${result} ${toUnit}`}</span>
            <button
              onClick={() =>
                navigator.clipboard.writeText(`${result} ${toUnit}`)
              }
              className="bg-blue-600 text-white px-2 py-1 rounded"
            >
              Copy
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default UnitConverter;

