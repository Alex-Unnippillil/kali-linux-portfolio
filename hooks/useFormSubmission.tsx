import { useCallback, useMemo, useRef, useState } from 'react';
import type { SyntheticEvent } from 'react';

export type FormSubmissionStatus = 'success' | 'error';

export interface FormSubmissionResult {
  status?: FormSubmissionStatus;
  message?: string;
  suppressToast?: boolean;
}

type MaybeSubmissionResult = FormSubmissionResult | string | void | null;

interface FormToast {
  status: FormSubmissionStatus;
  message: string;
}

interface UseFormSubmissionOptions<TEvent extends SyntheticEvent> {
  onSubmit: (event: TEvent) => Promise<MaybeSubmissionResult> | MaybeSubmissionResult;
  onSuccess?: (result?: FormSubmissionResult) => void;
  onError?: (error: unknown) => void;
  successMessage?: string | ((result?: FormSubmissionResult) => string | undefined);
  errorMessage?: string | ((error: unknown) => string | undefined);
}

const normalizeResult = (
  value: MaybeSubmissionResult,
): FormSubmissionResult | undefined => {
  if (!value) return undefined;
  if (typeof value === 'string') {
    return { status: 'success', message: value };
  }
  if (typeof value === 'object') {
    return value as FormSubmissionResult;
  }
  return undefined;
};

const defaultSpinner = (
  <span className="inline-flex items-center gap-2">
    <span
      className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
      aria-hidden="true"
    />
    <span className="sr-only">Submitting…</span>
  </span>
);

export function useFormSubmission<TEvent extends SyntheticEvent>(
  options: UseFormSubmissionOptions<TEvent>,
) {
  const { onSubmit, onSuccess, onError, successMessage, errorMessage } = options;
  const [pending, setPending] = useState(false);
  const [toast, setToast] = useState<FormToast | null>(null);
  const pendingRef = useRef(false);

  const spinner = useMemo(() => defaultSpinner, []);

  const dismissToast = useCallback(() => setToast(null), []);

  const submitProps = useMemo(
    () => ({
      disabled: pending,
      'aria-disabled': pending || undefined,
    }),
    [pending],
  );

  const handleSubmit = useCallback(
    async (event: TEvent) => {
      if (pendingRef.current) {
        event.preventDefault?.();
        event.stopPropagation?.();
        return;
      }
      pendingRef.current = true;
      setPending(true);
      setToast(null);
      try {
        const rawResult = await onSubmit(event);
        const normalized = normalizeResult(rawResult);
        const status: FormSubmissionStatus = normalized?.status ?? 'success';
        const suppressToast = normalized?.suppressToast;

        if (status === 'error') {
          if (!suppressToast) {
            const message =
              normalized?.message ??
              (typeof errorMessage === 'function'
                ? errorMessage(normalized)
                : errorMessage);
            if (message) {
              setToast({ status: 'error', message });
            }
          }
          return;
        }

        onSuccess?.(normalized);
        if (!suppressToast) {
          const message =
            normalized?.message ??
            (typeof successMessage === 'function'
              ? successMessage(normalized)
              : successMessage);
          if (message) {
            setToast({ status: 'success', message });
          }
        }
      } catch (error) {
        onError?.(error);
        const message =
          typeof errorMessage === 'function'
            ? errorMessage(error)
            : errorMessage ?? (error instanceof Error ? error.message : 'Submission failed');
        if (message) {
          setToast({ status: 'error', message });
        }
      } finally {
        pendingRef.current = false;
        setPending(false);
      }
    },
    [errorMessage, onError, onSubmit, onSuccess, successMessage],
  );

  return {
    pending,
    handleSubmit,
    spinner,
    toast,
    dismissToast,
    submitProps,
  };
}

export default useFormSubmission;
