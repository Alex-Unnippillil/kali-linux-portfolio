import handler from '../../pages/api/kali-container/start';
import { createMocks } from 'node-mocks-http';

jest.mock('child_process', () => ({
  execFile: jest.fn((cmd: string, args: string[], options: any, cb: any) => {
    if (typeof options === 'function') {
      cb = options;
    }
    cb(null, 'started', '');
  }),
}));

const execFileMock = require('child_process').execFile as jest.Mock;

describe('kali-container api', () => {
  beforeEach(() => {
    process.env.FEATURE_TOOL_APIS = 'enabled';
    process.env.FEATURE_KALI_CONTAINER = 'enabled';
  });

  afterEach(() => {
    execFileMock.mockClear();
    delete process.env.FEATURE_TOOL_APIS;
    delete process.env.FEATURE_KALI_CONTAINER;
  });

  it('runs docker with provided tag and flags', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { tag: 'latest', flags: ['--rm'] },
    });

    await handler(req as any, res as any);

    expect(execFileMock).toHaveBeenCalledWith(
      'docker',
      ['run', '--rm', 'kalilinux/kali-rolling:latest'],
      { timeout: 60000 },
      expect.any(Function)
    );
    expect(res._getStatusCode()).toBe(200);
    expect(res._getJSONData()).toEqual({ stdout: 'started' });
  });

  it('rejects invalid tags', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { tag: 'bad;tag' },
    });

    await handler(req as any, res as any);

    expect(res._getStatusCode()).toBe(400);
    expect(execFileMock).not.toHaveBeenCalled();
  });
});

