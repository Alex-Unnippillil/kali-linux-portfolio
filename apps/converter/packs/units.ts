import currencyRates from "../../../data/conversions/currency.json";
import lengthRates from "../../../data/conversions/length.json";
import weightRates from "../../../data/conversions/weight.json";

import { ConversionArgs, ConverterCategory, ConverterPack } from "./types";

type RateTable = Record<string, number>;

type UnitsMap = Record<string, RateTable>;

const rates: UnitsMap = {
  currency: currencyRates as RateTable,
  length: lengthRates as RateTable,
  weight: weightRates as RateTable,
};

const icons: Record<keyof typeof rates, string> = {
  currency: "💱",
  length: "📏",
  weight: "⚖️",
};

const categories: ConverterCategory[] = Object.entries(rates).map(
  ([id, table]) => {
    const unitIds = Object.keys(table);
    const defaultFrom = unitIds[0] ?? "";
    const defaultTo = unitIds[1] ?? defaultFrom;
    const options = unitIds.map((unit) => ({ id: unit, label: unit }));

    return {
      id,
      label: id,
      icon: icons[id as keyof typeof rates],
      fromOptions: options,
      toOptions: options,
      defaultFrom,
      defaultTo,
    };
  },
);

const convert = ({ value, fromUnit, toUnit, category }: ConversionArgs) => {
  const table = rates[category.id as keyof typeof rates];
  if (!table) return "";

  const numericValue = parseFloat(value);
  if (Number.isNaN(numericValue)) {
    return "";
  }

  const fromRate = table[fromUnit];
  const toRate = table[toUnit];
  if (typeof fromRate !== "number" || typeof toRate !== "number") {
    return "";
  }

  const result = (numericValue * fromRate) / toRate;
  if (!Number.isFinite(result)) {
    return "";
  }

  return result.toString();
};

export const unitsPack: ConverterPack = {
  id: "units",
  label: "Units",
  icon: "🧮",
  mode: "numeric",
  categories,
  convert,
  allowSwap: true,
  supportsReverse: true,
  showFormattingControls: true,
};
