import { act, fireEvent, render, screen } from '@testing-library/react';
import CspReporterApp from '../apps/csp-reporter';

describe('CSP Directive Lab', () => {
  it('records simulated violations and resets when policy changes', async () => {
    render(<CspReporterApp />);

    expect(
      screen.getByRole('heading', { name: /csp directive lab/i }),
    ).toBeInTheDocument();

    const violationTimestamp = Date.now();

    await act(async () => {
      window.dispatchEvent(
        new MessageEvent('message', {
          origin: window.location.origin,
          data: {
            type: 'csp-violation',
            violation: {
              effectiveDirective: 'script-src',
              blockedURI: 'https://malicious.example/script.js',
              documentURI: 'https://demo.internal/dashboard',
              disposition: 'enforce',
              timestamp: violationTimestamp,
            },
          },
        }),
      );
    });

    expect(
      await screen.findByText(/https:\/\/malicious\.example\/script\.js/i),
    ).toBeInTheDocument();

    const sourcesInputs = screen.getAllByLabelText(/allowed sources/i);
    fireEvent.change(sourcesInputs[0], {
      target: { value: "'self' https://static.example" },
    });

    const applyButton = screen.getByRole('button', { name: /apply policy/i });
    await act(async () => {
      fireEvent.click(applyButton);
    });

    expect(
      screen.getByText(/no violation reports captured yet/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/https:\/\/malicious\.example\/script\.js/i),
    ).not.toBeInTheDocument();
  });
});
