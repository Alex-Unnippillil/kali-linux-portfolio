import {
  areSuggestionsEnabled,
  clearHistory,
  getHistory,
  getRecommendations,
  recordOpen,
  setDoNotSuggest,
} from '../utils/analytics/openHistory';

describe('openHistory analytics store', () => {
  beforeEach(() => {
    window.localStorage.clear();
    clearHistory();
  });

  test('records usage per type with counts', () => {
    recordOpen('text/plain', 'gedit', 1_000);
    recordOpen('text/plain', 'gedit', 2_000);
    recordOpen('image/png', 'viewer', 3_000);

    const textHistory = getHistory('text/plain');
    expect(textHistory).toHaveLength(1);
    expect(textHistory[0]).toMatchObject({ appId: 'gedit', count: 2, lastUsed: 2_000 });

    const imageHistory = getHistory('image/png');
    expect(imageHistory).toHaveLength(1);
    expect(imageHistory[0].appId).toBe('viewer');
  });

  test('honours do-not-suggest preferences in recommendations', () => {
    recordOpen('text/plain', 'gedit', Date.now() - 5_000);
    recordOpen('text/plain', 'code', Date.now() - 2_000);

    let recommendations = getRecommendations('text/plain');
    expect(recommendations.lastUsed.map(entry => entry.appId)).toContain('code');

    setDoNotSuggest('text/plain', 'code', true);
    recommendations = getRecommendations('text/plain');
    expect(recommendations.lastUsed.map(entry => entry.appId)).not.toContain('code');
    expect(recommendations.popular.map(entry => entry.appId)).not.toContain('code');
  });

  test('clearHistory removes stored analytics', () => {
    recordOpen('text/plain', 'gedit', 10_000);
    expect(getHistory('text/plain')).toHaveLength(1);
    clearHistory('text/plain');
    expect(getHistory('text/plain')).toHaveLength(0);
    expect(areSuggestionsEnabled()).toBe(true);
  });
});
