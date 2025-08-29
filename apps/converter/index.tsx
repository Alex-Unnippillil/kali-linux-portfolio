'use client';

import { useEffect, useState } from 'react';

type Rates = Record<string, number>;
const categories = ['currency', 'length', 'weight'] as const;
type Category = typeof categories[number];

export default function Converter() {
  const [active, setActive] = useState<Category>('currency');
  const [rates, setRates] = useState<Record<Category, Rates>>({
    currency: {} as Rates,
    length: {} as Rates,
    weight: {} as Rates,
  });
  const [fromUnit, setFromUnit] = useState('');
  const [toUnit, setToUnit] = useState('');
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');

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
    const data = rates[active];
    const units = Object.keys(data);
    if (units.length) {
      setFromUnit(units[0]);
      setToUnit(units[1] || units[0]);
    }
    setInput('');
    setOutput('');
  }, [active, rates]);

  const convert = (val: string) => {
    setInput(val);
    const n = parseFloat(val);
    if (isNaN(n)) {
      setOutput('');
      return;
    }
    const data = rates[active];
    const result = (n * data[toUnit]) / data[fromUnit];
    setOutput(result.toString());
  };

  const units = Object.keys(rates[active] || {});

  return (
    <div className="p-4 bg-ub-cool-grey text-white h-full overflow-y-auto">
      <h2 className="text-xl mb-4">Converter</h2>
      <div className="flex gap-2 mb-4">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setActive(c)}
            className={`px-2 py-1 rounded ${
              c === active ? 'bg-white text-black' : 'bg-gray-700'
            }`}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="number"
            className="text-black p-1 rounded flex-1"
            value={input}
            onChange={(e) => convert(e.target.value)}
            aria-label="from value"
          />
          <select
            className="text-black p-1 rounded"
            value={fromUnit}
            onChange={(e) => {
              setFromUnit(e.target.value);
              if (input) convert(input);
            }}
          >
            {units.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            className="text-black p-1 rounded flex-1"
            value={output}
            readOnly
            aria-label="to value"
          />
          <select
            className="text-black p-1 rounded"
            value={toUnit}
            onChange={(e) => {
              setToUnit(e.target.value);
              if (input) convert(input);
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
    </div>
  );
}
