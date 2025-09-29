'use client';

import packageJson from '../package.json';

const FALLBACK_VERSION = '0.0.0';

export const APP_VERSION: string =
  process.env.NEXT_PUBLIC_APP_VERSION || packageJson.version || FALLBACK_VERSION;

export const QUICK_SETTINGS_STORAGE_KEY = `quick-settings:${APP_VERSION}`;
