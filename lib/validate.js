/**
 * Validate that all required environment variables are present.
 * @param {NodeJS.ProcessEnv} env
 * @throws {Error} If any required variable is missing.
 */
function validateServerEnv(env) {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'RATE_LIMIT_SECRET',
    'FLAGS_SECRET',
    'RECAPTCHA_SECRET',
  ];

  const missing = required.filter((name) => !env?.[name]);
  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(', ')}`);
  }
}

module.exports = { validateServerEnv };
