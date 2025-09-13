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

  it('strips html from inputs', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true });
    await processContactForm(
      {
        name: '<b>Alex</b>',
        email: 'a@example.com',
        message: '<i>hello</i>',
        honeypot: '',
        csrfToken: 'csrf',
        recaptchaToken: 'rc',
      },
      fetchMock
    );
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.name).toBe('Alex');
    expect(body.message).toBe('hello');
    expect(body.message).not.toMatch(/<|>/);
  });
});
