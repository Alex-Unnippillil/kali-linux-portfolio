import { JsonDiffEntry } from './types';
import { diffJson } from './jsonDiff';

const clonePath = (path: Array<string | number>, addition: string | number) => [...path, addition];

export const diffArray = (
  left: unknown[],
  right: unknown[],
  path: Array<string | number> = [],
): JsonDiffEntry[] => {
  const result: JsonDiffEntry[] = [];
  const maxLength = Math.max(left.length, right.length);
  for (let index = 0; index < maxLength; index += 1) {
    const leftValue = left[index];
    const rightValue = right[index];
    const nextPath = clonePath(path, index);
    if (index >= left.length) {
      result.push({ path: nextPath, kind: 'added', after: rightValue });
      continue;
    }
    if (index >= right.length) {
      result.push({ path: nextPath, kind: 'removed', before: leftValue });
      continue;
    }
    if (Array.isArray(leftValue) && Array.isArray(rightValue)) {
      result.push(...diffArray(leftValue, rightValue, nextPath));
      continue;
    }
    if (
      typeof leftValue === 'object' &&
      leftValue !== null &&
      typeof rightValue === 'object' &&
      rightValue !== null &&
      !Array.isArray(rightValue)
    ) {
      result.push(...diffJson(leftValue, rightValue, nextPath));
      continue;
    }
    if (Object.is(leftValue, rightValue)) {
      result.push({ path: nextPath, kind: 'unchanged', before: leftValue, after: rightValue });
    } else {
      result.push({ path: nextPath, kind: 'changed', before: leftValue, after: rightValue });
    }
  }
  return result;
};
