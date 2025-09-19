const { validatePublicEnv, validateServerEnv } = require('../lib/validate.js');

function runEnvValidationExample() {
  const publicEnv = {
    NEXT_PUBLIC_ENABLE_ANALYTICS: 'true',
    NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'public-anon-key',
  };

  const parsedPublic = validatePublicEnv(publicEnv);

  const serverEnv = {
    ...publicEnv,
    RECAPTCHA_SECRET: 'dummy-secret',
  };

  const parsedServer = validateServerEnv(serverEnv);

  return { publicEnv: parsedPublic, serverEnv: parsedServer };
}

module.exports = { runEnvValidationExample };
