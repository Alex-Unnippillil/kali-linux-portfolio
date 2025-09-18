import React, { useState, useEffect, useCallback } from 'react';
import {
  unitMap,
  unitDetails,
  categories as allCategories,
  convertUnit,
} from './unitData';
import usePersistentState from '../../../hooks/usePersistentState';
import AlertBanner from '../../common/AlertBanner';

const categories = allCategories;

const UnitConverter = () => {
  const [category, setCategory] = useState(categories[0].value);
  const [fromUnit, setFromUnit] = useState('meter');
  const [toUnit, setToUnit] = useState('kilometer');
  const [leftVal, setLeftVal] = useState('');
  const [rightVal, setRightVal] = useState('');
  const [error, setError] = useState('');
  const [precision, setPrecision] = useState(2);
  const [sigFig, setSigFig] = useState(false);
  const [favorites, setFavorites] = usePersistentState('unit-favorites', []);

  useEffect(() => {
    const units = Object.keys(unitMap[category]);
    setFromUnit(units[0]);
    setToUnit(units[1] || units[0]);
    setLeftVal('');
    setRightVal('');
    setError('');
    const defaultPrec =
      unitDetails[category][units[1] || units[0]]?.precision || 2;
    setPrecision(defaultPrec);
  }, [category]);

  const units = Object.keys(unitMap[category]);

  useEffect(() => {
    const defaultPrec = unitDetails[category][toUnit]?.precision || 2;
    setPrecision(defaultPrec);
  }, [category, toUnit]);

  const withinRange = (cat, unit, val) => {
    const { min, max } = unitDetails[cat][unit];
    return val >= min && val <= max;
  };

    const applyPrecision = useCallback(
      (num) => {
        if (sigFig) {
          return Number(Number(num).toPrecision(Math.max(1, precision)));
        }
        return Number(Number(num).toFixed(precision));
      },
      [precision, sigFig],
    );

  const convertLeftToRight = useCallback(
    (val) => {
      if (val === '' || isNaN(parseFloat(val))) {
        setRightVal('');
        setError('');
        return;
      }
      const num = parseFloat(val);
      if (!withinRange(category, fromUnit, num)) {
        setError(`Value out of range for ${fromUnit}`);
        setRightVal('');
        return;
      }
      const converted = convertUnit(category, fromUnit, toUnit, num);
      const rounded = applyPrecision(converted);
      setRightVal(rounded.toString());
      setError('');
    },
    [category, fromUnit, toUnit, applyPrecision],
  );

  const convertRightToLeft = useCallback(
    (val) => {
      if (val === '' || isNaN(parseFloat(val))) {
        setLeftVal('');
        setError('');
        return;
      }
      const num = parseFloat(val);
      if (!withinRange(category, toUnit, num)) {
        setError(`Value out of range for ${toUnit}`);
        setLeftVal('');
        return;
      }
      const converted = convertUnit(category, toUnit, fromUnit, num);
      const rounded = applyPrecision(converted);
      setLeftVal(rounded.toString());
      setError('');
    },
    [category, fromUnit, toUnit, applyPrecision],
  );

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
  }, [fromUnit, toUnit, category, leftVal, rightVal, precision, sigFig, convertLeftToRight, convertRightToLeft]);

  const swapUnits = () => {
    setFromUnit(toUnit);
    setToUnit(fromUnit);
    setLeftVal(rightVal);
    setRightVal(leftVal);
    setError('');
  };

  const addFavorite = () => {
    const fav = { category, fromUnit, toUnit };
    setFavorites((prev) => {
      const exists = prev.some(
        (f) => f.category === category && f.fromUnit === fromUnit && f.toUnit === toUnit,
      );
      return exists ? prev : [...prev, fav];
    });
  };

  const removeFavorite = (idx) => {
    setFavorites((prev) => prev.filter((_, i) => i !== idx));
  };

  const format = (value, unit) =>
    category === 'currency'
      ? new Intl.NumberFormat(undefined, { style: 'currency', currency: unit }).format(
          Number(value),
        )
      : new Intl.NumberFormat(undefined, {
          style: 'unit',
          unit,
          maximumFractionDigits: unitDetails[category][unit].precision,
        }).format(Number(value));

  return (
    <div className="bg-gray-700 text-white p-4 rounded flex flex-col gap-2">
      <h2 className="text-xl mb-2">Unit Converter</h2>
      <label className="flex flex-col">
        Category
        <select
          className="text-black p-1 rounded"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          {categories.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </label>
      <div className="grid grid-cols-[1fr_auto_1fr] gap-4 mt-2 items-center">
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
                <option
                  key={u}
                  value={u}
                  aria-label={`${u} (${unitMap[category][u]})`}
                >
                  {u}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex justify-center">
          <button
            onClick={swapUnits}
            aria-label="Swap units"
            className="bg-gray-600 px-2 py-1 rounded"
          >
            ⇄
          </button>
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
                <option
                  key={u}
                  value={u}
                  aria-label={`${u} (${unitMap[category][u]})`}
                >
                  {u}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-2">
        <label className="flex items-center gap-1">
          Precision: {precision}
          <input
            type="range"
            min={sigFig ? 1 : 0}
            max={10}
            value={precision}
            onChange={(e) => setPrecision(parseInt(e.target.value))}
            aria-label="Precision"
          />
        </label>
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={sigFig}
            onChange={(e) => setSigFig(e.target.checked)}
            aria-label="Use significant figures"
          />
          Sig figs
        </label>
        <button
          onClick={addFavorite}
          aria-label="Add favorite"
          className="bg-gray-600 px-2 py-1 rounded ml-auto"
        >
          ☆
        </button>
      </div>
      {error && (
        <AlertBanner tone="danger" className="mt-2">
          {error}
        </AlertBanner>
      )}
      <div data-testid="unit-result" className="mt-2">
        {leftVal && rightVal && `${format(leftVal, fromUnit)} = ${format(rightVal, toUnit)}`}
      </div>
      <div className="sr-only" aria-live="polite">
        {leftVal && rightVal && `${format(leftVal, fromUnit)} equals ${format(rightVal, toUnit)}`}
      </div>
      <div className="mt-4">
        <h3 className="text-lg">Favorites</h3>
        {favorites.length === 0 && <div className="text-sm">No favorites</div>}
        <ul className="flex flex-col gap-1 mt-1">
          {favorites.map((fav, idx) => (
            <li key={`${fav.category}-${fav.fromUnit}-${fav.toUnit}-${idx}`} className="flex items-center gap-2 bg-gray-600 p-1 rounded">
              <button
                className="flex-grow text-left"
                onClick={() => {
                  setCategory(fav.category);
                  setFromUnit(fav.fromUnit);
                  setToUnit(fav.toUnit);
                }}
              >
                {fav.category}: {fav.fromUnit} → {fav.toUnit}
              </button>
              <button
                onClick={() => removeFavorite(idx)}
                aria-label="Remove favorite"
                className="text-red-300 px-1"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default UnitConverter;

