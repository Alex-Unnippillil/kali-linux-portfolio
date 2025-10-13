export type ConverterPackId = "units" | "bases" | "hashing";

export type ConverterInputMode = "numeric" | "text";

export interface ConverterOption {
  id: string;
  label: string;
}

export interface ConverterCategory {
  id: string;
  label: string;
  icon?: string;
  description?: string;
  fromOptions: ConverterOption[];
  toOptions: ConverterOption[];
  defaultFrom: string;
  defaultTo: string;
}

export interface ConversionArgs {
  value: string;
  fromUnit: string;
  toUnit: string;
  category: ConverterCategory;
  direction: "forward" | "reverse";
}

export interface ConverterPack {
  id: ConverterPackId;
  label: string;
  icon: string;
  mode: ConverterInputMode;
  categories: ConverterCategory[];
  convert: (args: ConversionArgs) => Promise<string> | string;
  allowSwap?: boolean;
  supportsReverse?: boolean;
  showFormattingControls?: boolean;
}
