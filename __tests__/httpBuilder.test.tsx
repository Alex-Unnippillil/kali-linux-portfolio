import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { HTTPBuilder } from '../apps/http';

describe('HTTPBuilder validation', () => {
  const originalGlobalWorker = (global as any).Worker;
  const originalWindowWorker =
    typeof window !== 'undefined' ? (window as any).Worker : undefined;

  beforeEach(() => {
    (global as any).Worker = undefined;
    if (typeof window !== 'undefined') {
      (window as any).Worker = undefined;
    }
  });

  afterEach(() => {
    (global as any).Worker = originalGlobalWorker;
    if (typeof window !== 'undefined') {
      (window as any).Worker = originalWindowWorker;
    }
  });

  it('rejects non-http protocols', async () => {
    const user = userEvent.setup();
    render(<HTTPBuilder />);

    const input = screen.getByLabelText(/url/i);
    await user.type(input, 'ftp://example.com');

    expect(
      screen.getByText('Only HTTP and HTTPS URLs are supported.')
    ).toBeInTheDocument();
  });

  it('blocks file scheme URLs explicitly', async () => {
    const user = userEvent.setup();
    render(<HTTPBuilder />);

    const input = screen.getByLabelText(/url/i);
    await user.type(input, 'file://etc/passwd');

    expect(
      screen.getByText('file:// URLs are blocked for security reasons.')
    ).toBeInTheDocument();
  });

  it('resolves a valid HTTP URL', async () => {
    const user = userEvent.setup();
    render(<HTTPBuilder />);

    const input = screen.getByLabelText(/url/i);
    await user.type(input, 'https://example.com');

    await waitFor(() => {
      expect(
        screen.getByText(/Resolved example\.com to 192\.0\.2\./i)
      ).toBeInTheDocument();
    });
  });

  it('returns actionable DNS errors for invalid hostnames', async () => {
    const user = userEvent.setup();
    render(<HTTPBuilder />);

    const input = screen.getByLabelText(/url/i);
    await user.type(input, 'https://bad_host.example');

    await waitFor(() => {
      expect(
        screen.getByText(
          'DNS lookup failed: Invalid hostname label: "bad_host".'
        )
      ).toBeInTheDocument();
    });
  });

  it('requires a domain suffix when not using localhost', async () => {
    const user = userEvent.setup();
    render(<HTTPBuilder />);

    const input = screen.getByLabelText(/url/i);
    await user.type(input, 'https://example');

    await waitFor(() => {
      expect(
        screen.getByText(
          'DNS lookup failed: Hostname must include a domain suffix (e.g., example.com).'
        )
      ).toBeInTheDocument();
    });
  });
});
