describe('submitDummyForm helper', () => {
  const payload = {
    name: 'Alex',
    email: 'alex@example.com',
    message: 'Hello world',
  };

  beforeEach(() => {
    jest.resetModules();
  });

  test('prefers the server action when it resolves', async () => {
    jest.doMock('@/app/actions/dummy', () => ({
      submitDummyFormAction: jest.fn().mockResolvedValue({ success: true }),
    }));

    const { submitDummyForm } = await import('@/services/forms/dummySubmission');
    const { submitDummyFormAction } = await import('@/app/actions/dummy');

    const fetchMock = jest.fn();
    const result = await submitDummyForm(payload, fetchMock);

    expect((submitDummyFormAction as jest.Mock).mock.calls).toHaveLength(1);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result).toEqual({ success: true, via: 'server' });
  });

  test('falls back to fetch when the server action signals unavailability', async () => {
    jest.doMock('@/app/actions/dummy', () => ({
      submitDummyFormAction: jest
        .fn()
        .mockResolvedValue({ success: false, code: 'server_unavailable' }),
    }));

    const { submitDummyForm } = await import('@/services/forms/dummySubmission');

    const fetchMock = jest.fn().mockResolvedValue({ ok: true });
    const result = await submitDummyForm(payload, fetchMock);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ success: true, via: 'client' });
  });
});

