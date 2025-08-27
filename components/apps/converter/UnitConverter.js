import React, { useState, useEffect } from 'react';
import { create, all } from 'mathjs';
import { unitMap } from './units';

const math = create(all);

export const convertUnit = (category, from, to, amount, precision) => {
  const fromUnit = unitMap[category][from];
  const toUnit = unitMap[category][to];
  const result = math.unit(amount, fromUnit).toNumber(toUnit);
  return typeof precision === 'number' ? math.round(result, precision) : result;
};

const UnitConverter = () => {
  const categories = Object.keys(unitMap);
  const [category, setCategory] = useState(categories[0]);
  const [fromUnit, setFromUnit] = useState('');
  const [toUnit, setToUnit] = useState('');
  const [value, setValue] = useState('');
  const [result, setResult] = useState('');
  const [precision, setPrecision] = useState(4);

  useEffect(() => {
    const units = Object.keys(unitMap[category]);
    setFromUnit(units[0]);
    setToUnit(units[1] || units[0]);
  }, [category]);

  useEffect(() => {
    if (value === '' || isNaN(parseFloat(value))) {
      setResult('');
      return;
    }
    const converted = convertUnit(
      category,
      fromUnit,
      toUnit,
      parseFloat(value),
      precision
    );
    setResult(
      math.format(converted, { notation: 'fixed', precision })
    );
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
          {categories.map((c) => (
            <option key={c} value={c}>
              {c.charAt(0).toUpperCase() + c.slice(1)}
            </option>
          ))}
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
      <div data-testid="unit-result" className="mt-2">
        {result && `${value} ${fromUnit} = ${result} ${toUnit}`}
      </div>
    </div>
  );
};

export default UnitConverter;
