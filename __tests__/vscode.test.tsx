import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import VsCode from '../apps/vscode';

describe('VsCode app', () => {
  it('renders external frame', () => {
    render(<VsCode />);
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

  it('allows keyboard dismissal of the cookie warning', async () => {
    const original = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie');
    Object.defineProperty(document, 'cookie', {
      configurable: true,
      get: () => '',
      set: () => {},
    });

    const user = userEvent.setup();

    render(<VsCode />);
    const alert = await screen.findByRole('alert');
    const dismissButton = within(alert).getByRole('button', { name: /dismiss/i });

    dismissButton.focus();
    expect(dismissButton).toHaveFocus();

    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(screen.queryByRole('alert')).toBeNull();
    });

    if (original) {
      Object.defineProperty(document, 'cookie', original);
    }
  });
});
