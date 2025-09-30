import type { NextApiRequest, NextApiResponse } from 'next';

const NORMALIZE_TRUE = new Set(['1', 'true', 'enabled', 'on']);

const normalizeValue = (value: string | undefined): boolean | undefined => {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  if (NORMALIZE_TRUE.has(normalized)) return true;
  if (normalized === '0' || normalized === 'false' || normalized === 'disabled' || normalized === 'off') return false;
  return undefined;
};

const parseJsonFlags = (value: string | undefined) => {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    if (typeof parsed === 'object' && parsed !== null) {
      const result: Record<string, boolean> = {};
      for (const [key, raw] of Object.entries(parsed as Record<string, unknown>)) {
        if (!key) continue;
        if (typeof raw === 'boolean') {
          result[key] = raw;
        } else if (typeof raw === 'number') {
          result[key] = raw !== 0;
        } else if (typeof raw === 'string') {
          const normalized = normalizeValue(raw);
          if (normalized !== undefined) {
            result[key] = normalized;
          }
        }
      }
      return result;
    }
  } catch (error) {
    console.warn('Failed to parse EXPERIMENT_FLAGS', error);
  }
  return {};
};

const collectFlags = () => {
  const envFlags: Record<string, boolean> = parseJsonFlags(process.env.EXPERIMENT_FLAGS);
  const fallback = parseJsonFlags(process.env.NEXT_PUBLIC_UI_EXPERIMENTS);
  const result: Record<string, boolean> = { ...fallback, ...envFlags };

  const prefix = 'EXPERIMENT_FLAG_';
  for (const [key, value] of Object.entries(process.env)) {
    if (!key.startsWith(prefix)) continue;
    const normalizedKey = key
      .slice(prefix.length)
      .toLowerCase()
      .replace(/__/g, '-');
    const normalizedValue = normalizeValue(value);
    if (normalizedValue !== undefined) {
      result[normalizedKey] = normalizedValue;
    }
  }
  return result;
};

export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  res.status(200).json({ flags: collectFlags() });
}
