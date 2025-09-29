describe('processContactForm', () => {
  const payload = {
    name: 'Alex',
    email: 'alex@example.com',
    message: 'Hello',
    honeypot: '',
    csrfToken: 'token',
    recaptchaToken: 'captcha',
  };

  beforeEach(() => {
    jest.resetModules();
  });

  test('uses the server action when it succeeds', async () => {
    const serverResult = { success: true };
    jest.doMock('@/app/actions/contact', () => ({
      submitContactAction: jest.fn().mockResolvedValue(serverResult),
    }));

    const { processContactForm } = await import('@/components/apps/contact');
    const { submitContactAction } = await import('@/app/actions/contact');

    const fetchMock = jest.fn();
    const result = await processContactForm(payload, fetchMock);

    expect((submitContactAction as jest.Mock).mock.calls).toHaveLength(1);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result).toEqual({ success: true, via: 'server' });
  });

  test('falls back to client fetch when the server action is unavailable', async () => {
    jest.doMock('@/app/actions/contact', () => ({
      submitContactAction: jest
        .fn()
        .mockResolvedValue({ success: false, code: 'server_unavailable' }),
    }));

    const { processContactForm } = await import('@/components/apps/contact');

    const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    const result = await processContactForm(payload, fetchMock);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ success: true, via: 'client' });
  });
});

