/**
 * Returns a YYYY-MM-DD string for the provided date. Used for daily challenge seeds.
 */
export function getDailySeed(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export const dailySeed = getDailySeed();

/**
 * Generate a shareable link for a given seed.
 */
export function generateSeedLink(seed: string): string {
  const url = new URL(window.location.href);
  url.searchParams.set('seed', seed);
  return url.toString();
}
