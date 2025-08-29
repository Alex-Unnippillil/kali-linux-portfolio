'use client';

import { useEffect, useState } from 'react';

type Rates = Record<string, number>;
const initialRates = {
  currency: {} as Rates,
  length: {} as Rates,
  weight: {} as Rates,
};
type Domain = keyof typeof initialRates;
const categories = Object.keys(initialRates) as Domain[];

export default function Converter() {
  const [active, setActive] = useState<Domain>('currency');
  const [rates, setRates] = useState<Record<Domain, Rates>>(initialRates);
  const [fromUnit, setFromUnit] = useState('');
  const [toUnit, setToUnit] = useState('');
  const [fromValue, setFromValue] = useState('');
  const [toValue, setToValue] = useState('');
  const [focused, setFocused] = useState<'from' | 'to' | null>(null);
  const [history, setHistory] = useState<
    { fromValue: string; fromUnit: string; toValue: string; toUnit: string }[]
  >([]);

  useEffect(() => {
    const load = async () => {
      const [currency, length, weight] = await Promise.all([
        import('../../data/conversions/currency.json'),
        import('../../data/conversions/length.json'),
        import('../../data/conversions/weight.json'),
      ]);
      setRates({
        currency: currency.default as Rates,
        length: length.default as Rates,
        weight: weight.default as Rates,
      });
    };
    load();
  }, []);

  useEffect(() => {
    const data = rates[active as Domain];
    const units = Object.keys(data);
    if (units.length) {
      setFromUnit(units[0]);
      setToUnit(units[1] || units[0]);
    }
    setFromValue('');
    setToValue('');
  }, [active, rates]);

  const addHistory = (
    fromVal: string,
    fromU: string,
    toVal: string,
    toU: string,
  ) =>
    setHistory((h) =>
      [{ fromValue: fromVal, fromUnit: fromU, toValue: toVal, toUnit: toU }, ...h].slice(0, 20),
    );

  const convertFrom = (val: string) => {
    setFromValue(val);
    const n = parseFloat(val);
    if (isNaN(n)) {
      setToValue('');
      return;
    }
    const data = rates[active as Domain];
    const result = (n * data[toUnit]) / data[fromUnit];
    const out = result.toString();
    setToValue(out);
    addHistory(val, fromUnit, out, toUnit);
  };

  const convertTo = (val: string) => {
    setToValue(val);
    const n = parseFloat(val);
    if (isNaN(n)) {
      setFromValue('');
      return;
    }
    const data = rates[active];
    const result = (n * data[fromUnit]) / data[toUnit];
    const out = result.toString();
    setFromValue(out);
    addHistory(out, fromUnit, val, toUnit);
  };

  const swap = () => {
    setFromUnit(toUnit);
    setToUnit(fromUnit);
    setFromValue(toValue);
    setToValue(fromValue);
  };

  const units = Object.keys(rates[active as Domain] || {});

  return (
    <div className="p-4 bg-ub-cool-grey text-white h-full overflow-y-auto">
      <h2 className="text-xl mb-4">Converter</h2>
      <div className="mb-4 inline-flex rounded-md overflow-hidden border border-gray-600">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setActive(c)}
            className={`px-3 py-1 text-sm ${
              c === active ? 'bg-white text-black' : 'bg-gray-700'
            }`}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-center gap-2">
          <div className="flex flex-col sm:flex-row gap-2 flex-1">
            <input
              type="number"
              className={`text-black p-1 rounded flex-1 ${
                focused === 'from' ? 'text-2xl' : 'text-base'
              }`}
              value={fromValue}
              onFocus={() => setFocused('from')}
              onBlur={() => setFocused(null)}
              onChange={(e) => convertFrom(e.target.value)}
              aria-label="from value"
            />
            <select
              className="text-black p-1 rounded"
              value={fromUnit}
              onChange={(e) => {
                setFromUnit(e.target.value);
                if (fromValue) convertFrom(fromValue);
              }}
            >
              {units.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
          <button
            className="p-2 bg-gray-700 rounded-full"
            onClick={swap}
            aria-label="swap units"
          >
            ↔
          </button>
          <div className="flex flex-col sm:flex-row gap-2 flex-1">
            <input
              type="number"
              className={`text-black p-1 rounded flex-1 ${
                focused === 'to' ? 'text-2xl' : 'text-base'
              }`}
              value={toValue}
              onFocus={() => setFocused('to')}
              onBlur={() => setFocused(null)}
              onChange={(e) => convertTo(e.target.value)}
              aria-label="to value"
            />
            <select
              className="text-black p-1 rounded"
              value={toUnit}
              onChange={(e) => {
                setToUnit(e.target.value);
                if (toValue) convertTo(toValue);
              }}
            >
              {units.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
        </div>
        {history.length > 0 && (
          <div className="max-h-40 overflow-y-auto space-y-1">
            {history.map((h, i) => (
              <div
                key={i}
                className="flex items-center justify-between bg-gray-800 px-2 py-1 rounded"
              >
                <span>{`${h.fromValue} ${h.fromUnit} = ${h.toValue} ${h.toUnit}`}</span>
                <button
                  className="ml-2 px-2 py-0.5 bg-gray-700 rounded text-sm"
                  onClick={() =>
                    navigator.clipboard.writeText(
                      `${h.fromValue} ${h.fromUnit} = ${h.toValue} ${h.toUnit}`,
                    )
                  }
                >
                  Copy
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
