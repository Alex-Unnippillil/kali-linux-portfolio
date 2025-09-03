import { processContactForm } from '../components/apps/contact';

describe('contact form', () => {
  it('invalid email blocked', async () => {
    const fetchMock = jest.fn();
    const result = await processContactForm(
      {
        name: 'A',
        email: 'invalid',
        message: 'Hi',
        honeypot: '',
        csrfToken: 'csrf',
        recaptchaToken: 'rc',
      },
      fetchMock
    );
    expect(result.success).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('success posts to api', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValue({ ok: true, headers: { get: () => null } });
    const result = await processContactForm(
      {
        name: 'Alex',
        email: 'alex@example.com',
        message: 'Hello',
        honeypot: '',
        csrfToken: 'csrf',
        recaptchaToken: 'rc',
      },
      fetchMock
    );
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/contact',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'X-CSRF-Token': 'csrf' }),
      })
    );
    expect(result.success).toBe(true);
  });

  it('returns retryAfter on rate limit', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: false,
      status: 429,
      headers: { get: (h: string) => (h === 'Retry-After' ? '5' : null) },
      json: () => Promise.resolve({ code: 'rate_limit' }),
    });
    const result = await processContactForm(
      {
        name: 'Alex',
        email: 'alex@example.com',
        message: 'Hello',
        honeypot: '',
        csrfToken: 'csrf',
        recaptchaToken: 'rc',
      },
      fetchMock,
    );
    expect(result.retryAfter).toBe(5);
    expect(result.code).toBe('rate_limit');
    expect(result.success).toBe(false);
  });
});
