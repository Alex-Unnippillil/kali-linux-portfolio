import React, { useState, useEffect, useCallback } from 'react';
import { unitMap, unitDetails, convertUnit } from './unitData';

const TemperatureConverter = () => {
  const category = 'temperature';
  const units = Object.keys(unitMap[category]);
  const [fromUnit, setFromUnit] = useState(units[0]);
  const [toUnit, setToUnit] = useState(units[1]);
  const [leftVal, setLeftVal] = useState('');
  const [rightVal, setRightVal] = useState('');
  const [error, setError] = useState('');

  const withinRange = (unit, val) => {
    const { min, max } = unitDetails[category][unit];
    return val >= min && val <= max;
  };

  const convertLeftToRight = useCallback((val) => {
    if (val === '' || isNaN(parseFloat(val))) {
      setRightVal('');
      setError('');
      return;
    }
    const num = parseFloat(val);
    if (!withinRange(fromUnit, num)) {
      setError(`Value out of range for ${fromUnit}`);
      setRightVal('');
      return;
    }
    const converted = convertUnit(category, fromUnit, toUnit, num);
    const precision = unitDetails[category][toUnit].precision;
    setRightVal(Number(converted.toFixed(precision)).toString());
    setError('');
  }, [fromUnit, toUnit]);

  const convertRightToLeft = useCallback((val) => {
    if (val === '' || isNaN(parseFloat(val))) {
      setLeftVal('');
      setError('');
      return;
    }
    const num = parseFloat(val);
    if (!withinRange(toUnit, num)) {
      setError(`Value out of range for ${toUnit}`);
      setLeftVal('');
      return;
    }
    const converted = convertUnit(category, toUnit, fromUnit, num);
    const precision = unitDetails[category][fromUnit].precision;
    setLeftVal(Number(converted.toFixed(precision)).toString());
    setError('');
  }, [fromUnit, toUnit]);

  const handleLeftChange = (e) => {
    const val = e.target.value;
    setLeftVal(val);
    convertLeftToRight(val);
  };

  const handleRightChange = (e) => {
    const val = e.target.value;
    setRightVal(val);
    convertRightToLeft(val);
  };

  useEffect(() => {
    if (leftVal !== '') {
      convertLeftToRight(leftVal);
    } else if (rightVal !== '') {
      convertRightToLeft(rightVal);
    }
  }, [fromUnit, toUnit, leftVal, rightVal, convertLeftToRight, convertRightToLeft]);

  const swapUnits = () => {
    setFromUnit(toUnit);
    setToUnit(fromUnit);
    setLeftVal(rightVal);
    setRightVal(leftVal);
    setError('');
  };

  const format = (value, unit) =>
    new Intl.NumberFormat(undefined, {
      style: 'unit',
      unit,
      maximumFractionDigits: unitDetails[category][unit].precision,
    }).format(Number(value));

  return (
    <div className="bg-gray-700 text-white p-4 rounded flex flex-col gap-2">
      <h2 className="text-xl mb-2">Temperature Converter</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
        <div className="flex flex-col">
          <label className="flex flex-col">
            Value
            <input
              className="text-black p-1 rounded"
              type="number"
              value={leftVal}
              onChange={handleLeftChange}
              aria-label={`Value in ${fromUnit}`}
            />
          </label>
          <label className="flex flex-col mt-2">
            From
            <select
              className="text-black p-1 rounded"
              value={fromUnit}
              onChange={(e) => setFromUnit(e.target.value)}
            >
              {units.map((u) => (
                <option key={u} value={u} aria-label={`${u} (${unitMap[category][u]})`}>
                  {u}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex flex-col">
          <label className="flex flex-col">
            Value
            <input
              className="text-black p-1 rounded"
              type="number"
              value={rightVal}
              onChange={handleRightChange}
              aria-label={`Value in ${toUnit}`}
            />
          </label>
          <label className="flex flex-col mt-2">
            To
            <select
              className="text-black p-1 rounded"
              value={toUnit}
              onChange={(e) => setToUnit(e.target.value)}
            >
              {units.map((u) => (
                <option key={u} value={u} aria-label={`${u} (${unitMap[category][u]})`}>
                  {u}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
      <div className="flex justify-center mt-2">
        <button
          onClick={swapUnits}
          aria-label="Swap units"
          className="bg-gray-600 px-2 py-1 rounded"
        >
          Swap Units
        </button>
      </div>
      {error && <div className="text-red-400" role="alert">{error}</div>}
      <div data-testid="temp-result" className="mt-2">
        {leftVal && rightVal && `${format(leftVal, fromUnit)} = ${format(rightVal, toUnit)}`}
      </div>
      <div className="sr-only" aria-live="polite">
        {leftVal && rightVal && `${format(leftVal, fromUnit)} equals ${format(rightVal, toUnit)}`}
      </div>
    </div>
  );
};

export default TemperatureConverter;

