"use client";

import { useEffect, useState } from "react";
import copyToClipboard from "../../utils/clipboard";

type Rates = Record<string, number>;
const initialRates = {
  currency: {} as Rates,
  length: {} as Rates,
  weight: {} as Rates,
};
type Domain = keyof typeof initialRates;
const categories = Object.keys(initialRates) as Domain[];
const icons: Record<Domain, string> = {
  currency: "💱",
  length: "📏",
  weight: "⚖️",
};

type Notation = "fixed" | "engineering" | "scientific";

const formatNumber = (
  val: string,
  notation: Notation,
  trailingZeros: boolean,
) => {
  const n = parseFloat(val);
  if (isNaN(n)) return "";
  const opts: Intl.NumberFormatOptions = {
    notation: notation === "fixed" ? "standard" : notation,
    maximumFractionDigits: 10,
  };
  if (trailingZeros) opts.minimumFractionDigits = 10;
  return n.toLocaleString(undefined, opts);
};

function CopyButton({ value }: { value: string }) {
  return (
    <div className="relative group">
      <button
        onClick={() => value && copyToClipboard(value)}
        className="w-6 h-6 flex items-center justify-center bg-gray-700 rounded"
        aria-label="Copy value"
      >
        📋
      </button>
      <span className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 rounded bg-black px-1 py-0.5 text-xs opacity-0 transition-opacity delay-100 group-hover:opacity-100 group-focus-within:opacity-100">
        Copy
      </span>
    </div>
  );
}

export default function Converter() {
  const [active, setActive] = useState<Domain>("currency");
  const [rates, setRates] = useState<Record<Domain, Rates>>(initialRates);
  const [fromUnit, setFromUnit] = useState("");
  const [toUnit, setToUnit] = useState("");
  const [fromValue, setFromValue] = useState("");
  const [toValue, setToValue] = useState("");
  const [focused, setFocused] = useState<"from" | "to" | null>(null);
  const [notation, setNotation] = useState<Notation>("fixed");
  const [trailingZeros, setTrailingZeros] = useState(false);
  const HISTORY_KEY = "converter-history";
  const [history, setHistory] = useState<
    { fromValue: string; fromUnit: string; toValue: string; toUnit: string }[]
  >([]);

  useEffect(() => {
    const saved = localStorage.getItem(HISTORY_KEY);
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch {
        /* ignore bad data */
      }
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      const [currency, length, weight] = await Promise.all([
        import("../../data/conversions/currency.json"),
        import("../../data/conversions/length.json"),
        import("../../data/conversions/weight.json"),
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
    setFromValue("");
    setToValue("");
  }, [active, rates]);

  const addHistory = (
    fromVal: string,
    fromU: string,
    toVal: string,
    toU: string,
  ) =>
    setHistory((h) => {
      const newHistory = [
        { fromValue: fromVal, fromUnit: fromU, toValue: toVal, toUnit: toU },
        ...h,
      ].slice(0, 10);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
      return newHistory;
    });

  const convertFrom = (val: string) => {
    setFromValue(val);
    const n = parseFloat(val);
    if (isNaN(n)) {
      setToValue("");
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
      setFromValue("");
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
            className={`px-3 py-1 flex items-center gap-1 text-sm ${
              c === active ? "bg-white text-black" : "bg-gray-700"
            }`}
          >
            <span className="text-2xl">{icons[c]}</span>
            {c}
          </button>
        ))}
      </div>
      <div className="mb-4 flex items-center gap-2">
        <select
          className="text-black p-1 rounded"
          value={notation}
          onChange={(e) => setNotation(e.target.value as Notation)}
        >
          <option value="fixed">Fixed</option>
          <option value="engineering">Engineering</option>
          <option value="scientific">Scientific</option>
        </select>
        <label className="flex items-center gap-1 text-sm">
          <input
            type="checkbox"
            checked={trailingZeros}
            onChange={(e) => setTrailingZeros(e.target.checked)}
          />
          Trailing zeros
        </label>
      </div>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-center gap-[var(--space-1-5)]">
          <div className="flex flex-col sm:flex-row gap-[var(--space-1-5)] flex-1">
            <div className="flex flex-col flex-1">
              <input
                type="number"
                className={`text-black p-1 rounded flex-1 font-mono ${
                  focused === "from" ? "text-2xl" : "text-base"
                }`}
                value={fromValue}
                onFocus={() => setFocused("from")}
                onBlur={() => setFocused(null)}
                onChange={(e) => convertFrom(e.target.value)}
                aria-label="from value"
              />
              <span className="h-4 text-xs text-gray-400 font-mono">
                {formatNumber(fromValue, notation, trailingZeros)}
              </span>
            </div>
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
            <CopyButton
              value={
                formatNumber(fromValue, notation, trailingZeros) || fromValue
              }
            />
          </div>
          <button
            className="p-2 bg-gray-700 rounded-full"
            onClick={swap}
            aria-label="swap units"
          >
            ↔
          </button>
          <div className="flex flex-col sm:flex-row gap-[var(--space-1-5)] flex-1">
            <div className="flex flex-col flex-1">
              <input
                type="number"
                className={`text-black p-1 rounded flex-1 font-mono ${
                  focused === "to" ? "text-2xl" : "text-base"
                }`}
                value={toValue}
                onFocus={() => setFocused("to")}
                onBlur={() => setFocused(null)}
                onChange={(e) => convertTo(e.target.value)}
                aria-label="to value"
              />
              <span className="h-4 text-xs text-gray-400 font-mono">
                {formatNumber(toValue, notation, trailingZeros)}
              </span>
            </div>
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
            <CopyButton
              value={formatNumber(toValue, notation, trailingZeros) || toValue}
            />
          </div>
        </div>
        {history.length > 0 && (
          <div className="max-h-40 overflow-y-auto space-y-1">
            {history.map((h, i) => (
              <div
                key={i}
                className="flex items-center justify-between bg-gray-800 px-2 py-1 rounded"
              >
                <span>{`${formatNumber(h.fromValue, notation, trailingZeros)} ${h.fromUnit} = ${formatNumber(h.toValue, notation, trailingZeros)} ${h.toUnit}`}</span>
                <CopyButton
                  value={`${formatNumber(h.fromValue, notation, trailingZeros)} ${h.fromUnit} = ${formatNumber(h.toValue, notation, trailingZeros)} ${h.toUnit}`}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
