// @jest-environment node
import { promises as fs } from 'fs';

const USER_PATH = '/tmp/hydra-users-test-uuid.txt';
const PASS_PATH = '/tmp/hydra-pass-test-uuid.txt';

async function cleanup() {
  await fs.unlink(USER_PATH).catch(() => {});
  await fs.unlink(PASS_PATH).catch(() => {});
}

describe('Hydra API temp file cleanup', () => {
  beforeEach(() => {
    process.env.FEATURE_TOOL_APIS = 'enabled';
    process.env.FEATURE_HYDRA = 'enabled';
  });
  afterEach(async () => {
    jest.resetModules();
    jest.dontMock('child_process');
    jest.dontMock('crypto');
    await cleanup();
    delete process.env.FEATURE_TOOL_APIS;
    delete process.env.FEATURE_HYDRA;
  });

  it('removes temp files after successful run', async () => {
    jest.doMock('crypto', () => ({ randomUUID: () => 'test-uuid' }));
    const execFileMock = jest.fn((cmd: string, args: any, options: any, cb: any) => {
      if (typeof options === 'function') {
        cb = options;
      }
      cb(null, '', '');
    });
    jest.doMock('child_process', () => ({ execFile: execFileMock }));

    const handler = (await import('../pages/api/hydra')).default;

    const req: any = {
      method: 'POST',
      body: { target: 'host', service: 'ssh', userList: 'u', passList: 'p' },
    };
    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await handler(req, res);

    await expect(fs.access(USER_PATH)).rejects.toThrow();
    await expect(fs.access(PASS_PATH)).rejects.toThrow();
  });

  it('removes temp files if hydra missing', async () => {
    jest.doMock('crypto', () => ({ randomUUID: () => 'test-uuid' }));
    const execFileMock = jest.fn((cmd: string, args: any, options: any, cb: any) => {
      if (typeof options === 'function') {
        cb = options;
      }
      if (cmd === 'which') {
        cb(new Error('missing'), '', '');
      } else {
        cb(null, '', '');
      }
    });
    jest.doMock('child_process', () => ({ execFile: execFileMock }));

    const handler = (await import('../pages/api/hydra')).default;

    const req: any = {
      method: 'POST',
      body: { target: 'host', service: 'ssh', userList: 'u', passList: 'p' },
    };
    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await handler(req, res);

    await expect(fs.access(USER_PATH)).rejects.toThrow();
    await expect(fs.access(PASS_PATH)).rejects.toThrow();
  });
});
