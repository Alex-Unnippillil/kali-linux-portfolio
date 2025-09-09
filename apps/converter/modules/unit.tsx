"use client";

import { useEffect, useState } from "react";
import lengthData from "../../../data/conversions/length.json";
import weightData from "../../../data/conversions/weight.json";

type Rates = Record<string, number>;
const sources: Record<string, Rates> = {
  length: lengthData as Rates,
  weight: weightData as Rates,
};

export default function UnitModule() {
  const categories = Object.keys(sources);
  const [category, setCategory] = useState(categories[0]);
  const [fromUnit, setFromUnit] = useState("");
  const [toUnit, setToUnit] = useState("");
  const [fromValue, setFromValue] = useState("0");
  const [toValue, setToValue] = useState("0");

  useEffect(() => {
    const units = Object.keys(sources[category]);
    setFromUnit(units[0] || "");
    setToUnit(units[1] || units[0] || "");
    setFromValue("0");
    setToValue("0");
  }, [category]);

  const convert = (val: string, from: string, to: string) => {
    const n = parseFloat(val);
    const data = sources[category];
    const fromRate = data[from];
    const toRate = data[to];
    if (!isFinite(n) || fromRate === undefined || toRate === undefined) return "";
    const out = (n * toRate) / fromRate;
    return out.toString();
  };

  useEffect(() => {
    setToValue(convert(fromValue, fromUnit, toUnit));
  }, [fromValue, fromUnit, toUnit, category]);

  const units = Object.keys(sources[category]);

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-lg">Unit Converter</h2>
      <label className="flex flex-col">
        Category
        <select
          className="text-black p-1 rounded"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
      <div className="flex flex-wrap gap-2 items-center">
        <input
          className="text-black p-1 rounded flex-1"
          type="number"
          value={fromValue}
          onChange={(e) => setFromValue(e.target.value)}
          aria-label="From value"
        />
        <select
          className="text-black p-1 rounded"
          value={fromUnit}
          onChange={(e) => setFromUnit(e.target.value)}
          aria-label="From unit"
        >
          {units.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
        <span className="px-1">→</span>
        <input
          className="text-black p-1 rounded flex-1"
          type="number"
          value={toValue}
          onChange={(e) => setToValue(e.target.value)}
          aria-label="To value"
        />
        <select
          className="text-black p-1 rounded"
          value={toUnit}
          onChange={(e) => setToUnit(e.target.value)}
          aria-label="To unit"
        >
          {units.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

