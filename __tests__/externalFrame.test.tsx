import React from 'react';
import { render, screen } from '@testing-library/react';
import ExternalFrame from '../components/ExternalFrame';

describe('ExternalFrame', () => {
  const originalCookie = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie') ||
    Object.getOwnPropertyDescriptor(HTMLDocument.prototype, 'cookie');

  afterEach(() => {
    if (originalCookie) {
      Object.defineProperty(document, 'cookie', originalCookie);
    }
  });

  it('mounts iframe for allowlisted domain', () => {
    render(<ExternalFrame src="https://vscode.dev" title="frame" />);
    expect(screen.getByTestId('external-frame')).toBeInTheDocument();
    expect(screen.queryByTestId('cookie-banner')).toBeNull();
  });

  it('shows banner when cookies are disabled', () => {
    Object.defineProperty(document, 'cookie', {
      configurable: true,
      get: () => '',
      set: () => { throw new Error('blocked'); },
    });
    render(<ExternalFrame src="https://vscode.dev" title="frame" />);
    expect(screen.getByTestId('cookie-banner')).toBeInTheDocument();
  });
});
