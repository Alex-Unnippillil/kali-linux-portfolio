// @jest-environment node
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

const USER_PATH = path.join(os.tmpdir(), 'hydra-users-test-uuid.txt');
const PASS_PATH = path.join(os.tmpdir(), 'hydra-pass-test-uuid.txt');
const SESSION_DIR = path.join(process.cwd(), 'hydra');

async function cleanup() {
  await fs.unlink(USER_PATH).catch(() => { });
  await fs.unlink(PASS_PATH).catch(() => { });
  await fs.rm(SESSION_DIR, { recursive: true, force: true }).catch(() => { });
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

describe('Hydra API service validation', () => {
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

  it('allows http variants exposed in UI', async () => {
    jest.doMock('crypto', () => ({ randomUUID: () => 'test-uuid' }));
    const execFileMock = jest.fn(
      (cmd: string, args: any, options: any, cb: any) => {
        if (typeof options === 'function') {
          cb = options;
        }
        cb(null, Buffer.from('ok'), Buffer.from(''));
      }
    );
    jest.doMock('child_process', () => ({ execFile: execFileMock }));

    const handler = (await import('../pages/api/hydra')).default;

    const req: any = {
      method: 'POST',
      body: { target: 'host', service: 'http-get', userList: 'u', passList: 'p' },
    };
    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(execFileMock).toHaveBeenCalled();
  });

  it('rejects unsupported services', async () => {
    const handler = (await import('../pages/api/hydra')).default;

    const req: any = {
      method: 'POST',
      body: {
        target: 'host',
        service: 'unsupported-service',
        userList: 'u',
        passList: 'p',
      },
    };
    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unsupported service' });
  });
});

describe('Hydra API resume session', () => {
  const sessionDir = path.join(process.cwd(), 'hydra');
  const sessionFile = path.join(sessionDir, 'session');

  beforeEach(async () => {
    process.env.FEATURE_TOOL_APIS = 'enabled';
    process.env.FEATURE_HYDRA = 'enabled';
    await fs.mkdir(sessionDir, { recursive: true });
    await fs.writeFile(sessionFile, 'dummy');
  });

  afterEach(async () => {
    jest.resetModules();
    jest.dontMock('child_process');
    await fs.rm(sessionDir, { recursive: true, force: true });
    delete process.env.FEATURE_TOOL_APIS;
    delete process.env.FEATURE_HYDRA;
  });

  it('resumes from saved session', async () => {
    const execFileMock = jest.fn(
      (cmd: string, args: any, options: any, cb: any) => {
        if (typeof options === 'function') {
          cb = options;
        }
        cb(null, '', '');
      }
    );
    jest.doMock('child_process', () => ({ execFile: execFileMock }));

    const handler = (await import('../pages/api/hydra')).default;

    const req: any = { method: 'POST', body: { action: 'resume' } };
    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await handler(req, res);

    const hydraCall = execFileMock.mock.calls.find((c) => c[0] === 'hydra');
    expect(hydraCall[1]).toEqual(['-R']);
  });
});
