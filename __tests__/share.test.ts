import { share, canShare } from '@/utils';

describe('share utility', () => {
  afterEach(() => {
    delete (navigator as any).share;
  });

  it('returns false when Web Share API unsupported', async () => {
    expect(canShare()).toBe(false);
    const result = await share('msg');
    expect(result).toBe(false);
  });

  it('calls navigator.share with provided text', async () => {
    const shareMock = jest.fn().mockResolvedValue(undefined);
    (navigator as any).share = shareMock;
    expect(canShare()).toBe(true);
    const res = await share('hello', 'title', 'http://example.com');
    expect(res).toBe(true);
    expect(shareMock).toHaveBeenCalledWith({
      text: 'hello',
      title: 'title',
      url: 'http://example.com',
    });
  });
});
