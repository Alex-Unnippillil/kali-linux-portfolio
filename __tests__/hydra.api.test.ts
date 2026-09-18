import handler from '../pages/api/hydra';
const response = () => ({ setHeader: jest.fn(), status: jest.fn().mockReturnThis(), json: jest.fn() });
describe('Hydra bounded fixture validation', () => {
  it('never restores an attack session', async () => {
    const res = response(); await handler({ method: 'POST', body: { action: 'resume' } }, res);
    expect(res.status).toHaveBeenCalledWith(200); expect(res.json).toHaveBeenCalledWith({ simulated: true, output: expect.stringContaining('Nothing was resumed') });
  });
  it.each([null, 42, '', 'x'.repeat(8193)])('rejects invalid list data', async (userList) => {
    const res = response(); await handler({ method: 'POST', body: { target: 'lab.local', service: 'ssh', userList, passList: 'demo' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
  it('rejects non-POST requests', async () => {
    const res = response(); await handler({ method: 'GET' }, res);
    expect(res.status).toHaveBeenCalledWith(405); expect(res.setHeader).toHaveBeenCalledWith('Allow', ['POST']);
  });
});
