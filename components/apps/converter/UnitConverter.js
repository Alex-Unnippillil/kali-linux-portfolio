import React, { useState, useEffect } from 'react';
import { create, all } from 'mathjs';
import usePersistentState from '../../../hooks/usePersistentState';

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
};

export const convertUnit = (category, from, to, amount, precision) => {
  const fromUnit = unitMap[category][from];
  const toUnit = unitMap[category][to];
  const result = math.unit(amount, fromUnit).toNumber(toUnit);
  return typeof precision === 'number' ? math.round(result, precision) : result;
};

const UnitConverter = () => {
  const [category, setCategory] = usePersistentState('unit-category', 'length');
  const [fromUnit, setFromUnit] = usePersistentState('unit-from', 'meter');
  const [toUnit, setToUnit] = usePersistentState('unit-to', 'kilometer');
  const [precision, setPrecision] = usePersistentState('unit-precision', 4);
  const [value, setValue] = useState('');
  const [result, setResult] = useState('');
  const [valueError, setValueError] = useState('');
  const [precisionError, setPrecisionError] = useState('');
  const [fromError, setFromError] = useState('');
  const [toError, setToError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const units = Object.keys(unitMap[category]);
    if (!units.includes(fromUnit)) {
      setFromUnit(units[0]);
    }
    if (!units.includes(toUnit)) {
      setToUnit(units[1] || units[0]);
    }
  }, [category, fromUnit, toUnit, setFromUnit, setToUnit]);

  useEffect(() => {
    if (
      value === '' ||
      isNaN(parseFloat(value)) ||
      valueError ||
      precisionError ||
      fromError ||
      toError
    ) {
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
  }, [value, fromUnit, toUnit, category, precision, valueError, precisionError, fromError, toError]);

  const units = Object.keys(unitMap[category]);

  const handleValueChange = (e) => {
    const val = e.target.value;
    setValue(val);
    setValueError(val === '' || isNaN(Number(val)) ? 'Enter a valid number' : '');
  };

  const handlePrecisionChange = (e) => {
    const val = e.target.value;
    const num = Number(val);
    setPrecision(num);
    setPrecisionError(
      val === '' || !Number.isInteger(num) || num < 0
        ? 'Precision must be a non-negative integer'
        : ''
    );
  };

  const handleFromChange = (e) => {
    const val = e.target.value;
    setFromUnit(val);
    setFromError(units.includes(val) ? '' : 'Invalid unit');
  };

  const handleToChange = (e) => {
    const val = e.target.value;
    setToUnit(val);
    setToError(units.includes(val) ? '' : 'Invalid unit');
  };

  const resultText =
    result ? `${value} ${fromUnit} = ${result} ${toUnit}` : '';

  const copyResult = async () => {
    if (!resultText) return;
    try {
      if (navigator && navigator.clipboard) {
        await navigator.clipboard.writeText(resultText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      /* ignore */
    }
  };

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
          onChange={handleValueChange}
        />
        {valueError && (
          <span className="text-red-500 text-sm">{valueError}</span>
        )}
      </label>
      <label className="flex flex-col">
        Precision
        <input
          className="text-black p-1 rounded"
          type="text"
          value={precision}
          onChange={handlePrecisionChange}
        />
        {precisionError && (
          <span className="text-red-500 text-sm">{precisionError}</span>
        )}
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col">
          From
          <input
            className="text-black p-1 rounded"
            list="unit-from-options"
            value={fromUnit}
            onChange={handleFromChange}
          />
          <datalist id="unit-from-options">
            {units.map((u) => (
              <option key={u} value={u} />
            ))}
          </datalist>
          {fromError && (
            <span className="text-red-500 text-sm">{fromError}</span>
          )}
        </label>
        <label className="flex flex-col">
          To
          <input
            className="text-black p-1 rounded"
            list="unit-to-options"
            value={toUnit}
            onChange={handleToChange}
          />
          <datalist id="unit-to-options">
            {units.map((u) => (
              <option key={u} value={u} />
            ))}
          </datalist>
          {toError && (
            <span className="text-red-500 text-sm">{toError}</span>
          )}
        </label>
      </div>
      <div data-testid="unit-result" className="mt-2 flex items-center gap-2">
        {result && (
          <>
            <span>{resultText}</span>
            <button
              className="bg-gray-600 px-2 py-1 rounded"
              onClick={copyResult}
            >
              Copy
            </button>
            {copied && (
              <span className="text-green-400 text-sm">Copied!</span>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default UnitConverter;

