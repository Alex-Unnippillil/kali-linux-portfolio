import { trackEvent } from '../lib/analytics-client';

jest.mock('@vercel/analytics', () => ({ track: jest.fn() }));

const mockTrack = require('@vercel/analytics').track as jest.Mock;

describe('trackEvent', () => {
  beforeEach(() => {
    mockTrack.mockReset();
    process.env.NEXT_PUBLIC_ANALYTICS_SAMPLE_RATE = '1';
    jest.spyOn(Math, 'random').mockReturnValue(0.1);
  });

  afterEach(() => {
    (Math.random as jest.Mock).mockRestore();
  });

  it('anonymizes string props', () => {
    trackEvent('Ask Agent', { user: 'alice@example.com', count: 1 });
    expect(mockTrack).toHaveBeenCalledWith(
      'Ask Agent',
      expect.objectContaining({
        user: expect.any(String),
        count: 1,
      }),
    );
    const props = mockTrack.mock.calls[0][1];
    expect(props.user).not.toBe('alice@example.com');
  });

  it('respects sampling rate', () => {
    process.env.NEXT_PUBLIC_ANALYTICS_SAMPLE_RATE = '0';
    mockTrack.mockReset();
    trackEvent('Ask Agent');
    expect(mockTrack).not.toHaveBeenCalled();
  });
});
