import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RequestTester } from '../apps/http';

describe('HTTP request tester regression suite', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  const flushTimers = () => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
  };

  it('handles preflight and simple simulations across presets without leaving timers behind', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const { unmount } = render(<RequestTester />);

    const originSelect = screen.getByLabelText(/origin preset/i);
    const scenarioSelect = screen.getByLabelText(/scenario/i);
    const runButton = screen.getByRole('button', { name: /run simulation/i });

    const runScenario = async (
      originValue: string,
      scenarioValue: string,
      expectations: { request: string[]; response: string[]; blocked: boolean }
    ) => {
      await user.selectOptions(originSelect, originValue);
      await user.selectOptions(scenarioSelect, scenarioValue);
      await user.click(runButton);
      await flushTimers();

      const requestPreview = screen.getByTestId('request-preview');
      expectations.request.forEach((line) => {
        expect(requestPreview).toHaveTextContent(line);
      });

      const responsePreview = screen.getByTestId('response-preview');
      expectations.response.forEach((line) => {
        expect(responsePreview).toHaveTextContent(line);
      });

      const status = screen.getByTestId('result-status');
      if (expectations.blocked) {
        expect(status).toHaveTextContent(/blocked/i);
      } else {
        expect(status).toHaveTextContent(/allowed/i);
      }
    };

    await runScenario('internal', 'preflight-upload', {
      request: [
        'OPTIONS /api/upload',
        'Access-Control-Request-Method: PUT',
        'Access-Control-Request-Headers: content-type, x-demo-signature',
      ],
      response: [
        'HTTP/1.1 204 No Content',
        'Access-Control-Allow-Origin: https://app.internal.local',
        'Access-Control-Allow-Headers: content-type, x-demo-signature',
      ],
      blocked: false,
    });

    await runScenario('partner', 'preflight-admin', {
      request: [
        'OPTIONS /api/admin',
        'Access-Control-Request-Method: DELETE',
        'Access-Control-Request-Headers: authorization',
      ],
      response: [
        'BLOCKED: CORS policy rejected the request.',
        'Allowed Origins: https://app.internal.local',
      ],
      blocked: true,
    });

    await runScenario('staging', 'preflight-metrics', {
      request: [
        'OPTIONS /api/metrics',
        'Access-Control-Request-Method: PATCH',
        'Access-Control-Request-Headers: content-type',
      ],
      response: [
        'HTTP/1.1 204 No Content',
        'Access-Control-Allow-Origin: https://staging.partner-demo.com',
        'Access-Control-Allow-Methods: PATCH',
      ],
      blocked: false,
    });

    await runScenario('partner', 'simple-status', {
      request: ['GET /status', 'Origin: https://integrations.partner.io', 'Accept: application/json'],
      response: [
        'HTTP/1.1 200 OK',
        'Access-Control-Allow-Origin: https://integrations.partner.io',
        'Vary: Origin',
      ],
      blocked: false,
    });

    await runScenario('staging', 'simple-form', {
      request: [
        'POST /contact',
        'Origin: https://staging.partner-demo.com',
        'Content-Type: application/x-www-form-urlencoded',
      ],
      response: [
        'BLOCKED: CORS policy rejected the request.',
        'Allowed Origins: https://app.internal.local, https://integrations.partner.io',
      ],
      blocked: true,
    });

    unmount();
    expect((window as any).__httpTesterTimers ?? 0).toBe(0);
  });
});
