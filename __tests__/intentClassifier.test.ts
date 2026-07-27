import classifySearchIntent from '@/src/lib/search/intentClassifier';
import trackServerEvent from '@/lib/analytics-server';

jest.mock('@/lib/analytics-server', () => ({
  __esModule: true,
  default: jest.fn(() => Promise.resolve()),
}));

describe('classifySearchIntent', () => {
  beforeEach(() => {
    (trackServerEvent as jest.Mock).mockClear();
  });

  it('detects compare intent', () => {
    const query = 'compare apples vs oranges';
    const intent = classifySearchIntent(query);
    expect(intent).toBe('compare');
    expect(trackServerEvent).toHaveBeenCalledWith('search_intent', { query, intent });
  });

  it('detects example intent', () => {
    const query = 'example of phishing email';
    const intent = classifySearchIntent(query);
    expect(intent).toBe('example');
    expect(trackServerEvent).toHaveBeenCalledWith('search_intent', { query, intent });
  });

  it('detects risk intent', () => {
    const query = 'risk of sql injection';
    const intent = classifySearchIntent(query);
    expect(intent).toBe('risk');
    expect(trackServerEvent).toHaveBeenCalledWith('search_intent', { query, intent });
  });

  it('defaults to definition intent', () => {
    const query = 'what is kali linux';
    const intent = classifySearchIntent(query);
    expect(intent).toBe('definition');
    expect(trackServerEvent).toHaveBeenCalledWith('search_intent', { query, intent });
  });
});
