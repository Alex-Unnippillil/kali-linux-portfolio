let uuidCounter = 0;
const randomUUIDMock = jest.fn(() => {
  uuidCounter += 1;
  return `id-${uuidCounter}`;
});

jest.mock('crypto', () => ({
  randomUUID: randomUUIDMock,
}));

process.env.FEATURE_TOOL_APIS = 'enabled';
process.env.FEATURE_HYDRA = 'enabled';

const util = require('util');

const execFileMock = jest.fn((cmd, args, options, callback) => {
  if (typeof options === 'function') {
    callback = options;
  }
  callback(null, 'done', '');
});

execFileMock[util.promisify.custom] = (cmd) => {
  if (cmd === 'which') {
    return Promise.resolve({ stdout: '/usr/bin/hydra', stderr: '' });
  }
  return Promise.resolve({ stdout: 'done', stderr: '' });
};

jest.mock('child_process', () => ({
  execFile: execFileMock,
}));

const handler = require('../pages/api/hydra').default;
const path = require('path');
const fs = require('fs').promises;
const sessionDir = path.join(process.cwd(), 'hydra');

beforeEach(() => {
  uuidCounter = 0;
  randomUUIDMock.mockClear();
});

test('removes temp files after hydra execution', async () => {
  const req = {
    method: 'POST',
    body: { target: 'target', service: 'ssh', userList: 'u', passList: 'p' },
  };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };

  await handler(req, res);

  const [userResult, passResult] = randomUUIDMock.mock.results;
  const userPath = `/tmp/hydra-users-${userResult.value}.txt`;
  const passPath = `/tmp/hydra-pass-${passResult.value}.txt`;

  await expect(fs.access(userPath)).rejects.toBeTruthy();
  await expect(fs.access(passPath)).rejects.toBeTruthy();
});

test('accepts http-get service names exposed in the UI', async () => {
  const req = {
    method: 'POST',
    body: {
      target: 'target',
      service: 'http-get',
      userList: 'u',
      passList: 'p',
    },
  };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };

  await handler(req, res);

  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.json).toHaveBeenCalledWith({ output: 'done' });
});

test('rejects unsupported hydra services', async () => {
  const req = {
    method: 'POST',
    body: {
      target: 'target',
      service: 'unknown-service',
      userList: 'u',
      passList: 'p',
    },
  };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };

  await handler(req, res);

  expect(res.status).toHaveBeenCalledWith(400);
  expect(res.json).toHaveBeenCalledWith({ error: 'Unsupported service' });
});
afterAll(async () => {
  await fs.rm(sessionDir, { recursive: true, force: true });
  delete process.env.FEATURE_TOOL_APIS;
  delete process.env.FEATURE_HYDRA;
});
