import { JsonDiffEntry } from './types';
import { diffArray } from './arrayDiff';

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const deepEqual = (left: unknown, right: unknown): boolean => {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) && Array.isArray(right)) {
    if (left.length !== right.length) return false;
    for (let i = 0; i < left.length; i += 1) {
      if (!deepEqual(left[i], right[i])) return false;
    }
    return true;
  }
  if (isPlainObject(left) && isPlainObject(right)) {
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);
    if (leftKeys.length !== rightKeys.length) return false;
    for (const key of leftKeys) {
      if (!Object.prototype.hasOwnProperty.call(right, key)) return false;
      if (!deepEqual(left[key], right[key])) return false;
    }
    return true;
  }
  return false;
};

export const diffJson = (
  left: unknown,
  right: unknown,
  path: Array<string | number> = [],
): JsonDiffEntry[] => {
  if (deepEqual(left, right)) {
    return [
      {
        path,
        kind: 'unchanged',
        before: left,
        after: right,
      },
    ];
  }

  if (Array.isArray(left) && Array.isArray(right)) {
    return diffArray(left, right, path);
  }

  if (isPlainObject(left) && isPlainObject(right)) {
    const result: JsonDiffEntry[] = [];
    const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
    keys.forEach(key => {
      const nextPath = [...path, key];
      if (!Object.prototype.hasOwnProperty.call(right, key)) {
        result.push({ path: nextPath, kind: 'removed', before: left[key] });
        return;
      }
      if (!Object.prototype.hasOwnProperty.call(left, key)) {
        result.push({ path: nextPath, kind: 'added', after: right[key] });
        return;
      }
      result.push(...diffJson(left[key], right[key], nextPath));
    });
    return result;
  }

  if (Array.isArray(left)) {
    return diffArray(left, Array.isArray(right) ? right : [], path);
  }
  if (Array.isArray(right)) {
    return diffArray(Array.isArray(left) ? left : [], right, path);
  }

  return [
    {
      path,
      kind: 'changed',
      before: left,
      after: right,
    },
  ];
};

export const isDeepEqual = deepEqual;
export const isObjectLike = isPlainObject;
