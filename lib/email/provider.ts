import type { Logger } from '../logger';

export type EmailProviderName =
  | 'resend'
  | 'postmark'
  | 'console'
  | 'test'
  | 'none';

export interface EmailMessage {
  to: string;
  from: string;
  subject: string;
  text: string;
  replyTo?: string;
}

export interface EmailSendResult {
  provider: EmailProviderName;
  status: 'sent' | 'queued' | 'skipped';
  id?: string;
}

export interface EmailProvider {
  name: EmailProviderName;
  send(message: EmailMessage): Promise<EmailSendResult>;
}

export class EmailProviderError extends Error {
  constructor(
    public readonly provider: EmailProviderName,
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'EmailProviderError';
  }
}

export interface CreateEmailProviderOptions {
  fetchImpl?: typeof fetch;
  logger?: Logger;
}

const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const POSTMARK_ENDPOINT = 'https://api.postmarkapp.com/email';

type FetchLike = typeof fetch;

class ResendProvider implements EmailProvider {
  public readonly name: EmailProviderName = 'resend';

  constructor(
    private readonly apiKey: string,
    private readonly fetchImpl: FetchLike,
    private readonly logger?: Logger
  ) {}

  async send(message: EmailMessage): Promise<EmailSendResult> {
    try {
      const response = await this.fetchImpl(RESEND_ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: message.from,
          to: message.to,
          subject: message.subject,
          text: message.text,
          reply_to: message.replyTo,
        }),
      });

      const payload = await safeJson(response);
      if (!response.ok) {
        throw new EmailProviderError(
          this.name,
          `Resend responded with HTTP ${response.status}`,
          payload
        );
      }

      this.logger?.info('Resend email accepted', {
        event: 'email.send',
        provider: this.name,
      });

      return {
        provider: this.name,
        status: 'sent',
        id: typeof payload?.id === 'string' ? payload.id : undefined,
      };
    } catch (error) {
      if (error instanceof EmailProviderError) {
        throw error;
      }
      throw new EmailProviderError(this.name, 'Failed to send via Resend', error);
    }
  }
}

class PostmarkProvider implements EmailProvider {
  public readonly name: EmailProviderName = 'postmark';

  constructor(
    private readonly serverToken: string,
    private readonly fetchImpl: FetchLike,
    private readonly logger?: Logger
  ) {}

  async send(message: EmailMessage): Promise<EmailSendResult> {
    try {
      const response = await this.fetchImpl(POSTMARK_ENDPOINT, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'X-Postmark-Server-Token': this.serverToken,
        },
        body: JSON.stringify({
          From: message.from,
          To: message.to,
          Subject: message.subject,
          TextBody: message.text,
          ...(message.replyTo ? { ReplyTo: message.replyTo } : {}),
        }),
      });

      const payload = await safeJson(response);
      if (!response.ok) {
        throw new EmailProviderError(
          this.name,
          `Postmark responded with HTTP ${response.status}`,
          payload
        );
      }

      this.logger?.info('Postmark email accepted', {
        event: 'email.send',
        provider: this.name,
      });

      return {
        provider: this.name,
        status: 'sent',
        id: typeof payload?.MessageID === 'string' ? payload.MessageID : undefined,
      };
    } catch (error) {
      if (error instanceof EmailProviderError) {
        throw error;
      }
      throw new EmailProviderError(
        this.name,
        'Failed to send via Postmark',
        error
      );
    }
  }
}

class ConsoleProvider implements EmailProvider {
  public readonly name: EmailProviderName = 'console';

  constructor(private readonly logger?: Logger) {}

  async send(message: EmailMessage): Promise<EmailSendResult> {
    this.logger?.info('Email send skipped (console provider)', {
      event: 'email.skip',
      provider: this.name,
      textLength: message.text.length,
    });
    return { provider: this.name, status: 'skipped' };
  }
}

class TestProvider implements EmailProvider {
  public readonly name: EmailProviderName = 'test';

  async send(message: EmailMessage): Promise<EmailSendResult> {
    emailTestOutbox.push({ ...message });
    return { provider: this.name, status: 'sent' };
  }
}

const emailTestOutbox: EmailMessage[] = [];

export function getEmailTestOutbox(): EmailMessage[] {
  return emailTestOutbox;
}

export function resetEmailTestOutbox(): void {
  emailTestOutbox.length = 0;
}

function safeJson(response: Response): Promise<any> {
  if (typeof response.clone === 'function') {
    return response
      .clone()
      .json()
      .catch(() => null);
  }
  const maybeJson: any = (response as any).json;
  if (typeof maybeJson === 'function') {
    return maybeJson.call(response).catch(() => null);
  }
  return Promise.resolve(null);
}

function resolveFetch(options?: CreateEmailProviderOptions): FetchLike {
  if (options?.fetchImpl) {
    return options.fetchImpl;
  }
  if (typeof fetch === 'function') {
    return fetch.bind(globalThis);
  }
  throw new EmailProviderError('none', 'No fetch implementation available');
}

export function createEmailProvider(
  env: NodeJS.ProcessEnv = process.env,
  options: CreateEmailProviderOptions = {}
): EmailProvider {
  const selection = (env.EMAIL_PROVIDER || 'console').toLowerCase() as EmailProviderName;
  const fetchImpl = resolveFetch(options);
  const logger = options.logger;

  switch (selection) {
    case 'resend': {
      const apiKey = env.RESEND_API_KEY;
      if (!apiKey) {
        throw new EmailProviderError('resend', 'RESEND_API_KEY is not configured');
      }
      return new ResendProvider(apiKey, fetchImpl, logger);
    }
    case 'postmark': {
      const token = env.POSTMARK_SERVER_TOKEN;
      if (!token) {
        throw new EmailProviderError(
          'postmark',
          'POSTMARK_SERVER_TOKEN is not configured'
        );
      }
      return new PostmarkProvider(token, fetchImpl, logger);
    }
    case 'test':
      return new TestProvider();
    case 'none':
    case 'console':
    default:
      return new ConsoleProvider(logger);
  }
}
