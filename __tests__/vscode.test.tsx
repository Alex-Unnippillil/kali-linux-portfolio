import React from 'react';
import { act, render, screen } from '@testing-library/react';
import VsCode, { STACKBLITZ_HANDSHAKE_TIMEOUT_MS } from '../apps/vscode';

describe('VsCode app', () => {
  it('renders external frame and clears overlay once StackBlitz is ready', () => {
    render(<VsCode />);

    expect(
      screen.getByText('Connecting to the StackBlitz workspace…', { selector: 'span' }),
    ).toBeInTheDocument();

    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          origin: 'https://stackblitz.com',
          data: { type: 'stackblitz:frame-ready' },
        }),
      );
    });

    expect(screen.queryByText('Connecting to the StackBlitz workspace…')).toBeNull();
    const frame = screen.getByTitle('VsCode');
    expect(frame.tagName).toBe('IFRAME');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('shows banner when cookies are blocked', async () => {
    const original = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie');
    Object.defineProperty(document, 'cookie', {
      configurable: true,
      get: () => '',
      set: () => {},
    });

    render(<VsCode />);
    const alert = await screen.findByRole('alert');
    expect(alert).toBeInTheDocument();

    if (original) {
      Object.defineProperty(document, 'cookie', original);
    }
  });

  it('falls back when the handshake times out', () => {
    jest.useFakeTimers();

    try {
      render(<VsCode />);
      act(() => {
        jest.advanceTimersByTime(STACKBLITZ_HANDSHAKE_TIMEOUT_MS);
      });

      expect(
        screen.getByText('StackBlitz is taking longer than expected. You can open the project in a new tab.'),
      ).toBeInTheDocument();
      const openExternally = screen.getByRole('link', { name: 'Open in StackBlitz' });
      expect(openExternally).toHaveAttribute('href', expect.stringContaining('stackblitz.com'));
    } finally {
      jest.useRealTimers();
    }
  });
});
