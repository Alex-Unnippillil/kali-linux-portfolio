import React from 'react';
import { render, screen } from '@testing-library/react';
import VsCode from '../components/apps/vscode';

describe('VsCode app', () => {
  it('renders iframe', () => {
    render(<VsCode />);
    const frame = screen.getByTitle('VsCode');
    expect(frame).toBeInTheDocument();
    expect(frame).toHaveAttribute('src', expect.stringContaining('stackblitz.com'));
  });

  it('shows banner when cookies disabled', async () => {
    const original = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie');
    Object.defineProperty(document, 'cookie', {
      configurable: true,
      get: () => '',
      set: () => {}
    });

    render(<VsCode />);

    expect(
      await screen.findByText(/Third-party cookies are blocked/i)
    ).toBeInTheDocument();

    if (original) {
      Object.defineProperty(Document.prototype, 'cookie', original);
    }
  });
});
