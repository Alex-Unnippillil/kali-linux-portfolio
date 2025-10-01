/**
 * Validate that all required environment variables are present.
 * @param {NodeJS.ProcessEnv} env
 * @throws {Error} If any required variable is missing.
 */
function validateServerEnv() {
  // All server environment variables are optional.
}

module.exports = { validateServerEnv };
