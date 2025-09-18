import share, { canShare } from '../utils/share';

describe('share utility', () => {
  afterEach(() => {
    delete (navigator as any).share;
    delete (navigator as any).canShare;
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

  it('shares files when supported by the browser', async () => {
    const shareMock = jest.fn().mockResolvedValue(undefined);
    const canShareMock = jest.fn().mockReturnValue(true);
    (navigator as any).share = shareMock;
    (navigator as any).canShare = canShareMock;

    const file = new File(['hello'], 'note.txt', { type: 'text/plain' });
    const payload = { text: 'File share', files: [file] } as const;

    const result = await share(payload);
    expect(result).toBe(true);
    expect(canShareMock).toHaveBeenCalledWith({ files: [file] });
    expect(shareMock).toHaveBeenCalledWith({
      text: 'File share',
      files: [file],
      url: window.location.href,
    });
  });
});
