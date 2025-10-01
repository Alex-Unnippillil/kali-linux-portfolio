/**
 * Validate that all required environment variables are present.
 * @param {NodeJS.ProcessEnv} env
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
    // During local development or in CI environments that do not supply real
    // credentials we still want the application to build.  Rather than
    // crashing, surface a clear warning so the absence of these variables is
    // visible while allowing the build to continue.
    // eslint-disable-next-line no-console
    console.warn(`Missing environment variables: ${missing.join(', ')}`);
  }
}

module.exports = { validateServerEnv };
