const randomUUIDMock = jest
  .fn()
  .mockReturnValueOnce('u')
  .mockReturnValueOnce('p');

jest.mock('crypto', () => ({
  randomUUID: randomUUIDMock,
}));

process.env.FEATURE_TOOL_APIS = 'enabled';
process.env.FEATURE_HYDRA = 'enabled';

jest.mock('child_process', () => ({
  execFile: (cmd, args, options, callback) => {
    if (typeof options === 'function') {
      callback = options;
    }
    callback(null, 'done', '');
  },
}));

const handler = require('../pages/api/hydra').default;
const path = require('path');
const fs = require('fs').promises;
const sessionDir = path.join(process.cwd(), 'hydra');

test('removes temp files after hydra execution', async () => {
const req = {
    method: 'POST',
    headers: { 'x-csrf-token': 'token' },
    cookies: { csrfToken: 'token' },
    body: { target: 'target', service: 'ssh', userList: 'u', passList: 'p' },
  };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };

  const userPath = '/tmp/hydra-users-u.txt';
  const passPath = '/tmp/hydra-pass-p.txt';

  await handler(req, res);

  await expect(fs.access(userPath)).rejects.toBeTruthy();
  await expect(fs.access(passPath)).rejects.toBeTruthy();
});
afterAll(async () => {
  await fs.rm(sessionDir, { recursive: true, force: true });
  delete process.env.FEATURE_TOOL_APIS;
  delete process.env.FEATURE_HYDRA;
});
