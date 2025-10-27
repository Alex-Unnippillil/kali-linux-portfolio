import { ConversionArgs, ConverterCategory, ConverterPack } from "./types";

interface BaseDefinition {
  id: string;
  label: string;
  base: number;
}

const alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

const bases: BaseDefinition[] = [
  { id: "binary", label: "Binary", base: 2 },
  { id: "octal", label: "Octal", base: 8 },
  { id: "decimal", label: "Decimal", base: 10 },
  { id: "hexadecimal", label: "Hexadecimal", base: 16 },
];

const category: ConverterCategory = {
  id: "base-conversion",
  label: "Base conversions",
  icon: "🧮",
  fromOptions: bases.map(({ id, label }) => ({ id, label })),
  toOptions: bases.map(({ id, label }) => ({ id, label })),
  defaultFrom: "decimal",
  defaultTo: "binary",
};

const baseMap = Object.fromEntries(bases.map((item) => [item.id, item])) as Record<
  string,
  BaseDefinition
>;

const sanitizeInput = (value: string) => value.replace(/\s+/g, "");

const toBigInt = (value: string, definition: BaseDefinition): bigint | null => {
  if (!value) return null;
  const trimmed = sanitizeInput(value).toUpperCase();
  if (!trimmed) return null;

  let negative = false;
  let digits = trimmed;
  if (trimmed.startsWith("-")) {
    negative = true;
    digits = trimmed.slice(1);
  }

  if (!digits) return null;

  const limitCharCode = alphabet.charCodeAt(definition.base - 1);
  const pattern =
    definition.base <= 10
      ? new RegExp(`^[0-${definition.base - 1}]+$`, "i")
      : new RegExp(`^[0-9A-${String.fromCharCode(limitCharCode)}]+$`, "i");

  if (!pattern.test(digits)) {
    return null;
  }

  let parsed: bigint;
  switch (definition.base) {
    case 2:
      parsed = BigInt(`0b${digits}`);
      break;
    case 8:
      parsed = BigInt(`0o${digits}`);
      break;
    case 10:
      parsed = BigInt(digits);
      break;
    case 16:
      parsed = BigInt(`0x${digits}`);
      break;
    default: {
      parsed = digits.split("").reduce((acc, char) => {
        const valueForChar = BigInt(parseInt(char, definition.base));
        return acc * BigInt(definition.base) + valueForChar;
      }, 0n);
    }
  }

  return negative ? -parsed : parsed;
};

const fromBigInt = (value: bigint, definition: BaseDefinition): string => {
  const { base } = definition;
  if (value === 0n) {
    return "0";
  }

  const negative = value < 0n;
  let remaining = negative ? -value : value;
  const digits: string[] = [];

  while (remaining > 0n) {
    const remainder = Number(remaining % BigInt(base));
    digits.push(alphabet[remainder]);
    remaining = remaining / BigInt(base);
  }

  const result = digits.reverse().join("");
  return negative ? `-${result}` : result;
};

const convert = ({ value, fromUnit, toUnit }: ConversionArgs) => {
  const fromDefinition = baseMap[fromUnit];
  const toDefinition = baseMap[toUnit];
  if (!fromDefinition || !toDefinition) {
    return "";
  }

  const parsed = toBigInt(value, fromDefinition);
  if (parsed === null) {
    return "";
  }

  return fromBigInt(parsed, toDefinition);
};

export const basePack: ConverterPack = {
  id: "bases",
  label: "Bases",
  icon: "🔢",
  mode: "text",
  categories: [category],
  convert,
  allowSwap: true,
  supportsReverse: true,
};
