import handler from '../pages/api/hydra';
import { execFile, exec, spawn } from 'child_process';
jest.mock('child_process', () => ({ execFile: jest.fn(), exec: jest.fn(), spawn: jest.fn() }));
const response = () => ({ setHeader: jest.fn(), status: jest.fn().mockReturnThis(), json: jest.fn() });
describe('Hydra simulation boundary', () => {
  afterEach(() => { expect(execFile).not.toHaveBeenCalled(); expect(exec).not.toHaveBeenCalled(); expect(spawn).not.toHaveBeenCalled(); });
  test.each(['ssh', 'http-get', 'http-post-form'])('supports the %s fixture without execution', async (service) => {
    const res = response(); await handler({ method: 'POST', body: { target: 'lab.local', service, userList: 'demo', passList: 'private-input' } }, res);
    expect(res.status).toHaveBeenCalledWith(200); expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ simulated: true }));
    expect(JSON.stringify(res.json.mock.calls)).not.toContain('private-input');
  });
  test('rejects real hosts', async () => {
    const res = response(); await handler({ method: 'POST', body: { target: 'example.com', service: 'ssh', userList: 'u', passList: 'p' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
  test('rejects unsupported services', async () => {
    const res = response(); await handler({ method: 'POST', body: { target: 'lab.local', service: 'unknown', userList: 'u', passList: 'p' } }, res);
    expect(res.status).toHaveBeenCalledWith(400); expect(res.json).toHaveBeenCalledWith({ error: 'Unsupported service' });
  });
});
