const SECRET_PATTERN = /password|secret|token|key/i;

function logEnvVars(env = process.env) {
  const keys = Object.keys(env);
  const nonSecret = keys.filter((k) => !SECRET_PATTERN.test(k));
  const secret = keys.filter((k) => SECRET_PATTERN.test(k));

  if (nonSecret.length > 0) {
    console.log('Non-secret env vars:', nonSecret.join(', '));
  }

  if (secret.length > 0) {
    console.log(
      'Redacted env vars:',
      secret.map((k) => `${k}=[REDACTED]`).join(', ')
    );
  }
}

module.exports = { logEnvVars };
