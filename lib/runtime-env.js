const { validateServerEnv } = require('./validate.js');

let cachedEnv = null;
let validationError = null;
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

function ensureServerEnv() {
  runValidation();
  return cachedEnv;
}

function assertServerEnv() {
  runValidation();
  if (validationError) {
    throw validationError;
  }
  return cachedEnv;
}

function getServerEnvValidationError() {
  runValidation();
  return validationError;
}

module.exports = {
  ensureServerEnv,
  assertServerEnv,
  getServerEnvValidationError,
};
