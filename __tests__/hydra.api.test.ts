// @jest-environment node
process.env.NEXT_PUBLIC_CSRF_TOKEN = 'testtoken';

describe('Hydra API validation', () => {
  it('rejects invalid service', async () => {
    const handler = (await import('../pages/api/hydra')).default;
    const req: any = {
      method: 'POST',
      headers: { 'x-csrf-token': 'testtoken' },
      body: { target: 'host', service: 'bad', userList: 'u', passList: 'p' },
    };
    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});
