import React from 'react';
import { render, screen } from '@testing-library/react';
import VsCode, { STACKBLITZ_EMBED_URL } from '../apps/vscode';

describe('VsCode app', () => {
  it('renders StackBlitz iframe and external link', () => {
    render(<VsCode />);

    const frame = screen.getByTitle('Visual Studio Code (StackBlitz)');
    expect(frame.tagName).toBe('IFRAME');
    expect(frame).toHaveAttribute('src', STACKBLITZ_EMBED_URL);

    const openExternally = screen.getAllByRole('link', { name: 'Open in StackBlitz' })[0];
    expect(openExternally).toHaveAttribute(
      'href',
      expect.stringContaining('stackblitz.com'),
    );
  });
});
