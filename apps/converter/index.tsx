"use client";

import { useEffect, useRef, useState } from "react";
import copyToClipboard from "../../utils/clipboard";
import { formatNumber as formatNumberWithLocale } from "@/lib/intl";

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

const formatNumericValue = (
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
  const formatted = formatNumberWithLocale(n, opts);
  return formatted === "NaN" ? "" : formatted;
};

function CopyButton({ value, label = "Copy value" }: { value: string; label?: string }) {
  return (
    <div className="relative group">
      <button
        onClick={() => value && copyToClipboard(value)}
        className="flex h-7 w-7 items-center justify-center rounded-md bg-kali-accent/90 text-sm text-kali-inverse transition hover:bg-kali-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kali-focus"
        aria-label={label}
        title={label}
      >
        📋
      </button>
      <span className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 rounded bg-black px-1 py-0.5 text-xs opacity-0 transition-opacity delay-100 group-hover:opacity-100 group-focus-within:opacity-100">
        {label}
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
  const HISTORY_PREVIEW_COUNT = 5;
  const [history, setHistory] = useState<
    { fromValue: string; fromUnit: string; toValue: string; toUnit: string }[]
  >([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const tabRefs = useRef<Record<Domain, HTMLButtonElement | null>>({
    currency: null,
    length: null,
    weight: null,
  });

  const cardClass =
    "rounded-xl border border-[color:var(--kali-border)] bg-[var(--kali-panel)] shadow-kali-panel backdrop-blur-md";
  const sectionTitleClass =
    "text-xs font-semibold uppercase tracking-wide text-kali-muted";
  const tabBaseClass =
    "flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kali-focus";
  const activeTabClass =
    "border border-[color:color-mix(in_srgb,var(--kali-control)_45%,transparent)] bg-[color:var(--kali-control)] text-[color:var(--color-inverse)] shadow-[0_10px_22px_-10px_color-mix(in_srgb,var(--kali-control)_55%,transparent)]";
  const inactiveTabClass =
    "border border-[color:color-mix(in_srgb,var(--kali-border)_70%,transparent)] bg-[var(--kali-panel)] text-[color:color-mix(in_srgb,var(--kali-text)_82%,transparent)] hover:bg-[color-mix(in_srgb,var(--kali-panel)_92%,transparent)] hover:text-[color:var(--kali-text)]";

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

  const focusTabByIndex = (index: number) => {
    const boundedIndex = (index + categories.length) % categories.length;
    const key = categories[boundedIndex];
    const ref = tabRefs.current[key];
    if (ref) {
      ref.focus();
    }
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-ub-cool-grey p-4 text-[color:var(--kali-text)]">
      <h2 className="mb-4 text-xl font-semibold">Converter</h2>
      <section className={`${cardClass} mb-4 p-2`}>
        <div
          role="tablist"
          aria-label="Conversion categories"
          className="grid gap-2 sm:grid-cols-3"
        >
          {categories.map((c, index) => {
            const isActive = c === active;
            return (
              <button
                key={c}
                ref={(node) => {
                  tabRefs.current[c] = node;
                }}
                role="tab"
                aria-selected={isActive}
                tabIndex={isActive ? 0 : -1}
                onClick={() => setActive(c)}
                onKeyDown={(event) => {
                  if (event.key === "ArrowRight" || event.key === "ArrowDown") {
                    event.preventDefault();
                    focusTabByIndex(index + 1);
                  }
                  if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
                    event.preventDefault();
                    focusTabByIndex(index - 1);
                  }
                }}
                className={`${tabBaseClass} ${
                  isActive ? activeTabClass : inactiveTabClass
                }`}
              >
                <span
                  className={`text-xl ${
                    isActive
                      ? "text-[color:var(--color-inverse)]"
                      : "text-[color:color-mix(in_srgb,var(--kali-control)_70%,var(--kali-text))]"
                  }`}
                  aria-hidden
                >
                  {icons[c]}
                </span>
                <span className="capitalize">{c}</span>
              </button>
            );
          })}
        </div>
      </section>
      <section
        className={`${cardClass} mb-4 p-4 space-y-4 sm:flex sm:items-start sm:gap-6 sm:space-y-0`}
        aria-labelledby="converter-formatting"
      >
        <label className="flex flex-1 flex-col gap-2 text-sm" htmlFor="converter-notation">
          <span id="converter-formatting" className={sectionTitleClass}>
            Notation
          </span>
          <select
            id="converter-notation"
            className="rounded-md border border-[color:color-mix(in_srgb,var(--kali-border)_75%,transparent)] bg-[var(--kali-panel)] px-2 py-1 text-[color:var(--kali-text)] focus:border-kali-focus focus:outline-none focus:ring-2 focus:ring-kali-focus/70"
            value={notation}
            onChange={(e) => setNotation(e.target.value as Notation)}
          >
            <option value="fixed">Fixed</option>
            <option value="engineering">Engineering</option>
            <option value="scientific">Scientific</option>
          </select>
          <small className="text-[11px] leading-relaxed text-[color:color-mix(in_srgb,var(--kali-text)_70%,transparent)]">
            Controls how formatted previews display large or small numbers.
          </small>
        </label>
        <div className="flex flex-1 flex-col gap-2 text-sm">
          <span className={sectionTitleClass}>Trailing zeros</span>
          <label
            htmlFor="converter-trailing-zeros"
            className="flex items-center gap-2 rounded-md border border-[color:color-mix(in_srgb,var(--kali-border)_65%,transparent)] bg-[var(--kali-panel)] px-3 py-2 transition hover:bg-[color-mix(in_srgb,var(--kali-panel)_94%,transparent)] focus-within:border-kali-focus"
          >
            <input
              id="converter-trailing-zeros"
              type="checkbox"
              checked={trailingZeros}
              onChange={(e) => setTrailingZeros(e.target.checked)}
              aria-label="Include trailing zeros"
              className="h-4 w-4 rounded border-[color:color-mix(in_srgb,var(--kali-border)_55%,transparent)] bg-transparent text-kali-accent focus:ring-kali-focus/80"
            />
            <span>Include up to ten decimal places</span>
          </label>
          <small className="text-[11px] leading-relaxed text-[color:color-mix(in_srgb,var(--kali-text)_70%,transparent)]">
            Pads previews with zeros for consistent length when comparing results.
          </small>
        </div>
      </section>
      <div className="space-y-4">
        <section className={`${cardClass} p-4`} aria-labelledby="converter-inputs">
          <h3
            id="converter-inputs"
            className="mb-4 text-sm font-semibold uppercase tracking-wide text-kali-muted"
          >
            Conversion inputs
          </h3>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-start">
            <div className="space-y-3">
              <div className="flex flex-col gap-2">
                <label className="text-xs uppercase tracking-wide text-kali-muted">
                  From value
                </label>
                <input
                  type="number"
                  className={`w-full rounded-md border border-[color:color-mix(in_srgb,var(--kali-border)_75%,transparent)] bg-[var(--kali-panel)] px-3 py-2 font-mono text-base text-[color:var(--kali-text)] shadow-inner shadow-black/40 focus:border-kali-focus focus:outline-none focus:ring-2 focus:ring-kali-focus/70 ${
                    focused === "from" ? "text-2xl" : "text-base"
                  }`}
                  value={fromValue}
                  onFocus={() => setFocused("from")}
                  onBlur={() => setFocused(null)}
                  onChange={(e) => convertFrom(e.target.value)}
                  aria-label="from value"
                />
              </div>
              <span className="block min-h-[1.25rem] text-sm font-mono text-[color:color-mix(in_srgb,var(--kali-text)_80%,transparent)]">
                {formatNumericValue(fromValue, notation, trailingZeros)}
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  className="min-w-[7rem] flex-1 rounded-md border border-[color:color-mix(in_srgb,var(--kali-border)_75%,transparent)] bg-[var(--kali-panel)] px-2 py-1 text-[color:var(--kali-text)] focus:border-kali-focus focus:outline-none focus:ring-2 focus:ring-kali-focus/70"
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
                    formatNumericValue(fromValue, notation, trailingZeros) || fromValue
                  }
                  label="Copy value"
                />
              </div>
            </div>
            <div className="flex items-center justify-center">
              <button
                className="flex h-11 w-11 items-center justify-center rounded-full bg-kali-secondary/70 text-lg text-kali-inverse transition hover:bg-kali-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kali-focus"
                onClick={swap}
                aria-label="swap units"
              >
                ↔
              </button>
            </div>
            <div className="space-y-3">
              <div className="flex flex-col gap-2">
                <label className="text-xs uppercase tracking-wide text-kali-muted">
                  To value
                </label>
                <input
                  type="number"
                  className={`w-full rounded-md border border-[color:color-mix(in_srgb,var(--kali-border)_75%,transparent)] bg-[var(--kali-panel)] px-3 py-2 font-mono text-base text-[color:var(--kali-text)] shadow-inner shadow-black/40 focus:border-kali-focus focus:outline-none focus:ring-2 focus:ring-kali-focus/70 ${
                    focused === "to" ? "text-2xl" : "text-base"
                  }`}
                  value={toValue}
                  onFocus={() => setFocused("to")}
                  onBlur={() => setFocused(null)}
                  onChange={(e) => convertTo(e.target.value)}
                  aria-label="to value"
                />
              </div>
              <span className="block min-h-[1.25rem] text-sm font-mono text-[color:color-mix(in_srgb,var(--kali-text)_80%,transparent)]">
                {formatNumericValue(toValue, notation, trailingZeros)}
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  className="min-w-[7rem] flex-1 rounded-md border border-[color:color-mix(in_srgb,var(--kali-border)_75%,transparent)] bg-[var(--kali-panel)] px-2 py-1 text-[color:var(--kali-text)] focus:border-kali-focus focus:outline-none focus:ring-2 focus:ring-kali-focus/70"
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
                  value={
                    formatNumericValue(toValue, notation, trailingZeros) || toValue
                  }
                  label="Copy value"
                />
              </div>
            </div>
          </div>
        </section>
        {history.length > 0 && (
          <section className={`${cardClass} overflow-hidden`}>
            <button
              type="button"
              className="flex w-full items-center justify-between bg-[var(--kali-panel)] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[color:color-mix(in_srgb,var(--kali-text)_80%,transparent)] transition hover:bg-[color-mix(in_srgb,var(--kali-panel)_94%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kali-focus"
              onClick={() => setHistoryOpen((open) => !open)}
              aria-expanded={historyOpen}
              aria-controls="converter-history-panel"
            >
              <span>
                {historyOpen ? "Hide history" : "Show history"} (
                {Math.min(history.length, HISTORY_PREVIEW_COUNT)})
              </span>
              <span className="text-lg" aria-hidden>
                {historyOpen ? "▾" : "▸"}
              </span>
            </button>
            {historyOpen && (
              <div
                id="converter-history-panel"
                className="max-h-48 space-y-2 overflow-y-auto px-4 pb-4"
              >
                {history.slice(0, HISTORY_PREVIEW_COUNT).map((h, i) => {
                  const formatted = `${formatNumericValue(h.fromValue, notation, trailingZeros)} ${h.fromUnit} = ${formatNumericValue(h.toValue, notation, trailingZeros)} ${h.toUnit}`;
                  return (
                    <div
                      key={`${h.fromUnit}-${h.toUnit}-${i}`}
                      className="flex items-center justify-between gap-3 rounded-lg border border-[color:color-mix(in_srgb,var(--kali-border)_65%,transparent)] bg-[var(--kali-panel)] px-3 py-2 text-xs text-[color:color-mix(in_srgb,var(--kali-text)_90%,transparent)]"
                      data-testid="converter-history-entry"
                    >
                      <span className="font-mono leading-tight">
                        {formatted}
                      </span>
                      <CopyButton value={formatted} label="Copy result" />
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
