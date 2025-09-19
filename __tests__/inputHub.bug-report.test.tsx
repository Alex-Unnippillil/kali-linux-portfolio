import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import InputHub from '../pages/input-hub';

jest.mock('@emailjs/browser', () => ({
  init: jest.fn(),
  send: jest.fn(),
}));

const replace = jest.fn();

jest.mock('next/router', () => ({
  useRouter: () => ({
    query: {
      preset: 'bug-report',
      errorId: 'ERR-987',
      appId: 'terminal',
      appTitle: 'Terminal',
      context: 'app:terminal',
      url: 'https://example.com/apps/terminal',
    },
    replace,
  }),
}));

describe('InputHub bug report prefill', () => {
  it('prefills bug report fields with the error metadata', async () => {
    render(<InputHub />);

    await waitFor(() =>
      expect(
        (screen.getByRole('combobox') as HTMLSelectElement).value
      ).toBe('Bug Report')
    );

    const messageField = screen.getByPlaceholderText('Message') as HTMLTextAreaElement;

    await waitFor(() =>
      expect(messageField.value).toContain('Error ID: ERR-987')
    );
    expect(messageField.value).toContain('App ID: terminal');
    expect(messageField.value).toContain('App: Terminal');
    expect(messageField.value).toContain('Context: app:terminal');
    expect(messageField.value).toContain('URL: https://example.com/apps/terminal');
  });
});

