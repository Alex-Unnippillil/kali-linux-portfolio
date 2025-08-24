import React, { useState, useEffect, useMemo } from 'react';
import Fuse from 'fuse.js';
import { unitRates, convertUnit } from './unitConversion';

// Converter plugin for units. Accepts an optional onConvert callback to
// record conversions in a shared history list.
const UnitConverter = ({ onConvert }) => {
  const [category, setCategory] = useState('length');
  const units = useMemo(
    () => Object.keys(unitRates[category]),
    [category]
  );
  const fuse = useMemo(() => new Fuse(units, { threshold: 0.4 }), [units]);
  const [fromUnit, setFromUnit] = useState(units[0]);
  const [toUnit, setToUnit] = useState(units[1] || units[0]);
  const [value, setValue] = useState('');
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setFromUnit(units[0]);
    setToUnit(units[1] || units[0]);
  }, [units]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (value === '' || isNaN(parseFloat(value))) {
        setResult('');
        setError('Please enter a number, e.g., 42');
        return;
      }
      const fromMatch = fuse.search(fromUnit)[0];
      const toMatch = fuse.search(toUnit)[0];
      if (!fromMatch || !toMatch) {
        setResult('');
        setError('Unknown unit. Try another.');
        return;
      }
      const converted = convertUnit(
        category,
        fromMatch.item,
        toMatch.item,
        parseFloat(value)
      );
      const formatted = converted.toString();
      setResult(formatted);
      setError('');
      if (onConvert) {
        onConvert(
          `${value} ${fromMatch.item} -> ${toMatch.item}`,
          `${formatted} ${toMatch.item}`
        );
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [value, fromUnit, toUnit, category, onConvert, fuse]);

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
          <option value="bytes">Bytes</option>
          <option value="time">Time</option>
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
          <input
            className="text-black p-1 rounded"
            list="units-list"
            value={fromUnit}
            onChange={(e) => setFromUnit(e.target.value)}
          />
        </label>
        <label className="flex flex-col">
          To
          <input
            className="text-black p-1 rounded"
            list="units-list"
            value={toUnit}
            onChange={(e) => setToUnit(e.target.value)}
          />
        </label>
      </div>
      <datalist id="units-list">
        {units.map((u) => (
          <option key={u} value={u} />
        ))}
      </datalist>
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

