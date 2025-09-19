import { processContactForm } from '../components/apps/contact';
import { createContactSubmitRequest } from '../lib/contracts';

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
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ v: 1, data: { ok: true } }),
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
      fetchMock
    );
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/contact',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'X-CSRF-Token': 'csrf' }),
      })
    );
    const [, options] = fetchMock.mock.calls[0];
    expect(JSON.parse(options.body)).toEqual(
      createContactSubmitRequest({
        name: 'Alex',
        email: 'alex@example.com',
        message: 'Hello',
        honeypot: '',
        recaptchaToken: 'rc',
      }),
    );
    expect(result.success).toBe(true);
  });
});
