const mockNextResponseJson = jest.fn((body: unknown, init?: ResponseInit) => ({
  status: init?.status ?? 200,
  async json() {
    return body;
  },
}));

jest.mock('next/server', () => ({
  NextResponse: { json: mockNextResponseJson },
  NextRequest: class {},
}));

import { captureException, ensureSentry } from '../lib/monitoring/sentry';
import { REDACTED } from '../lib/monitoring/scrub';

jest.mock('../lib/monitoring/sentry', () => ({
  ensureSentry: jest.fn(() => ({ enabled: true })),
  captureException: jest.fn(),
}));

describe('POST /api/log-client-error', () => {
  const mockedEnsure = ensureSentry as jest.MockedFunction<typeof ensureSentry>;
  const mockedCapture = captureException as jest.MockedFunction<typeof captureException>;
  let postHandler: typeof import('../app/api/log-client-error/route').POST;

  beforeEach(async () => {
    mockNextResponseJson.mockClear().mockImplementation((body: unknown, init?: ResponseInit) => ({
      status: init?.status ?? 200,
      async json() {
        return body;
      },
    }));
    await jest.isolateModulesAsync(async () => {
      ({ POST: postHandler } = await import('../app/api/log-client-error/route'));
    });
    mockedEnsure.mockClear().mockReturnValue({ enabled: true });
    mockedCapture.mockClear();
  });

  it('captures scrubbed payload with Sentry when enabled', async () => {
    const request = {
      json: jest.fn().mockResolvedValue({
        message: 'User test@example.com failed',
        stack: 'at foo?token=secret',
        componentStack: 'In <Component email="foo@bar.com">',
        url: 'https://example.com/page?token=secret',
        segment: '/page?email=foo@bar.com',
      }),
    } as any;

    const response = await postHandler(request);

    expect(response.status).toBe(200);
    expect(mockedEnsure).toHaveBeenCalled();
    expect(mockedCapture).toHaveBeenCalled();
    const [, extras] = mockedCapture.mock.calls[0];
    expect(extras).toBeDefined();
    expect((extras as Record<string, string>).message).toContain(REDACTED);
    expect((extras as Record<string, string>).componentStack).toContain(REDACTED);
    expect((extras as Record<string, string>).url).not.toContain('?token=');
  });

  it('returns 400 and reports intake failure when JSON parsing fails', async () => {
    const request = {
      json: jest.fn().mockRejectedValue(new Error('broken payload secret=12345')),
    } as any;

    const response = await postHandler(request);

    expect(response.status).toBe(400);
    expect(mockedCapture).toHaveBeenCalled();
    const [, extras] = mockedCapture.mock.calls[mockedCapture.mock.calls.length - 1];
    expect(JSON.stringify(extras)).not.toContain('secret=12345');
  });
});
