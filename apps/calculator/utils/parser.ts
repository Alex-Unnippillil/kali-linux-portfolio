import { safeEvaluate, type EngineConfig } from '../engine';

export function evaluate(expression: string, options: EngineConfig) {
  const result = safeEvaluate(expression, options);
  if (!result.ok) {
    throw new Error(result.error.message);
  }
  return result.value;
}
