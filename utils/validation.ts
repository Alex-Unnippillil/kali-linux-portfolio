export interface ValidationResult<T> {
  valid: boolean;
  value?: T;
  error?: string;
}

export type ConditionEvaluator = (context: Record<string, unknown>) => boolean;

export function validateRegex(
  pattern: string,
  flags = ''
): ValidationResult<RegExp> {
  if (!pattern) {
    return { valid: true };
  }

  try {
    return { valid: true, value: new RegExp(pattern, flags) };
  } catch (error) {
    return {
      valid: false,
      error:
        error instanceof Error
          ? error.message
          : 'Invalid regular expression',
    };
  }
}

export function validateCondition(
  condition: string
): ValidationResult<ConditionEvaluator> {
  if (!condition || !condition.trim()) {
    return { valid: true, value: () => true };
  }

  const expression = condition.trim();

  try {
    const evaluator = new Function(
      'context',
      `"use strict"; const ctx = context ?? {}; const { appId = '', title = '', width = 0, height = 0, isMaximized = false } = ctx; return Boolean(${expression});`
    ) as ConditionEvaluator;

    return {
      valid: true,
      value: (context: Record<string, unknown>) => {
        try {
          return Boolean(evaluator(context ?? {}));
        } catch (error) {
          throw error instanceof Error
            ? error
            : new Error(String(error));
        }
      },
    };
  } catch (error) {
    return {
      valid: false,
      error:
        error instanceof Error
          ? error.message
          : 'Invalid condition expression',
    };
  }
}

export function runCondition(
  condition: string,
  context: Record<string, unknown>
): ValidationResult<boolean> {
  const validation = validateCondition(condition);
  if (!validation.valid) {
    return { valid: false, error: validation.error };
  }

  if (!validation.value) {
    return { valid: true, value: true };
  }

  try {
    return { valid: true, value: validation.value(context) };
  } catch (error) {
    return {
      valid: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to evaluate condition',
    };
  }
}
