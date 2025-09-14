// @jest-environment node
import util from 'util';

describe('kali-container start API', () => {
  beforeEach(() => {
    process.env.FEATURE_TOOL_APIS = 'enabled';
  });
  afterEach(() => {
    jest.resetModules();
    jest.dontMock('child_process');
    delete process.env.FEATURE_TOOL_APIS;
  });

  it('runs docker with provided tag and flags', async () => {
    const execFileMock = jest.fn((cmd: string, args: string[], cb: any) => {
      cb(null, '123456', '');
    });
    execFileMock[util.promisify.custom] = (...args: any[]) => {
      return new Promise((resolve, reject) => {
        execFileMock(...(args as any), (err: any, stdout: string, stderr: string) => {
          if (err) reject(err);
          else resolve({ stdout, stderr });
        });
      });
    };
    jest.doMock('child_process', () => ({ execFile: execFileMock }));

    const handler = (await import('../../pages/api/kali-container/start')).default;
    const req: any = { method: 'POST', body: { tag: 'latest', flags: '--rm -d' } };
    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await handler(req, res);

    expect(execFileMock).toHaveBeenCalledWith(
      'docker',
      ['run', '--rm', '-d', 'kalilinux/kali-rolling:latest'],
      expect.any(Function),
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('rejects invalid tags', async () => {
    const handler = (await import('../../pages/api/kali-container/start')).default;
    const req: any = { method: 'POST', body: { tag: 'bad tag', flags: '' } };
    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});
