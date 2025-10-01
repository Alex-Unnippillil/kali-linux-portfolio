import share, { canShare } from '../utils/share';

describe('share utility', () => {
  afterEach(() => {
    delete (navigator as any).share;
    delete (navigator as any).canShare;
  });

  it('returns unsupported when Web Share API is unavailable', async () => {
    expect(canShare()).toBe(false);
    const result = await share({ text: 'msg' });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('unsupported');
  });

  it('shares text payloads when supported', async () => {
    const shareMock = jest.fn().mockResolvedValue(undefined);
    (navigator as any).share = shareMock;
    expect(canShare()).toBe(true);
    const res = await share({ text: 'hello', title: 'title', url: 'http://example.com' });
    expect(res.ok).toBe(true);
    expect(shareMock).toHaveBeenCalledWith({
      text: 'hello',
      title: 'title',
      url: 'http://example.com',
    });
  });

  it('shares files when navigator.canShare supports the payload', async () => {
    const shareMock = jest.fn().mockResolvedValue(undefined);
    (navigator as any).share = shareMock;
    (navigator as any).canShare = jest.fn().mockReturnValue(true);
    const file = new File(['hello'], 'hello.txt', { type: 'text/plain' });
    const res = await share({ text: 'payload', files: [file] }, { reason: 'test-share' });
    expect(res.ok).toBe(true);
    expect(res.context).toBe('test-share');
    expect(shareMock).toHaveBeenCalledWith({
      text: 'payload',
      files: [file],
    });
  });

  it('returns unsupported-payload when navigator.canShare rejects the files', async () => {
    const shareMock = jest.fn();
    (navigator as any).share = shareMock;
    (navigator as any).canShare = jest.fn().mockReturnValue(false);
    const file = new File(['data'], 'data.bin');
    const res = await share({ files: [file] });
    expect(res.ok).toBe(false);
    expect(res.reason).toBe('unsupported-payload');
    expect(shareMock).not.toHaveBeenCalled();
  });
});
