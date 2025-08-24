import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react';
import CaaChecker from '@apps/caa-checker';

describe('CaaChecker component', () => {
  const realClipboard = navigator.clipboard;
  const realFetch = global.fetch;

  afterEach(() => {
    // @ts-ignore
    navigator.clipboard = realClipboard;
    global.fetch = realFetch;
    jest.resetModules();
    jest.clearAllMocks();
  });

  test('renders results and copies examples', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    // @ts-ignore
    navigator.clipboard = { writeText };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        records: [
          { flags: 0, tag: 'issue', value: 'letsencrypt.org' },
          { flags: 0, tag: 'iodef', value: 'mailto:security@example.com' },
        ],
        issues: [],
        policyDomain: 'example.com',
        examples: '0 issue "letsencrypt.org"\n0 iodef "mailto:security@example.com"\n',
        notes: [],
        effective: {
          issue: ['letsencrypt.org'],
          issuewild: ['letsencrypt.org'],
          iodef: 'mailto:security@example.com',
        },
      }),
    });

    render(<CaaChecker />);
    fireEvent.change(screen.getByPlaceholderText('example.com'), {
      target: { value: 'example.com' },
    });
    fireEvent.click(screen.getByText('Check'));

    await waitFor(() => expect(screen.getAllByText('letsencrypt.org').length).toBeGreaterThan(0));
    fireEvent.click(screen.getByText('Copy'));
    expect(writeText).toHaveBeenCalledWith(
      '0 issue "letsencrypt.org"\n0 iodef "mailto:security@example.com"\n',
    );
  });

  test('shows error message on failure', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network'));
    render(<CaaChecker />);
    fireEvent.change(screen.getByPlaceholderText('example.com'), {
      target: { value: 'example.com' },
    });
    fireEvent.click(screen.getByText('Check'));
    await waitFor(() => expect(screen.getByText('network')).toBeInTheDocument());
  });
});

