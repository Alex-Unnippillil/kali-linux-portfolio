'use client';

import { useState } from 'react';
import currency from '../../../data/conversions/currency.json';
import time from '../../../data/conversions/time.json';
import filesize from '../../../data/conversions/filesize.json';
import colorData from '../../../data/conversions/color.json';

const datasets = {
  currency,
  time,
  filesize,
  color: colorData,
};

const numberDomains = ['currency', 'time', 'filesize'];

const toRgb = (hex: string) => {
  const n = hex.replace('#', '');
  const bigint = parseInt(n, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgb(${r}, ${g}, ${b})`;
};

export default function ConverterPage() {
  const domains = Object.keys(datasets);
  const [domain, setDomain] = useState(domains[0]);

  const [fromUnit, setFromUnit] = useState(Object.keys(currency)[0]);
  const [toUnit, setToUnit] = useState(Object.keys(currency)[1]);
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');

  const [color, setColor] = useState(Object.keys(colorData)[0]);

  const handleDomain = (d: string) => {
    setDomain(d);
    if (numberDomains.includes(d)) {
      const units = Object.keys(datasets[d] as Record<string, number>);
      setFromUnit(units[0]);
      setToUnit(units[1] || units[0]);
      setInput('');
      setOutput('');
    }
  };

  const convert = (val: string) => {
    setInput(val);
    const n = parseFloat(val);
    if (isNaN(n)) {
      setOutput('');
      return;
    }
    const data = datasets[domain] as Record<string, number>;
    const result = (n * data[toUnit]) / data[fromUnit];
    setOutput(result.toString());
  };

  return (
    <div className="p-4 bg-ub-cool-grey text-white h-full overflow-y-auto">
      <h2 className="text-xl mb-4">Converter</h2>
      <label className="block mb-4">
        Domain
        <select
          className="ml-2 text-black p-1 rounded"
          value={domain}
          onChange={(e) => handleDomain(e.target.value)}
        >
          {domains.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </label>
      {domain === 'color' ? (
        <div>
          <label>
            Color
            <select
              className="ml-2 text-black p-1 rounded"
              value={color}
              onChange={(e) => setColor(e.target.value)}
            >
              {Object.keys(colorData).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <div className="mt-4 space-y-2">
            <div>Hex: {colorData[color]}</div>
            <div>RGB: {toRgb(colorData[color])}</div>
          </div>
        </div>
      ) : (
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
              {Object.keys(datasets[domain] as Record<string, number>).map((u) => (
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
              {Object.keys(datasets[domain] as Record<string, number>).map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
