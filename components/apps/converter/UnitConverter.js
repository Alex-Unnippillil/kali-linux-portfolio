import React, { useState, useEffect, useRef } from 'react';
import { create, all } from 'mathjs';

const math = create(all);

const unitMap = {
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

export const convertUnit = (category, from, to, amount, precision) => {
  const fromUnit = unitMap[category][from];
  const toUnit = unitMap[category][to];
  const result = math.unit(amount, fromUnit).toNumber(toUnit);
  return typeof precision === 'number' ? math.round(result, precision) : result;
};

// A slider that displays a rounding preview bubble while dragging.
const RoundingSlider = ({ value, precision, onChange, prefersReducedMotion }) => {
  const [showBubble, setShowBubble] = useState(false);
  const rafRef = useRef(0);

  const raf =
    typeof window !== 'undefined' && window.requestAnimationFrame
      ? window.requestAnimationFrame
      : (cb) => setTimeout(cb, 0);
  const cancelRaf =
    typeof window !== 'undefined' && window.cancelAnimationFrame
      ? window.cancelAnimationFrame
      : clearTimeout;

  const handleChange = (e) => {
    const v = Number(e.target.value);
    cancelRaf(rafRef.current);
    rafRef.current = raf(() => onChange(v));
  };

  const rounded = math.format(
    math.round(parseFloat(value || 0), precision),
    { notation: 'fixed', precision }
  );

  return (
    <div className="relative mt-2">
      <input
        type="range"
        min="0"
        max="6"
        value={precision}
        onChange={handleChange}
        onMouseDown={() => setShowBubble(true)}
        onMouseUp={() => setShowBubble(false)}
        onTouchStart={() => setShowBubble(true)}
        onTouchEnd={() => setShowBubble(false)}
        aria-label="Rounding precision"
        className="w-full"
      />
      {showBubble && (
        <div
          className={`absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 text-xs rounded bg-gray-900 text-white ${
            prefersReducedMotion ? '' : 'transition-transform'
          }`}
        >
          {rounded}
        </div>
      )}
    </div>
  );
};

const UnitConverter = () => {
  const [category, setCategory] = useState('length');
  const [fromUnit, setFromUnit] = useState('meter');
  const [toUnit, setToUnit] = useState('kilometer');
  const [leftVal, setLeftVal] = useState('');
  const [rightVal, setRightVal] = useState('');
  const [precision, setPrecision] = useState(2);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const units = Object.keys(unitMap[category]);
    setFromUnit(units[0]);
    setToUnit(units[1] || units[0]);
    setLeftVal('');
    setRightVal('');
  }, [category]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = () => setPrefersReducedMotion(media.matches);
    handler();
    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, []);

  const units = Object.keys(unitMap[category]);

  const convertLeftToRight = (val, prec = precision) => {
    if (val === '' || isNaN(parseFloat(val))) {
      setRightVal('');
      return;
    }
    const converted = convertUnit(
      category,
      fromUnit,
      toUnit,
      parseFloat(val),
      prec
    );
    setRightVal(
      math.format(converted, { notation: 'fixed', precision: prec })
    );
  };

  const convertRightToLeft = (val, prec = precision) => {
    if (val === '' || isNaN(parseFloat(val))) {
      setLeftVal('');
      return;
    }
    const converted = convertUnit(
      category,
      toUnit,
      fromUnit,
      parseFloat(val),
      prec
    );
    setLeftVal(
      math.format(converted, { notation: 'fixed', precision: prec })
    );
  };

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
      convertLeftToRight(leftVal, precision);
    } else if (rightVal !== '') {
      convertRightToLeft(rightVal, precision);
    }
  }, [precision, fromUnit, toUnit]);

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
          <option value="length">Length</option>
          <option value="mass">Mass</option>
          <option value="temperature">Temperature</option>
        </select>
      </label>
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
          <RoundingSlider
            value={leftVal}
            precision={precision}
            onChange={setPrecision}
            prefersReducedMotion={prefersReducedMotion}
          />
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
          <RoundingSlider
            value={rightVal}
            precision={precision}
            onChange={setPrecision}
            prefersReducedMotion={prefersReducedMotion}
          />
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
      <div
        data-testid="unit-result"
        className="mt-2"
      >
        {leftVal && rightVal && `${leftVal} ${fromUnit} = ${rightVal} ${toUnit}`}
      </div>
      <div className="sr-only" aria-live="polite">
        {leftVal && rightVal && `${leftVal} ${fromUnit} equals ${rightVal} ${toUnit}`}
      </div>
    </div>
  );
};

export default UnitConverter;

