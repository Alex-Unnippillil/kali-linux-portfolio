export type DeterministicJSONValue =
  | null
  | boolean
  | number
  | string
  | DeterministicJSONValue[]
  | { [key: string]: DeterministicJSONValue };

const TYPE_TAG = '$$deterministicType';
const VALUE_TAG = 'value';

type CanonicalValue = DeterministicJSONValue | undefined;

type SeenSet = WeakSet<object>;

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (value === null || typeof value !== 'object') return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
};

const createTaggedValue = (type: string, value: string): Record<string, DeterministicJSONValue> => ({
  [TYPE_TAG]: type,
  [VALUE_TAG]: value,
});

const normalizeNumber = (value: number): number | null =>
  Number.isFinite(value) ? value : null;

const normalizeArrayBufferView = (value: ArrayBufferView, seen: SeenSet): DeterministicJSONValue => {
  const view = value as unknown as { readonly length: number; readonly [index: number]: number };
  const result: DeterministicJSONValue[] = [];
  for (let i = 0; i < view.length; i += 1) {
    result.push(normalizeValue(view[i], seen, true) as DeterministicJSONValue);
  }
  return result;
};

function normalizeValue(value: unknown, seen: SeenSet, inArray: boolean): CanonicalValue {
  if (value === null) return null;
  const valueType = typeof value;

  if (valueType === 'string' || valueType === 'boolean') {
    return value as string | boolean;
  }

  if (valueType === 'number') {
    return normalizeNumber(value as number);
  }

  if (valueType === 'bigint') {
    return createTaggedValue('bigint', (value as bigint).toString());
  }

  if (valueType === 'undefined' || valueType === 'function' || valueType === 'symbol') {
    return inArray ? null : undefined;
  }

  if (value instanceof Date) {
    return value.toJSON();
  }

  if (Array.isArray(value)) {
    return (value as unknown[]).map(item => normalizeValue(item, seen, true)) as DeterministicJSONValue[];
  }

  if (ArrayBuffer.isView(value) && !(value instanceof DataView)) {
    return normalizeArrayBufferView(value as ArrayBufferView, seen);
  }

  if (valueType === 'object' && value !== null) {
    if (seen.has(value as object)) {
      throw new TypeError('Converting circular structure to JSON');
    }
    seen.add(value as object);

    try {
      const maybeToJSON = (value as { toJSON?: () => unknown }).toJSON;
      if (typeof maybeToJSON === 'function') {
        const jsonValue = maybeToJSON.call(value);
        return normalizeValue(jsonValue, seen, inArray);
      }

      if (!isPlainObject(value)) {
        const entries = Object.entries(value as Record<string | symbol, unknown>)
          .filter(([key]) => typeof key === 'string')
          .map(([key, v]) => [key, normalizeValue(v, seen, false)] as const)
          .filter(([, v]) => v !== undefined)
          .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

        return entries.reduce<Record<string, DeterministicJSONValue>>((acc, [key, v]) => {
          acc[key] = v as DeterministicJSONValue;
          return acc;
        }, {});
      }

      const keys = Object.keys(value as Record<string, unknown>).sort();
      const result: Record<string, DeterministicJSONValue> = {};

      for (const key of keys) {
        const normalized = normalizeValue((value as Record<string, unknown>)[key], seen, false);
        if (normalized !== undefined) {
          result[key] = normalized as DeterministicJSONValue;
        }
      }

      return result;
    } finally {
      seen.delete(value as object);
    }
  }

  return undefined;
}

export const deterministicStringify = (value: unknown): string | undefined => {
  const normalized = normalizeValue(value, new WeakSet(), false);
  if (normalized === undefined) {
    return undefined;
  }
  return JSON.stringify(normalized);
};

export const deterministicEquals = (a: unknown, b: unknown): boolean =>
  deterministicStringify(a) === deterministicStringify(b);

export const parseDeterministicJSON = (json: string): unknown => {
  const revive = (input: unknown): unknown => {
    if (input === null || typeof input !== 'object') return input;
    if (Array.isArray(input)) {
      return input.map(revive);
    }
    const record = input as Record<string, unknown>;
    if (record[TYPE_TAG] === 'bigint' && typeof record[VALUE_TAG] === 'string') {
      try {
        return BigInt(record[VALUE_TAG]);
      } catch {
        return record[VALUE_TAG];
      }
    }
    return Object.keys(record).reduce<Record<string, unknown>>((acc, key) => {
      acc[key] = revive(record[key]);
      return acc;
    }, {});
  };

  return revive(JSON.parse(json));
};

export default deterministicStringify;
