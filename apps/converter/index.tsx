"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import copyToClipboard from "../../utils/clipboard";
import {
  converterPacks,
  ConverterCategory,
  ConverterPack,
  ConverterPackId,
} from "./packs";

type Notation = "fixed" | "engineering" | "scientific";

const formatNumber = (
  val: string,
  notation: Notation,
  trailingZeros: boolean,
) => {
  const n = parseFloat(val);
  if (Number.isNaN(n)) return "";
  const opts: Intl.NumberFormatOptions = {
    notation: notation === "fixed" ? "standard" : notation,
    maximumFractionDigits: 10,
  };
  if (trailingZeros) opts.minimumFractionDigits = 10;
  return n.toLocaleString(undefined, opts);
};

type HistoryEntry = {
  packId: ConverterPackId;
  categoryId: string;
  fromValue: string;
  fromUnit: string;
  toValue: string;
  toUnit: string;
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

const packTabClass =
  "flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kali-focus";

const activeTabClass =
  "border border-[color:color-mix(in_srgb,var(--kali-control)_45%,transparent)] bg-[color:var(--kali-control)] text-[color:var(--color-inverse)] shadow-[0_10px_22px_-10px_color-mix(in_srgb,var(--kali-control)_55%,transparent)]";

const inactiveTabClass =
  "border border-[color:color-mix(in_srgb,var(--kali-border)_70%,transparent)] bg-[var(--kali-panel)] text-[color:color-mix(in_srgb,var(--kali-text)_82%,transparent)] hover:bg-[color-mix(in_srgb,var(--kali-panel)_92%,transparent)] hover:text-[color:var(--kali-text)]";

const DEFAULT_PACK_ID: ConverterPackId = converterPacks[0]?.id ?? "units";
const DEFAULT_CATEGORY_ID = converterPacks[0]?.categories[0]?.id ?? "";

export default function Converter() {
  const [activePackId, setActivePackId] = useState<ConverterPackId>(DEFAULT_PACK_ID);
  const [activeCategoryId, setActiveCategoryId] = useState<string>(
    DEFAULT_CATEGORY_ID,
  );
  const [fromUnit, setFromUnit] = useState("");
  const [toUnit, setToUnit] = useState("");
  const [fromValue, setFromValue] = useState("");
  const [toValue, setToValue] = useState("");
  const [focused, setFocused] = useState<"from" | "to" | null>(null);
  const [notation, setNotation] = useState<Notation>("fixed");
  const [trailingZeros, setTrailingZeros] = useState(false);
  const HISTORY_KEY = "converter-history";
  const HISTORY_PREVIEW_COUNT = 5;
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const packTabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const categoryTabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const conversionRequest = useRef(0);

  const packMap = useMemo(() => {
    const map = new Map<ConverterPackId, ConverterPack>();
    converterPacks.forEach((pack) => map.set(pack.id, pack));
    return map;
  }, []);

  const activePack = useMemo(() => {
    return packMap.get(activePackId) ?? converterPacks[0];
  }, [activePackId, packMap]);

  const activeCategory = useMemo(() => {
    if (!activePack) return undefined;
    return (
      activePack.categories.find((category) => category.id === activeCategoryId) ??
      activePack.categories[0]
    );
  }, [activePack, activeCategoryId]);

  const fromOptions = activeCategory?.fromOptions ?? [];
  const toOptions = activeCategory?.toOptions ?? [];
  const cardClass =
    "rounded-xl border border-[color:var(--kali-border)] bg-[var(--kali-panel)] shadow-kali-panel backdrop-blur-md";
  const sectionTitleClass = "text-xs font-semibold uppercase tracking-wide text-kali-muted";
  const inputType = activePack?.mode === "numeric" ? "number" : "text";
  const canSwap =
    (activePack?.allowSwap ?? true) && (activePack?.supportsReverse ?? true);
  const showFormattingControls = activePack?.showFormattingControls ?? false;

  const focusPackByIndex = (index: number) => {
    const packs = converterPacks;
    if (!packs.length) return;
    const bounded = (index + packs.length) % packs.length;
    const pack = packs[bounded];
    const ref = packTabRefs.current[pack.id];
    ref?.focus();
  };

  const focusCategoryByIndex = (index: number) => {
    if (!activePack) return;
    const categories = activePack.categories;
    if (!categories.length) return;
    const bounded = (index + categories.length) % categories.length;
    const category = categories[bounded];
    const ref = categoryTabRefs.current[category.id];
    ref?.focus();
  };

  const formatValueForPack = useCallback(
    (value: string, pack: ConverterPack | undefined) => {
      if (!value) return "";
      if (pack?.mode === "numeric") {
        return formatNumber(value, notation, trailingZeros);
      }
      return value;
    },
    [notation, trailingZeros],
  );

  const addHistory = useCallback(
    (entry: HistoryEntry) => {
      setHistory((current) => {
        const nextHistory = [entry, ...current].slice(0, 10);
        try {
          localStorage.setItem(HISTORY_KEY, JSON.stringify(nextHistory));
        } catch {
          // ignore storage errors
        }
        return nextHistory;
      });
    },
    [],
  );

  const runConversion = useCallback(
    async (
      direction: "forward" | "reverse",
      value: string,
      overrides?: {
        fromUnit?: string;
        toUnit?: string;
        pack?: ConverterPack | null;
        category?: ConverterCategory | null;
      },
    ) => {
      const pack = overrides?.pack ?? activePack;
      const category = overrides?.category ?? activeCategory;
      if (!pack || !category) {
        return { result: "" };
      }

      const from =
        direction === "forward"
          ? overrides?.fromUnit ?? fromUnit
          : overrides?.fromUnit ?? toUnit;
      const to =
        direction === "forward"
          ? overrides?.toUnit ?? toUnit
          : overrides?.toUnit ?? fromUnit;

      try {
        const result = await pack.convert({
          value,
          fromUnit: from,
          toUnit: to,
          category,
          direction,
        });
        return { result: result ?? "", pack, category, from, to };
      } catch {
        return { result: "", pack, category, from, to };
      }
    },
    [activePack, activeCategory, fromUnit, toUnit],
  );

  const convertFrom = useCallback(
    async (
      value: string,
      overrides?: {
        fromUnit?: string;
        toUnit?: string;
        pack?: ConverterPack | null;
        category?: ConverterCategory | null;
      },
    ) => {
      const requestId = ++conversionRequest.current;
      setFromValue(value);
      if (!value) {
        setToValue("");
        return;
      }
      const conversion = await runConversion("forward", value, overrides);
      if (conversionRequest.current !== requestId) return;
      const output = conversion.result ?? "";
      setToValue(output);
      if (output) {
        addHistory({
          packId: (conversion.pack ?? activePack)?.id ?? DEFAULT_PACK_ID,
          categoryId: (conversion.category ?? activeCategory)?.id ?? "",
          fromUnit: conversion.from ?? fromUnit,
          toUnit: conversion.to ?? toUnit,
          fromValue: value,
          toValue: output,
        });
      }
    },
    [activePack, activeCategory, addHistory, fromUnit, runConversion, toUnit],
  );

  const convertTo = useCallback(
    async (
      value: string,
      overrides?: {
        fromUnit?: string;
        toUnit?: string;
        pack?: ConverterPack | null;
        category?: ConverterCategory | null;
      },
    ) => {
      if (activePack?.supportsReverse === false) {
        return;
      }
      const requestId = ++conversionRequest.current;
      setToValue(value);
      if (!value) {
        setFromValue("");
        return;
      }
      const conversion = await runConversion("reverse", value, overrides);
      if (conversionRequest.current !== requestId) return;
      const output = conversion.result ?? "";
      setFromValue(output);
      if (output) {
        addHistory({
          packId: (conversion.pack ?? activePack)?.id ?? DEFAULT_PACK_ID,
          categoryId: (conversion.category ?? activeCategory)?.id ?? "",
          fromUnit: conversion.from ?? fromUnit,
          toUnit: conversion.to ?? toUnit,
          fromValue: output,
          toValue: value,
        });
      }
    },
    [activePack, activeCategory, addHistory, fromUnit, runConversion, toUnit],
  );

  useEffect(() => {
    try {
      const saved = localStorage.getItem(HISTORY_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved) as HistoryEntry[];
      if (!Array.isArray(parsed)) return;
      const valid = parsed.filter(
        (entry): entry is HistoryEntry =>
          entry &&
          typeof entry.packId === "string" &&
          typeof entry.categoryId === "string" &&
          typeof entry.fromUnit === "string" &&
          typeof entry.toUnit === "string" &&
          typeof entry.fromValue === "string" &&
          typeof entry.toValue === "string",
      );
      setHistory(valid);
    } catch {
      // ignore invalid stored history
    }
  }, []);

  useEffect(() => {
    if (!activePack) return;
    if (!activePack.categories.length) {
      setActiveCategoryId("");
      return;
    }
    const hasCategory = activePack.categories.some(
      (category) => category.id === activeCategoryId,
    );
    if (!hasCategory) {
      setActiveCategoryId(activePack.categories[0]?.id ?? "");
    }
  }, [activePack, activeCategoryId]);

  useEffect(() => {
    if (!activeCategory) return;
    setFromUnit(activeCategory.defaultFrom);
    setToUnit(activeCategory.defaultTo);
    setFromValue("");
    setToValue("");
  }, [activeCategory]);

  const swap = () => {
    if (!canSwap) return;
    setFromUnit(toUnit);
    setToUnit(fromUnit);
    setFromValue(toValue);
    setToValue(fromValue);
  };

  const formattedFromValue = formatValueForPack(fromValue, activePack);
  const formattedToValue = formatValueForPack(toValue, activePack);

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-ub-cool-grey p-4 text-[color:var(--kali-text)]">
      <h2 className="mb-4 text-xl font-semibold">Converter</h2>
      <section className={`${cardClass} mb-4 p-4 space-y-4`}>
        <div>
          <span className={sectionTitleClass}>Conversion packs</span>
          <div
            role="tablist"
            aria-label="Conversion packs"
            className="mt-2 grid gap-2 sm:grid-cols-3"
          >
            {converterPacks.map((pack, index) => {
              const isActive = pack.id === activePack?.id;
              return (
                <button
                  key={pack.id}
                  ref={(node) => {
                    packTabRefs.current[pack.id] = node;
                  }}
                  role="tab"
                  aria-selected={isActive}
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => setActivePackId(pack.id)}
                  onKeyDown={(event) => {
                    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
                      event.preventDefault();
                      focusPackByIndex(index + 1);
                    }
                    if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
                      event.preventDefault();
                      focusPackByIndex(index - 1);
                    }
                  }}
                  className={`${packTabClass} ${
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
                    {pack.icon}
                  </span>
                  <span>{pack.label}</span>
                </button>
              );
            })}
          </div>
        </div>
        {activePack?.categories.length ? (
          <div>
            <span className={sectionTitleClass}>Conversion domains</span>
            <div
              role="tablist"
              aria-label="Conversion categories"
              className="mt-2 grid gap-2 sm:grid-cols-3"
            >
              {activePack.categories.map((category, index) => {
                const isActive = category.id === activeCategory?.id;
                return (
                  <button
                    key={category.id}
                    ref={(node) => {
                      categoryTabRefs.current[category.id] = node;
                    }}
                    role="tab"
                    aria-selected={isActive}
                    tabIndex={isActive ? 0 : -1}
                    onClick={() => setActiveCategoryId(category.id)}
                    onKeyDown={(event) => {
                      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
                        event.preventDefault();
                        focusCategoryByIndex(index + 1);
                      }
                      if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
                        event.preventDefault();
                        focusCategoryByIndex(index - 1);
                      }
                    }}
                    className={`${packTabClass} ${
                      isActive ? activeTabClass : inactiveTabClass
                    }`}
                  >
                    {category.icon ? (
                      <span
                        className={`text-xl ${
                          isActive
                            ? "text-[color:var(--color-inverse)]"
                            : "text-[color:color-mix(in_srgb,var(--kali-control)_70%,var(--kali-text))]"
                        }`}
                        aria-hidden
                      >
                        {category.icon}
                      </span>
                    ) : null}
                    <span className="capitalize">{category.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </section>
      {showFormattingControls ? (
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
              onChange={(event) => setNotation(event.target.value as Notation)}
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
                onChange={(event) => setTrailingZeros(event.target.checked)}
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
      ) : null}
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
                  type={inputType}
                  className={`w-full rounded-md border border-[color:color-mix(in_srgb,var(--kali-border)_75%,transparent)] bg-[var(--kali-panel)] px-3 py-2 font-mono text-base text-[color:var(--kali-text)] shadow-inner shadow-black/40 focus:border-kali-focus focus:outline-none focus:ring-2 focus:ring-kali-focus/70 ${
                    focused === "from" ? "text-2xl" : "text-base"
                  }`}
                  value={fromValue}
                  onFocus={() => setFocused("from")}
                  onBlur={() => setFocused(null)}
                  onChange={(event) => convertFrom(event.target.value)}
                  aria-label="from value"
                />
              </div>
              <span className="block min-h-[1.25rem] text-sm font-mono text-[color:color-mix(in_srgb,var(--kali-text)_80%,transparent)]">
                {formattedFromValue}
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  className="min-w-[7rem] flex-1 rounded-md border border-[color:color-mix(in_srgb,var(--kali-border)_75%,transparent)] bg-[var(--kali-panel)] px-2 py-1 text-[color:var(--kali-text)] focus:border-kali-focus focus:outline-none focus:ring-2 focus:ring-kali-focus/70"
                  value={fromUnit}
                  onChange={(event) => {
                    const newUnit = event.target.value;
                    setFromUnit(newUnit);
                    if (fromValue) {
                      convertFrom(fromValue, { fromUnit: newUnit });
                    }
                  }}
                >
                  {fromOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <CopyButton
                  value={formattedFromValue || fromValue}
                  label="Copy value"
                />
              </div>
            </div>
            <div className="flex items-center justify-center">
              <button
                className="flex h-11 w-11 items-center justify-center rounded-full bg-kali-secondary/70 text-lg text-kali-inverse transition hover:bg-kali-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kali-focus disabled:cursor-not-allowed disabled:opacity-60"
                onClick={swap}
                aria-label="swap units"
                disabled={!canSwap}
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
                  type={inputType}
                  className={`w-full rounded-md border border-[color:color-mix(in_srgb,var(--kali-border)_75%,transparent)] bg-[var(--kali-panel)] px-3 py-2 font-mono text-base text-[color:var(--kali-text)] shadow-inner shadow-black/40 focus:border-kali-focus focus:outline-none focus:ring-2 focus:ring-kali-focus/70 ${
                    focused === "to" ? "text-2xl" : "text-base"
                  }`}
                  value={toValue}
                  onFocus={() => setFocused("to")}
                  onBlur={() => setFocused(null)}
                  onChange={(event) => convertTo(event.target.value)}
                  aria-label="to value"
                  readOnly={activePack?.supportsReverse === false}
                />
              </div>
              <span className="block min-h-[1.25rem] text-sm font-mono text-[color:color-mix(in_srgb,var(--kali-text)_80%,transparent)]">
                {formattedToValue}
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  className="min-w-[7rem] flex-1 rounded-md border border-[color:color-mix(in_srgb,var(--kali-border)_75%,transparent)] bg-[var(--kali-panel)] px-2 py-1 text-[color:var(--kali-text)] focus:border-kali-focus focus:outline-none focus:ring-2 focus:ring-kali-focus/70"
                  value={toUnit}
                  onChange={(event) => {
                    const newUnit = event.target.value;
                    setToUnit(newUnit);
                    if (focused === "to" && activePack?.supportsReverse && toValue) {
                      convertTo(toValue, { toUnit: newUnit });
                    } else if (fromValue) {
                      convertFrom(fromValue, { toUnit: newUnit });
                    }
                  }}
                >
                  {toOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <CopyButton
                  value={formattedToValue || toValue}
                  label="Copy value"
                />
              </div>
            </div>
          </div>
        </section>
        {history.length > 0 ? (
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
            {historyOpen ? (
              <div
                id="converter-history-panel"
                className="max-h-48 space-y-2 overflow-y-auto px-4 pb-4"
              >
                {history.slice(0, HISTORY_PREVIEW_COUNT).map((entry, index) => {
                  const pack = packMap.get(entry.packId);
                  const category = pack?.categories.find(
                    (item) => item.id === entry.categoryId,
                  );
                  const formattedFrom = formatValueForPack(entry.fromValue, pack);
                  const formattedTo = formatValueForPack(entry.toValue, pack);
                  const display = `${formattedFrom || entry.fromValue} ${entry.fromUnit} = ${formattedTo || entry.toValue} ${entry.toUnit}`;
                  const contextLabel = [pack?.label ?? entry.packId, category?.label]
                    .filter(Boolean)
                    .join(" • ");
                  return (
                    <div
                      key={`${entry.packId}-${entry.categoryId}-${index}`}
                      className="flex flex-col gap-2 rounded-lg border border-[color:color-mix(in_srgb,var(--kali-border)_65%,transparent)] bg-[var(--kali-panel)] px-3 py-2 text-xs text-[color:color-mix(in_srgb,var(--kali-text)_90%,transparent)] sm:flex-row sm:items-center sm:justify-between"
                      data-testid="converter-history-entry"
                    >
                      <div className="space-y-1">
                        {contextLabel ? (
                          <span className="block text-[10px] font-semibold uppercase tracking-wide text-[color:color-mix(in_srgb,var(--kali-text)_70%,transparent)]">
                            {contextLabel}
                          </span>
                        ) : null}
                        <span className="font-mono leading-tight">
                          {display}
                        </span>
                      </div>
                      <CopyButton value={display} label="Copy result" />
                    </div>
                  );
                })}
              </div>
            ) : null}
          </section>
        ) : null}
      </div>
    </div>
  );
}
