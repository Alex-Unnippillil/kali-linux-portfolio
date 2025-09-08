process.env.FEATURE_TOOL_APIS = 'enabled';
process.env.FEATURE_HYDRA = 'enabled';

const handler = require('../pages/api/hydra').default;

test('returns mock output', async () => {
  const req = {
    method: 'POST',
    body: { target: 't', service: 'ssh', userList: 'u', passList: 'p' },
  };
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  await handler(req, res);
  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.json).toHaveBeenCalledWith({ output: 'hydra mock' });
});

afterAll(() => {
  delete process.env.FEATURE_TOOL_APIS;
  delete process.env.FEATURE_HYDRA;
});
