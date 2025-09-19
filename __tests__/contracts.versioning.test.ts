import {
  createContactResponse,
  createAdminMessagesResponse,
  createTerminalRunRequest,
  createTerminalWorkerResponse,
  parseAdminMessagesResponse,
  parseContactResponse,
  parseContactSubmitRequest,
  parseTerminalWorkerRequest,
  parseTerminalWorkerResponse,
} from '../lib/contracts';

describe('versioned contracts', () => {
  it('parses legacy contact submit payloads', () => {
    const result = parseContactSubmitRequest({
      name: 'Alex',
      email: 'alex@example.com',
      message: 'Hi',
      honeypot: 'bot',
      recaptchaToken: 'tok',
    });
    expect(result).toEqual({
      name: 'Alex',
      email: 'alex@example.com',
      message: 'Hi',
      honeypot: 'bot',
      recaptchaToken: 'tok',
    });
  });

  it('parses contact responses regardless of version', () => {
    const envelope = createContactResponse({ ok: true });
    expect(parseContactResponse(envelope)).toEqual({ ok: true });
    expect(parseContactResponse({ ok: false, code: 'x' })).toEqual({
      ok: false,
      code: 'x',
    });
  });

  it('negotiates terminal worker payloads', () => {
    const request = createTerminalRunRequest({
      action: 'run',
      command: 'echo hi',
    });
    expect(parseTerminalWorkerRequest(request)).toEqual({
      action: 'run',
      command: 'echo hi',
    });
    expect(
      parseTerminalWorkerResponse(createTerminalWorkerResponse({ type: 'end' })),
    ).toEqual({ type: 'end' });
    expect(parseTerminalWorkerResponse({ type: 'data', chunk: 'hi' })).toEqual({
      type: 'data',
      chunk: 'hi',
    });
  });

  it('parses admin messages responses', () => {
    const envelope = createAdminMessagesResponse({ messages: [{ id: 1 }] });
    expect(parseAdminMessagesResponse(envelope)).toEqual({ messages: [{ id: 1 }] });
    expect(
      parseAdminMessagesResponse({ error: 'oops' }),
    ).toEqual({ error: 'oops' });
  });
});
