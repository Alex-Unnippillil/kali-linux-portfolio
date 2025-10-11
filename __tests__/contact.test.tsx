import { processContactForm } from '../components/apps/contact';

const originalNavigator = global.navigator;

const setNavigatorOnlineState = (state: boolean | undefined) => {
  if (state === undefined) {
    if (originalNavigator) {
      Object.defineProperty(global, 'navigator', {
        value: originalNavigator,
        configurable: true,
      });
    } else {
      delete (global as typeof global & { navigator?: Navigator }).navigator;
    }
    return;
  }
  Object.defineProperty(global, 'navigator', {
    value: { onLine: state },
    configurable: true,
  });
};

const originalContactEndpoint = process.env.NEXT_PUBLIC_CONTACT_ENDPOINT;

afterEach(() => {
  setNavigatorOnlineState(undefined);
  if (originalContactEndpoint) {
    process.env.NEXT_PUBLIC_CONTACT_ENDPOINT = originalContactEndpoint;
  } else {
    delete process.env.NEXT_PUBLIC_CONTACT_ENDPOINT;
  }
});

describe('contact form', () => {
  it('invalid email blocked', async () => {
    const fetchMock = jest.fn();
    const result = await processContactForm(
      {
        name: 'A',
        email: 'invalid',
        message: 'Hi',
        honeypot: '',
      },
      fetchMock
    );
    expect(result.success).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('invalid name blocked', async () => {
    const fetchMock = jest.fn();
    const result = await processContactForm(
      {
        name: '',
        email: 'alex@example.com',
        message: 'Hello',
        honeypot: '',
      },
      fetchMock
    );
    expect(result.success).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('success posts to stub endpoint', async () => {
    setNavigatorOnlineState(true);
    const fetchMock = jest.fn().mockResolvedValue({ ok: true });
    const result = await processContactForm(
      {
        name: 'Alex',
        email: 'alex@example.com',
        message: 'Hello',
        honeypot: '',
      },
      fetchMock
    );
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/dummy',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      })
    );
    expect(result.success).toBe(true);
  });

  it('handles offline state without fetch', async () => {
    setNavigatorOnlineState(false);
    const fetchMock = jest.fn();
    const result = await processContactForm(
      {
        name: 'Alex',
        email: 'alex@example.com',
        message: 'Hello',
        honeypot: '',
      },
      fetchMock
    );
    expect(result.success).toBe(false);
    expect(result.code).toBe('offline');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('gracefully reports network failures', async () => {
    setNavigatorOnlineState(true);
    const fetchMock = jest.fn().mockRejectedValue(new Error('offline'));
    const result = await processContactForm(
      {
        name: 'Alex',
        email: 'alex@example.com',
        message: 'Hello',
        honeypot: '',
      },
      fetchMock
    );
    expect(result.success).toBe(false);
    expect(result.code).toBe('network_error');
  });
});
