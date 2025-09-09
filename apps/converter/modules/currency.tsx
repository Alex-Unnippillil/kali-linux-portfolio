"use client";

import { useEffect, useState } from "react";
import ratesData from "../../../data/conversions/currency.json";

const rates = ratesData as Record<string, number>;
const currencyCodes = Object.keys(rates);

export default function CurrencyModule() {
  const [amount, setAmount] = useState("0");
  const [from, setFrom] = useState(currencyCodes[0] || "USD");
  const [to, setTo] = useState(currencyCodes[1] || currencyCodes[0] || "USD");
  const [result, setResult] = useState("0");

  const convert = (val: string, fromCode: string, toCode: string) => {
    const n = parseFloat(val);
    const fromRate = rates[fromCode];
    const toRate = rates[toCode];
    if (!isFinite(n) || fromRate === undefined || toRate === undefined) {
      return "";
    }
    const out = (n * toRate) / fromRate;
    return out.toString();
  };

  useEffect(() => {
    setResult(convert(amount, from, to));
  }, [amount, from, to]);

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-lg">Currency Converter</h2>
      <div className="flex flex-wrap gap-2 items-center">
        <input
          className="text-black p-1 rounded flex-1"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          aria-label="Amount"
        />
        <select
          className="text-black p-1 rounded"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          aria-label="From currency"
        >
          {currencyCodes.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <span className="px-1">→</span>
        <select
          className="text-black p-1 rounded"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          aria-label="To currency"
        >
          {currencyCodes.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <output aria-live="polite" className="mt-2">
        {result && `${amount} ${from} = ${result} ${to}`}
      </output>
    </div>
  );
}

