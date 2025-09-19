import { trackEvent } from '@/lib/analytics-client';

export const logSettingsSearch = (
  query: string,
  resultCount: number,
  sectionId?: string,
  durationMs?: number,
) => {
  const safeDuration = Number.isFinite(durationMs) ? Math.max(0, Math.round(durationMs ?? 0)) : 0;
  trackEvent('settings_search', {
    queryLength: query.length,
    resultCount,
    sectionId: sectionId ?? 'none',
    durationMs: safeDuration,
  });
};
