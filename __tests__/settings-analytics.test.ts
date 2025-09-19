jest.mock('@/lib/analytics-client', () => ({
  trackEvent: jest.fn(),
}));

import { trackEvent } from '@/lib/analytics-client';
import { logSettingsSearch } from '@/apps/settings/analytics';

describe('logSettingsSearch', () => {
  beforeEach(() => {
    (trackEvent as jest.Mock).mockClear();
  });

  it('sends analytics with duration metadata', () => {
    logSettingsSearch('contrast', 2, 'high-contrast', 12.7);
    expect(trackEvent).toHaveBeenCalledWith('settings_search', {
      queryLength: 8,
      resultCount: 2,
      sectionId: 'high-contrast',
      durationMs: 13,
    });
  });

  it('handles missing optional fields', () => {
    logSettingsSearch('', 0);
    expect(trackEvent).toHaveBeenCalledWith('settings_search', {
      queryLength: 0,
      resultCount: 0,
      sectionId: 'none',
      durationMs: 0,
    });
  });
});
