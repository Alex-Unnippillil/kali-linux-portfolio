import { useRouter } from 'next/router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export interface WizardValidationContext<Data, AllData extends Record<string, unknown>> {
  data: Data;
  allData: AllData;
}

export type WizardValidator<Data, AllData extends Record<string, unknown>> = (
  context: WizardValidationContext<Data, AllData>,
) => string | null | undefined;

export interface WizardStepConfig<Data = unknown, AllData extends Record<string, unknown> = Record<string, unknown>> {
  id: string;
  initialData?: Data;
  validate?: WizardValidator<Data, AllData>;
}

export interface WizardController<AllData extends Record<string, unknown>> {
  currentStepId: string;
  currentStepIndex: number;
  stepOrder: string[];
  stepData: AllData;
  stepErrors: Record<string, string>;
  goToStep: (stepId: string, options?: { force?: boolean }) => boolean;
  goNext: () => boolean;
  goBack: () => boolean;
  updateStepData: <Key extends keyof AllData>(
    stepId: Key,
    value: AllData[Key] | ((previous: AllData[Key]) => AllData[Key]),
  ) => void;
  resetTo: (stepId?: string) => void;
  isFirst: boolean;
  isLast: boolean;
}

export interface UseWizardControllerOptions<AllData extends Record<string, unknown>> {
  steps: WizardStepConfig<any, AllData>[];
  paramName?: string;
  defaultStepId?: string;
}

const getQueryValue = (value: string | string[] | undefined): string | undefined => {
  if (Array.isArray(value)) {
    return value[value.length - 1];
  }
  return value;
};

function useWizardController<AllData extends Record<string, unknown>>(
  options: UseWizardControllerOptions<AllData>,
): WizardController<AllData> {
  const { steps, paramName = 'step', defaultStepId } = options;
  const router = useRouter();

  const stepOrder = useMemo(() => steps.map((step) => step.id), [steps]);

  const initialData = useMemo(() => {
    const seed = {} as AllData;
    for (const step of steps) {
      const value = step.initialData as AllData[keyof AllData] | undefined;
      if (value !== undefined) {
        seed[step.id as keyof AllData] = value;
      }
    }
    return seed;
  }, [steps]);

  const [stepData, setStepData] = useState<AllData>(initialData);
  const [currentStepId, setCurrentStepId] = useState<string>(() => {
    if (defaultStepId && stepOrder.includes(defaultStepId)) {
      return defaultStepId;
    }
    return stepOrder[0] ?? '';
  });
  const [stepErrors, setStepErrors] = useState<Record<string, string>>({});

  const stepDataRef = useRef(stepData);
  const currentStepIdRef = useRef(currentStepId);
  const initialDataRef = useRef(initialData);
  const hasHydratedFromUrl = useRef(false);

  useEffect(() => {
    stepDataRef.current = stepData;
  }, [stepData]);

  useEffect(() => {
    currentStepIdRef.current = currentStepId;
  }, [currentStepId]);

  useEffect(() => {
    initialDataRef.current = initialData;
  }, [initialData]);

  const validateStep = useCallback(
    (index: number): string | null => {
      if (index < 0 || index >= steps.length) {
        return null;
      }
      const config = steps[index];
      const validator = config.validate as WizardValidator<unknown, AllData> | undefined;
      if (!validator) {
        setStepErrors((prev) => {
          if (prev[config.id] == null) {
            return prev;
          }
          const next = { ...prev };
          delete next[config.id];
          return next;
        });
        return null;
      }

      const value = stepDataRef.current[config.id as keyof AllData];
      const result = validator({
        data: value,
        allData: stepDataRef.current,
      } as WizardValidationContext<unknown, AllData>);

      const normalized = result ?? null;
      setStepErrors((prev) => {
        if (normalized == null) {
          if (prev[config.id] == null) {
            return prev;
          }
          const next = { ...prev };
          delete next[config.id];
          return next;
        }
        if (prev[config.id] === normalized) {
          return prev;
        }
        return { ...prev, [config.id]: normalized };
      });
      return normalized;
    },
    [steps],
  );

  const validateStepsBefore = useCallback(
    (targetIndex: number): { index: number; error: string } | null => {
      for (let i = 0; i < targetIndex; i += 1) {
        const error = validateStep(i);
        if (error) {
          return { index: i, error };
        }
      }
      return null;
    },
    [validateStep],
  );

  const goToIndex = useCallback(
    (targetIndex: number, options?: { force?: boolean }) => {
      if (targetIndex < 0 || targetIndex >= stepOrder.length) {
        return false;
      }
      const { force = false } = options ?? {};
      const currentIndex = stepOrder.indexOf(currentStepIdRef.current);

      if (!force && targetIndex > currentIndex) {
        const invalid = validateStepsBefore(targetIndex);
        if (invalid) {
          setCurrentStepId(stepOrder[invalid.index]);
          return false;
        }
      }

      const nextId = stepOrder[targetIndex];
      if (!nextId) {
        return false;
      }
      setCurrentStepId(nextId);
      return true;
    },
    [stepOrder, validateStepsBefore],
  );

  const goToStep = useCallback(
    (stepId: string, options?: { force?: boolean }) => {
      const targetIndex = stepOrder.indexOf(stepId);
      if (targetIndex === -1) {
        return false;
      }
      return goToIndex(targetIndex, options);
    },
    [goToIndex, stepOrder],
  );

  const goNext = useCallback(() => {
    const currentIndex = stepOrder.indexOf(currentStepIdRef.current);
    if (currentIndex === -1 || currentIndex >= stepOrder.length - 1) {
      return false;
    }
    return goToIndex(currentIndex + 1);
  }, [goToIndex, stepOrder]);

  const goBack = useCallback(() => {
    const currentIndex = stepOrder.indexOf(currentStepIdRef.current);
    if (currentIndex <= 0) {
      return false;
    }
    return goToIndex(currentIndex - 1, { force: true });
  }, [goToIndex, stepOrder]);

  const updateStepData = useCallback(
    <Key extends keyof AllData>(
      stepId: Key,
      value: AllData[Key] | ((previous: AllData[Key]) => AllData[Key]),
    ) => {
      setStepData((prev) => {
        const previousValue = prev[stepId];
        const nextValue = typeof value === 'function' ? (value as (prev: AllData[Key]) => AllData[Key])(previousValue) : value;
        if (previousValue === nextValue) {
          return prev;
        }
        const next = { ...prev, [stepId]: nextValue };
        return next;
      });
      setStepErrors((prev) => {
        if (prev[String(stepId)] == null) {
          return prev;
        }
        const next = { ...prev };
        delete next[String(stepId)];
        return next;
      });
    },
    [],
  );

  const resetTo = useCallback(
    (stepId?: string) => {
      setStepData(initialDataRef.current);
      setStepErrors({});
      const fallbackId = stepId && stepOrder.includes(stepId) ? stepId : stepOrder[0];
      if (fallbackId) {
        setCurrentStepId(fallbackId);
      }
    },
    [stepOrder],
  );

  useEffect(() => {
    if (!router.isReady || hasHydratedFromUrl.current) {
      return;
    }
    hasHydratedFromUrl.current = true;

    const requested = getQueryValue(router.query[paramName]);
    if (requested && stepOrder.includes(requested)) {
      const requestedIndex = stepOrder.indexOf(requested);
      const invalid = validateStepsBefore(requestedIndex);
      if (invalid) {
        setCurrentStepId(stepOrder[invalid.index]);
        return;
      }
      setCurrentStepId(requested);
    }
  }, [paramName, router.isReady, router.query, stepOrder, validateStepsBefore]);

  useEffect(() => {
    if (!router.isReady || !currentStepId) {
      return;
    }
    const currentQueryValue = getQueryValue(router.query[paramName]);
    if (currentQueryValue === currentStepId) {
      return;
    }
    router.replace(
      {
        pathname: router.pathname,
        query: { ...router.query, [paramName]: currentStepId },
      },
      undefined,
      { shallow: true },
    );
  }, [currentStepId, paramName, router]);

  const currentStepIndex = stepOrder.indexOf(currentStepId);
  const isFirst = currentStepIndex <= 0;
  const isLast = currentStepIndex === stepOrder.length - 1;

  return {
    currentStepId,
    currentStepIndex,
    stepOrder,
    stepData,
    stepErrors,
    goToStep,
    goNext,
    goBack,
    updateStepData,
    resetTo,
    isFirst,
    isLast,
  };
}

export default useWizardController;
