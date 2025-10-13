import {
  createEmailProvider,
  EmailProviderError,
  getEmailTestOutbox,
  resetEmailTestOutbox,
} from '../lib/email/provider';

const baseMessage = {
  to: 'owner@example.com',
  from: 'portfolio@example.com',
  subject: 'Subject',
  text: 'Body',
};

describe('email provider factory', () => {
  afterEach(() => {
    resetEmailTestOutbox();
  });

  it('defaults to console provider when no selection is given', async () => {
    const fetchMock = jest.fn();
    const provider = createEmailProvider({}, { fetchImpl: fetchMock as any });

    expect(provider.name).toBe('console');
    await expect(provider.send(baseMessage)).resolves.toEqual({
      provider: 'console',
      status: 'skipped',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('throws when required credentials are missing', () => {
    expect(() =>
      createEmailProvider(
        { EMAIL_PROVIDER: 'resend' } as NodeJS.ProcessEnv,
        { fetchImpl: jest.fn() as any }
      )
    ).toThrow(EmailProviderError);
    expect(() =>
      createEmailProvider(
        { EMAIL_PROVIDER: 'postmark' } as NodeJS.ProcessEnv,
        { fetchImpl: jest.fn() as any }
      )
    ).toThrow(EmailProviderError);
  });

  it('captures messages when using the test provider', async () => {
    const provider = createEmailProvider(
      { EMAIL_PROVIDER: 'test' } as NodeJS.ProcessEnv,
      { fetchImpl: jest.fn() as any }
    );

    await provider.send(baseMessage);
    const outbox = getEmailTestOutbox();
    expect(outbox).toHaveLength(1);
    expect(outbox[0].subject).toBe('Subject');
  });

  it('sends payloads to Resend with proper headers', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ id: 'abc123' }),
    });

    const provider = createEmailProvider(
      {
        EMAIL_PROVIDER: 'resend',
        RESEND_API_KEY: 'api-key',
      } as NodeJS.ProcessEnv,
      { fetchImpl: fetchMock as any }
    );

    await provider.send(baseMessage);

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.resend.com/emails',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer api-key',
        }),
      })
    );
  });

  it('sends payloads to Postmark with proper headers', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ MessageID: '123' }),
    });

    const provider = createEmailProvider(
      {
        EMAIL_PROVIDER: 'postmark',
        POSTMARK_SERVER_TOKEN: 'server-token',
      } as NodeJS.ProcessEnv,
      { fetchImpl: fetchMock as any }
    );

    await provider.send(baseMessage);

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.postmarkapp.com/email',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'X-Postmark-Server-Token': 'server-token',
        }),
      })
    );
  });
});
