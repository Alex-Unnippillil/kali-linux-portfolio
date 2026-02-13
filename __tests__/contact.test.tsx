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
    const fetchMock = jest.fn().mockResolvedValue({ ok: true });
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

  it('normalizes spoofed characters before submit', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true });
    await processContactForm(
      {
        name: 'p\u0430ypal',
        email: 'safe@example.com',
        message: 'alert\u202E()',
        honeypot: '',
        csrfToken: 'csrf',
        recaptchaToken: 'rc',
      },
      fetchMock
    );
    const payload = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(payload.name).toBe('paypal');
    expect(payload.message).toBe('alert()');
  });
});
