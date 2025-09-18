const { z } = require('zod');

const requiredString = (name, hint) =>
  z
    .string({
      required_error: `${name} is required. ${hint}`,
      invalid_type_error: `${name} must be a string`,
    })
    .trim()
    .min(1, `${name} is required. ${hint}`);

const optionalString = z.string().trim().optional();

const publicEnvSchema = z.object({
  NEXT_PUBLIC_ENABLE_ANALYTICS: optionalString,
  NEXT_PUBLIC_VERCEL_ENV: optionalString,
  NEXT_PUBLIC_RECAPTCHA_SITE_KEY: requiredString(
    'NEXT_PUBLIC_RECAPTCHA_SITE_KEY',
    'Set this to the client ReCAPTCHA site key from Google.',
  ),
  NEXT_PUBLIC_TRACKING_ID: optionalString,
  NEXT_PUBLIC_USER_ID: requiredString(
    'NEXT_PUBLIC_USER_ID',
    'Provide the EmailJS public key used by the contact form.',
  ),
  NEXT_PUBLIC_SERVICE_ID: requiredString(
    'NEXT_PUBLIC_SERVICE_ID',
    'Provide the EmailJS service identifier used by the contact form.',
  ),
  NEXT_PUBLIC_TEMPLATE_ID: requiredString(
    'NEXT_PUBLIC_TEMPLATE_ID',
    'Provide the EmailJS template identifier used by the contact form.',
  ),
  NEXT_PUBLIC_YOUTUBE_API_KEY: optionalString,
  NEXT_PUBLIC_CURRENCY_API_URL: optionalString,
  NEXT_PUBLIC_DEMO_MODE: optionalString,
  NEXT_PUBLIC_UI_EXPERIMENTS: optionalString,
  NEXT_PUBLIC_STATIC_EXPORT: optionalString,
  NEXT_PUBLIC_SHOW_BETA: optionalString,
  NEXT_PUBLIC_GHIDRA_WASM: optionalString,
  NEXT_PUBLIC_GHIDRA_URL: optionalString,
  NEXT_PUBLIC_BEEF_URL: optionalString,
  NEXT_PUBLIC_SUPABASE_URL: optionalString,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: optionalString,
});

const serverEnvSchema = publicEnvSchema.extend({
  RECAPTCHA_SECRET: requiredString(
    'RECAPTCHA_SECRET',
    'Set this to the server ReCAPTCHA secret so submissions can be verified.',
  ),
  FEATURE_TOOL_APIS: optionalString,
  FEATURE_HYDRA: optionalString,
  SUPABASE_URL: optionalString,
  SUPABASE_ANON_KEY: optionalString,
  SUPABASE_SERVICE_ROLE_KEY: optionalString,
  ADMIN_READ_KEY: optionalString,
});

const formatErrors = (error) => {
  const { fieldErrors, formErrors } = error.flatten();
  const fieldMessages = Object.entries(fieldErrors).flatMap(([key, errs]) =>
    (errs || []).map((msg) => `${key}: ${msg}`),
  );
  return fieldMessages.concat(formErrors);
};

const parseEnv = (schema, env) => {
  const result = schema.safeParse(env);
  if (!result.success) {
    const messages = formatErrors(result.error);
    throw new Error(
      `Invalid environment configuration:\n${messages
        .map((msg) => ` - ${msg}`)
        .join('\n')}`,
    );
  }
  return result.data;
};

const validatePublicEnv = (env = process.env) => parseEnv(publicEnvSchema, env);

const validateServerEnv = (env = process.env) => parseEnv(serverEnvSchema, env);

module.exports = {
  validatePublicEnv,
  validateServerEnv,
};
