import {
  AppAttentionState,
  AppAttentionStateMap,
  DEFAULT_ATTENTION_STATE,
  buildInitialAttentionState,
} from '../data/apps.config';

export const TASKBAR_ATTENTION_EVENT = 'taskbar-attention';

export interface TaskbarAttentionDetail {
  id: string;
  badgeCount?: number;
  delta?: number;
  pulse?: boolean;
  clear?: boolean;
}

export type TaskbarAttentionAction =
  | { type: 'sync'; ids: string[] }
  | { type: 'update'; id: string; detail: TaskbarAttentionDetail };

const clampBadgeCount = (value: number): number => {
  if (!Number.isFinite(value)) {
    return DEFAULT_ATTENTION_STATE.badgeCount;
  }
  return Math.max(0, Math.min(99, Math.floor(value)));
};

const mergeAttentionState = (
  current: AppAttentionState,
  detail: TaskbarAttentionDetail
): AppAttentionState => {
  let badge = current.badgeCount;
  let pulse = current.pulse;

  if (detail.clear) {
    badge = DEFAULT_ATTENTION_STATE.badgeCount;
    pulse = DEFAULT_ATTENTION_STATE.pulse;
  }

  if (typeof detail.badgeCount === 'number') {
    badge = clampBadgeCount(detail.badgeCount);
  }

  if (typeof detail.delta === 'number' && detail.delta !== 0) {
    badge = clampBadgeCount(badge + detail.delta);
  }

  if (typeof detail.pulse === 'boolean') {
    pulse = detail.pulse;
  }

  return {
    badgeCount: badge,
    pulse,
  };
};

export const taskbarAttentionReducer = (
  state: AppAttentionStateMap,
  action: TaskbarAttentionAction
): AppAttentionStateMap => {
  switch (action.type) {
    case 'sync':
      return buildInitialAttentionState(action.ids, state);
    case 'update': {
      if (!action.id) return state;
      const nextState: AppAttentionStateMap = { ...state };
      const current = nextState[action.id] ?? DEFAULT_ATTENTION_STATE;
      nextState[action.id] = mergeAttentionState(current, action.detail);
      return nextState;
    }
    default:
      return state;
  }
};

export const hydrateAttentionState = (
  ids: string[],
  seed?: AppAttentionStateMap
): AppAttentionStateMap => buildInitialAttentionState(ids, seed ?? {});

export const dispatchTaskbarAttention = (
  detail: TaskbarAttentionDetail
): void => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent<TaskbarAttentionDetail>(TASKBAR_ATTENTION_EVENT, {
      detail,
    })
  );
};
