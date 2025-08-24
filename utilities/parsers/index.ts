export function parseJSON<T = unknown>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export function parseNumber(text: string): number | null {
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}
