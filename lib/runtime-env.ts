import { validateServerEnv } from './validate';

type ValidationResult = ReturnType<typeof validateServerEnv> | null;

type ValidationError = unknown;

let cachedEnv: ValidationResult = null;
let validationError: ValidationError = null;
let attempted = false;

function runValidation() {
  if (attempted) return;
  attempted = true;
  try {
    cachedEnv = validateServerEnv(process.env);
  } catch (error) {
    validationError = error;
    console.warn('Missing env vars; running without validation');
  }
}

export function ensureServerEnv() {
  runValidation();
  return cachedEnv;
}

export function assertServerEnv() {
  runValidation();
  if (validationError) {
    throw validationError;
  }
  return cachedEnv;
}

export function getServerEnvValidationError() {
  runValidation();
  return validationError;
}
