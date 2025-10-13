import { startTransition } from 'react';
import {
  beginInteractionMark,
  endInteractionMark,
  type InteractionMark,
  type InteractionPriority,
} from './marks';

type TaskResult = void | (() => void) | Promise<unknown>;

type InteractionTask = () => TaskResult;

type RunTask = <T extends InteractionTask>(task: T, finalize: () => void) => ReturnType<T>;

const runTask: RunTask = (task, finalize) => {
  let finalized = false;
  const safeFinalize = () => {
    if (finalized) return;
    finalized = true;
    finalize();
  };

  try {
    const result = task();
    if (typeof result === 'function') {
      try {
        (result as () => void)();
      } finally {
        safeFinalize();
      }
      return result;
    }
    if (result && typeof (result as Promise<unknown>).then === 'function') {
      return (result as Promise<unknown>).then(
        (value) => {
          safeFinalize();
          return value as ReturnType<T>;
        },
        (error) => {
          safeFinalize();
          throw error;
        },
      ) as ReturnType<T>;
    }
    safeFinalize();
    return result;
  } catch (error) {
    safeFinalize();
    throw error;
  }
};

const beginMark = (label: string, priority: InteractionPriority): InteractionMark | null =>
  beginInteractionMark(label, priority);

const endMark = (mark: InteractionMark | null) => {
  endInteractionMark(mark);
};

export const runUserBlockingUpdate = <T extends InteractionTask>(
  label: string,
  task: T,
): ReturnType<T> => {
  const mark = beginMark(label, 'user-blocking');
  return runTask(task, () => endMark(mark));
};

export const runTransitionUpdate = <T extends InteractionTask>(label: string, task: T): void => {
  const mark = beginMark(label, 'transition');
  startTransition(() => {
    runTask(task, () => endMark(mark));
  });
};

