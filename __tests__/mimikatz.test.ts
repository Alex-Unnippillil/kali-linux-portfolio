import handler from '../pages/api/mimikatz';
const response = () => ({ setHeader: jest.fn(), status: jest.fn().mockReturnThis(), json: jest.fn() });
describe('Mimikatz simulation', () => {
  it('returns educational modules', async () => {
    const res = response(); await handler({ method: 'GET' }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    const data = res.json.mock.calls[0][0]; expect(data.simulated).toBe(true);
    expect(data.modules.every((module: { name: string }) => typeof module.name === 'string')).toBe(true);
  });
  it.each([{ method: 'GET', query: { command: 'help' } }, { method: 'POST', body: { script: 'private-input' } }])('does not claim execution or echo secrets', async (req) => {
    const res = response(); await handler(req, res); expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json.mock.calls[0][0].output).toContain('No command or script was executed');
    expect(res.json.mock.calls[0][0].output).not.toContain('private-input');
  });
});
