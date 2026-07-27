import { diffChars } from 'diff';

import type { DiffSegment } from './types';

const DEFAULT_MAX_COMPUTATION_STEPS = 2_000_000;

const createAbortError = () => {
  try {
    return new DOMException('The diff computation was aborted', 'AbortError');
  } catch (error) {
    const abortError = new Error('The diff computation was aborted');
    abortError.name = 'AbortError';
    return abortError;
  }
};

export interface MyersDiffOptions {
  maxComputationSteps?: number;
  shouldCancel?: () => boolean;
}

export const myersDiff = (
  left: string,
  right: string,
  options: MyersDiffOptions = {},
): DiffSegment[] => {
  const { shouldCancel } = options;
  if (shouldCancel?.()) {
    throw createAbortError();
  }

  const maxSteps = options.maxComputationSteps ?? DEFAULT_MAX_COMPUTATION_STEPS;
  if (left.length * right.length > maxSteps) {
    throw new Error('Diff exceeded maximum computation steps');
  }

  const parts = diffChars(left, right);
  if (shouldCancel?.()) {
    throw createAbortError();
  }

  return parts
    .map(part => ({
      type: part.added ? ('insert' as const) : part.removed ? ('delete' as const) : ('equal' as const),
      text: part.value,
    }))
    .filter(segment => segment.text.length > 0);
};

export const diffText = (
  left: string,
  right: string,
  options?: MyersDiffOptions,
): DiffSegment[] => myersDiff(left, right, options);
