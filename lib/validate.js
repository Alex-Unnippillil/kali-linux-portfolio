const { z } = require('zod');

const optionalString = () => z.string().optional();

const requiredString = (name) =>
  z
    .string({
      required_error: `${name} is required`,
      invalid_type_error: `${name} must be a string`,
    })
    .trim()
    .min(1, { message: `${name} cannot be empty` });

const publicEnvSchema = z.object({
  NEXT_PUBLIC_ENABLE_ANALYTICS: optionalString(),
  NEXT_PUBLIC_RECAPTCHA_SITE_KEY: optionalString(),
  NEXT_PUBLIC_TRACKING_ID: optionalString(),
  NEXT_PUBLIC_USER_ID: optionalString(),
  NEXT_PUBLIC_SERVICE_ID: optionalString(),
  NEXT_PUBLIC_TEMPLATE_ID: optionalString(),
  NEXT_PUBLIC_YOUTUBE_API_KEY: optionalString(),
  NEXT_PUBLIC_CURRENCY_API_URL: optionalString(),
  NEXT_PUBLIC_DEMO_MODE: optionalString(),
  NEXT_PUBLIC_UI_EXPERIMENTS: optionalString(),
  NEXT_PUBLIC_GHIDRA_WASM: optionalString(),
  NEXT_PUBLIC_GHIDRA_URL: optionalString(),
  NEXT_PUBLIC_SUPABASE_URL: optionalString(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: optionalString(),
});

const serverEnvSchema = publicEnvSchema.extend({
  RECAPTCHA_SECRET: requiredString('RECAPTCHA_SECRET'),
  SUPABASE_URL: optionalString(),
  SUPABASE_SERVICE_ROLE_KEY: optionalString(),
  SUPABASE_ANON_KEY: optionalString(),
});

function formatValidationError(result) {
  if (result.success) {
    return result.data;
  }

  const missingVariables = new Set();
  const otherIssues = new Set();

  for (const issue of result.error.issues) {
    const path = issue.path.join('.') || '(root)';
    if (issue.code === 'invalid_type' && issue.received === 'undefined') {
      missingVariables.add(path);
      continue;
    }

    const baseMessage = issue.message || `${path} failed validation (${issue.code})`;
    if (baseMessage.includes(path)) {
      otherIssues.add(baseMessage);
    } else {
      otherIssues.add(`${path}: ${baseMessage}`);
    }
  }

  const lines = ['Environment validation failed.'];

  if (missingVariables.size > 0) {
    lines.push('Missing required environment variables:');
    for (const variable of missingVariables) {
      lines.push(`  - ${variable}`);
    }
  }

  if (otherIssues.size > 0) {
    lines.push('Additional issues detected:');
    for (const issue of otherIssues) {
      lines.push(`  - ${issue}`);
    }
  }

  lines.push('Check your .env.local file or configure the secrets in your CI environment.');

  throw new Error(lines.join('\n'));
}

function validatePublicEnv(env) {
  return formatValidationError(publicEnvSchema.safeParse(env));
}

function validateServerEnv(env) {
  return formatValidationError(serverEnvSchema.safeParse(env));
}

module.exports = { validatePublicEnv, validateServerEnv };
