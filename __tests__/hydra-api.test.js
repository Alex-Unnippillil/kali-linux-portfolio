process.env.NEXT_PUBLIC_CSRF_TOKEN = 'testtoken';
const handler = require('../pages/api/hydra').default;

const makeRes = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn(),
});

test('returns canned output with valid token', async () => {
  const req = {
    method: 'POST',
    headers: { 'x-csrf-token': 'testtoken' },
    body: { target: 'example.com', service: 'ssh', userList: 'u', passList: 'p' },
  };
  const res = makeRes();
  await handler(req, res);
  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.json.mock.calls[0][0].output).toMatch(/Hydra simulation/);
});

test('rejects missing csrf token', async () => {
  const req = {
    method: 'POST',
    headers: {},
    body: { target: 'example.com', service: 'ssh', userList: 'u', passList: 'p' },
  };
  const res = makeRes();
  await handler(req, res);
  expect(res.status).toHaveBeenCalledWith(403);
});
