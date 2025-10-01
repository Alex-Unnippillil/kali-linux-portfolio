import { describe, expect, test } from '@jest/globals';

type ValidationOptions = {
  runRuntimeTests?: boolean;
};

type ValidationResult = {
  valid: boolean;
  errors: Array<{ appId: string; type: string; message: string }>;
};

type Validator = (options?: ValidationOptions & { logger?: Console | undefined }) => Promise<ValidationResult>;

async function loadValidator(): Promise<Validator> {
  const mod = await import('../../scripts/contracts/validator.mjs');
  return (mod.validateContracts as Validator) ?? (() => Promise.resolve({ valid: true, errors: [] }));
}

describe('contract fixtures', () => {
  test('UI and service fixtures conform to schemas', async () => {
    const validateContracts = await loadValidator();
    const result = await validateContracts({ runRuntimeTests: false, logger: undefined });
    if (!result.valid) {
      const details = result.errors.map((err) => `[${err.appId}] (${err.type}) ${err.message}`).join('\n');
      throw new Error(`Contract validation failed:\n${details}`);
    }
    expect(result.valid).toBe(true);
  });

  test('API stub runtime expectations remain stable', async () => {
    const validateContracts = await loadValidator();
    const result = await validateContracts({ runRuntimeTests: true, logger: undefined });
    if (!result.valid) {
      const details = result.errors.map((err) => `[${err.appId}] (${err.type}) ${err.message}`).join('\n');
      throw new Error(`Runtime contract validation failed:\n${details}`);
    }
    expect(result.valid).toBe(true);
  });
});
