import React from 'react';
import { render, screen } from '@testing-library/react';
import VsCode from '../components/apps/vscode';

describe('VsCode app', () => {
  it('renders external frame', () => {
    render(<VsCode />);
    const frame = screen.getByTitle('VsCode');
    expect(frame.tagName).toBe('IFRAME');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('has an external link', () => {
    render(<VsCode />);
    const links = screen.getAllByRole('link', { name: /open externally/i });
    const hasCorrectLink = links.some((link) =>
      link.getAttribute('href') ===
        'https://stackblitz.com/github/Alex-Unnippillil/kali-linux-portfolio?embed=1&file=README.md' &&
      link.getAttribute('target') === '_blank'
    );
    expect(hasCorrectLink).toBe(true);
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
});

