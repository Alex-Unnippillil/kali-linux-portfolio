export type FormStatus = 'Idle' | 'Dirty' | 'Valid' | 'Running' | 'Done';

export type FormEffect = 'submit' | 'success' | 'error' | 'reset';

export type FormEvent =
  | { type: 'CHANGE' }
  | { type: 'VALID' }
  | { type: 'INVALID'; error?: string | null }
  | { type: 'SUBMIT'; payload?: unknown }
  | { type: 'RESOLVE'; result?: unknown }
  | { type: 'REJECT'; error?: string | null }
  | { type: 'RESET' }
  | { type: 'CANCEL' };

export interface FormState {
  status: FormStatus;
  error: string | null;
  isDirty: boolean;
  isBusy: boolean;
  canSubmit: boolean;
  touched: boolean;
  submissionCount: number;
  lastEvent: FormEvent['type'] | null;
  effect: FormEffect | null;
  effectId: number;
  payload?: unknown;
  result?: unknown;
  updatedAt: number;
}

export const createInitialFormState = (): FormState => ({
  status: 'Idle',
  error: null,
  isDirty: false,
  isBusy: false,
  canSubmit: false,
  touched: false,
  submissionCount: 0,
  lastEvent: null,
  effect: null,
  effectId: 0,
  payload: undefined,
  result: undefined,
  updatedAt: Date.now(),
});

const derive = (
  prev: FormState,
  status: FormStatus,
  overrides: Partial<FormState>,
  event: FormEvent,
  effect: FormEffect | null,
  payload?: unknown,
  result?: unknown
): FormState => {
  const next: FormState = {
    ...prev,
    ...overrides,
    status,
    isDirty: status === 'Dirty' || status === 'Running',
    isBusy: status === 'Running',
    canSubmit: status === 'Valid' || status === 'Done',
    touched: prev.touched || status !== 'Idle',
    submissionCount:
      status === 'Running' && event.type === 'SUBMIT'
        ? prev.submissionCount + 1
        : prev.submissionCount,
    lastEvent: event.type,
    effect,
    effectId: effect ? prev.effectId + 1 : prev.effectId,
    updatedAt: Date.now(),
  };

  if (overrides.error !== undefined) {
    next.error = overrides.error;
  } else if (status === 'Dirty') {
    next.error = prev.error;
  } else if (status === 'Running') {
    next.error = null;
  } else {
    next.error = null;
  }

  if (payload !== undefined) {
    next.payload = payload;
  } else if (status === 'Idle' || status === 'Dirty') {
    next.payload = undefined;
  } else {
    next.payload = prev.payload;
  }

  if (result !== undefined) {
    next.result = result;
  } else if (status !== 'Done') {
    next.result = undefined;
  } else {
    next.result = prev.result;
  }

  if (status === 'Idle') {
    next.error = null;
    next.isDirty = false;
    next.isBusy = false;
    next.canSubmit = false;
    next.touched = false;
    next.payload = undefined;
    next.result = undefined;
    next.submissionCount = 0;
  }

  return next;
};

export const transition = (state: FormState, event: FormEvent): FormState => {
  switch (state.status) {
    case 'Idle': {
      if (event.type === 'CHANGE') {
        return derive(state, 'Dirty', { error: null }, event, null);
      }
      if (event.type === 'RESET') {
        return createInitialFormState();
      }
      return state;
    }
    case 'Dirty': {
      if (event.type === 'CHANGE') {
        return derive(state, 'Dirty', { error: null }, event, null);
      }
      if (event.type === 'VALID') {
        return derive(state, 'Valid', { error: null }, event, null);
      }
      if (event.type === 'INVALID') {
        return derive(
          state,
          'Dirty',
          { error: event.error ?? 'Invalid form' },
          event,
          'error'
        );
      }
      if (event.type === 'RESET') {
        return createInitialFormState();
      }
      return state;
    }
    case 'Valid': {
      if (event.type === 'CHANGE') {
        return derive(state, 'Dirty', {}, event, null);
      }
      if (event.type === 'SUBMIT') {
        return derive(state, 'Running', { error: null }, event, 'submit', event.payload);
      }
      if (event.type === 'RESET') {
        return createInitialFormState();
      }
      if (event.type === 'INVALID') {
        return derive(
          state,
          'Dirty',
          { error: event.error ?? 'Invalid form' },
          event,
          'error'
        );
      }
      return state;
    }
    case 'Running': {
      if (event.type === 'RESOLVE') {
        return derive(state, 'Done', { error: null }, event, 'success', state.payload, event.result);
      }
      if (event.type === 'REJECT') {
        return derive(
          state,
          'Dirty',
          { error: event.error ?? 'Submission failed' },
          event,
          'error'
        );
      }
      if (event.type === 'CANCEL') {
        return derive(state, 'Dirty', { error: null }, event, 'reset');
      }
      if (event.type === 'RESET') {
        return createInitialFormState();
      }
      if (event.type === 'CHANGE') {
        return derive(state, 'Dirty', { error: null }, event, null);
      }
      return state;
    }
    case 'Done': {
      if (event.type === 'CHANGE') {
        return derive(state, 'Dirty', { error: null }, event, null);
      }
      if (event.type === 'SUBMIT') {
        return derive(
          state,
          'Running',
          { error: null },
          event,
          'submit',
          event.payload ?? state.payload
        );
      }
      if (event.type === 'RESET') {
        return createInitialFormState();
      }
      return state;
    }
    default:
      return state;
  }
};

export const guardedTransition = (state: FormState, event: FormEvent): FormState => {
  if (event.type === 'SUBMIT' && state.status !== 'Valid' && state.status !== 'Done') {
    return state;
  }
  if (event.type === 'VALID' && state.status === 'Idle') {
    return state;
  }
  return transition(state, event);
};
