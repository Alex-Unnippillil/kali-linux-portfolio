export interface TemplateFieldDiff {
  key: string;
  currentValue: unknown;
  templateValue: unknown;
  changed: boolean;
  apply: boolean;
}

type Primitive = string | number | boolean | null;

type NormalizedValue = Primitive | NormalizedValue[] | { [key: string]: NormalizedValue };

const normalizeValue = (value: unknown): NormalizedValue => {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeValue(item)) as NormalizedValue[];
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, val]) => [key, normalizeValue(val)] as const);
    return entries.reduce<Record<string, NormalizedValue>>((acc, [key, val]) => {
      acc[key] = val;
      return acc;
    }, {});
  }
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    value === null
  ) {
    return value as Primitive;
  }
  return null;
};

const normalizedEqual = (a: unknown, b: unknown): boolean => {
  return JSON.stringify(normalizeValue(a)) === JSON.stringify(normalizeValue(b));
};

export const isEmptyValue = (value: unknown): boolean => {
  if (value == null) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value as object).length === 0;
  return false;
};

export const computeTemplateDiff = (
  fields: Record<string, unknown>,
  currentValues: Record<string, unknown>
): TemplateFieldDiff[] => {
  return Object.entries(fields).map(([key, templateValue]) => {
    const currentValue = currentValues[key];
    const changed = !normalizedEqual(currentValue, templateValue);
    const apply = changed && isEmptyValue(currentValue);
    return { key, currentValue, templateValue, changed, apply };
  });
};

export const updateDiffSelection = (
  diffs: TemplateFieldDiff[],
  key: string,
  apply: boolean
): TemplateFieldDiff[] =>
  diffs.map((diff) => (diff.key === key ? { ...diff, apply } : diff));

export const formatTemplateValue = (value: unknown): string => {
  if (value == null) return '—';
  if (typeof value === 'string') return value.length ? value : '—';
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    if (value.every((item) => typeof item === 'string')) {
      return (value as string[]).join(', ') || '—';
    }
    if (
      value.every(
        (item) =>
          item && typeof item === 'object' && 'name' in (item as Record<string, unknown>)
      )
    ) {
      return (value as Array<Record<string, unknown>>)
        .map((item) => String(item.name))
        .join(', ');
    }
    return JSON.stringify(value, null, 2);
  }
  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2);
  }
  return '—';
};
