import { DependencyList, useCallback, useEffect, useMemo, useReducer } from 'react';
import {
  FormEffect,
  FormEvent,
  FormState,
  FormStatus,
  createInitialFormState,
  guardedTransition,
} from '../utils/fsm/formFSM';

type EffectCallback = (state: FormState) => void | (() => void);

type EffectHook = (callback: EffectCallback, deps?: DependencyList) => void;

const reducer = (state: FormState, event: FormEvent) => guardedTransition(state, event);

const createEffectHook = (state: FormState, effectName: FormEffect): EffectHook => {
  return (callback, deps = []) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => {
      if (state.effect === effectName) {
        return callback(state);
      }
      return undefined;
    }, [state.effectId, state.effect, ...deps]);
  };
};

export interface UseFormFSMResult {
  state: FormState;
  status: FormStatus;
  error: string | null;
  change: () => void;
  validate: () => void;
  invalidate: (message?: string | null) => void;
  submit: (payload?: unknown) => void;
  resolve: (result?: unknown) => void;
  reject: (message?: string | null) => void;
  reset: () => void;
  cancel: () => void;
  useSubmitEffect: EffectHook;
  useSuccessEffect: EffectHook;
  useErrorEffect: EffectHook;
  useResetEffect: EffectHook;
}

export const useFormFSM = (): UseFormFSMResult => {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialFormState);

  const change = useCallback(() => dispatch({ type: 'CHANGE' }), []);
  const validate = useCallback(() => dispatch({ type: 'VALID' }), []);
  const invalidate = useCallback(
    (message?: string | null) => dispatch({ type: 'INVALID', error: message }),
    []
  );
  const submit = useCallback(
    (payload?: unknown) => dispatch({ type: 'SUBMIT', payload }),
    []
  );
  const resolve = useCallback(
    (result?: unknown) => dispatch({ type: 'RESOLVE', result }),
    []
  );
  const reject = useCallback(
    (message?: string | null) => dispatch({ type: 'REJECT', error: message }),
    []
  );
  const reset = useCallback(() => dispatch({ type: 'RESET' }), []);
  const cancel = useCallback(() => dispatch({ type: 'CANCEL' }), []);

  const effectHooks = useMemo(() => {
    return {
      submit: createEffectHook(state, 'submit'),
      success: createEffectHook(state, 'success'),
      error: createEffectHook(state, 'error'),
      reset: createEffectHook(state, 'reset'),
    };
  }, [state]);

  return {
    state,
    status: state.status,
    error: state.error,
    change,
    validate,
    invalidate,
    submit,
    resolve,
    reject,
    reset,
    cancel,
    useSubmitEffect: effectHooks.submit,
    useSuccessEffect: effectHooks.success,
    useErrorEffect: effectHooks.error,
    useResetEffect: effectHooks.reset,
  };
};

export default useFormFSM;
