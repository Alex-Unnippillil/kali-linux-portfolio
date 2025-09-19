import { ZodError } from 'zod';
import {
  formatServerEnvIssues,
  validateServerEnv,
} from './lib/validate';

export type ServerEnv = ReturnType<typeof validateServerEnv>;

function isCiEnv(value: NodeJS.ProcessEnv['CI']) {
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true' || value === '1';
  }
  if (typeof value === 'boolean') {
    return value;
  }
  return false;
}

export function loadServerEnv(
  env: NodeJS.ProcessEnv = process.env,
  {
    fatalOnError = isCiEnv(env.CI),
    logger = console,
  }: { fatalOnError?: boolean; logger?: Pick<typeof console, 'warn'> } = {}
): ServerEnv | null {
  try {
    return validateServerEnv(env);
  } catch (error) {
    if (error instanceof ZodError) {
      const message = `Invalid environment configuration:\n  - ${formatServerEnvIssues(error)}`;
      if (fatalOnError) {
        throw new Error(message);
      }
      logger?.warn?.(message);
      return null;
    }
    throw error;
  }
}

