export const SHOW_BETA_BADGE = process.env.NEXT_PUBLIC_SHOW_BETA === '1';
export const UI_EXPERIMENTS_ENABLED = process.env.NEXT_PUBLIC_UI_EXPERIMENTS === 'true';

export const GHIDRA_WASM_URL = process.env.NEXT_PUBLIC_GHIDRA_WASM ?? '';
export const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ?? '';
export const EMAIL_SERVICE_ID = process.env.NEXT_PUBLIC_SERVICE_ID ?? '';
export const EMAIL_TEMPLATE_ID = process.env.NEXT_PUBLIC_TEMPLATE_ID ?? '';
export const EMAIL_USER_ID = process.env.NEXT_PUBLIC_USER_ID ?? '';
export const YOUTUBE_API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY ?? '';
export const CURRENCY_API_URL = process.env.NEXT_PUBLIC_CURRENCY_API_URL ?? '';

export const IS_STATIC_EXPORT = process.env.NEXT_PUBLIC_STATIC_EXPORT === 'true';
export const IS_DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
