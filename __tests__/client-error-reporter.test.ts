import { reportClientError } from '../lib/client-error-reporter';
import { REDACTED } from '../lib/monitoring/scrub';
import { captureClientException } from '../lib/monitoring/sentry';

jest.mock('../lib/monitoring/sentry', () => ({
  captureClientException: jest.fn(),
}));

describe('reportClientError', () => {
  const originalEnv = process.env.NODE_ENV;
  const fetchMock = jest.fn();
  const mockedCapture = captureClientException as jest.MockedFunction<typeof captureClientException>;

  beforeEach(() => {
    fetchMock.mockReset().mockResolvedValue({ ok: true });
    (global as any).fetch = fetchMock;
    process.env.NODE_ENV = 'production';
    mockedCapture.mockClear();
  });

  afterEach(() => {
    delete (global as any).fetch;
    process.env.NODE_ENV = originalEnv;
  });

  it('scrubs sensitive values before sending them to the server', async () => {
    const error = new Error('Failed for test@example.com with card 4111111111111111');
    error.stack = 'Error: boom\n    at http://localhost:3000/app?token=secret&email=foo@bar.com';

    await reportClientError(error, 'In <Component email="foo@bar.com">');

    expect(mockedCapture).toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalled();
    const payload = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(payload.message).not.toContain('test@example.com');
    expect(payload.message).toContain(REDACTED);
    expect(payload.componentStack).toContain(REDACTED);
    expect(payload.url).not.toContain('?token=');
  });

  it('skips network reporting in development mode', async () => {
    process.env.NODE_ENV = 'development';
    const error = new Error('Boom');

    await reportClientError(error, 'Stack');

    expect(mockedCapture).toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
