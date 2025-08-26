import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import MetasploitApp from '../components/apps/metasploit';

describe('Metasploit app', () => {
  beforeEach(() => {
    // @ts-ignore
    global.fetch = jest.fn(() =>
      Promise.resolve({ json: () => Promise.resolve({}) })
    );
    localStorage.clear();
  });

  it('refreshes modules on mount', () => {
    render(<MetasploitApp />);
    expect(global.fetch).toHaveBeenCalledWith('/api/metasploit');
  });

  it('persists command history', async () => {
    // @ts-ignore
    (global.fetch as jest.Mock).mockImplementation((url, options) => {
      if (options && options.method === 'POST') {
        return Promise.resolve({
          json: () => Promise.resolve({ output: 'res' }),
        });
      }
      return Promise.resolve({ json: () => Promise.resolve({}) });
    });

    const { unmount } = render(<MetasploitApp />);
    const input = screen.getByPlaceholderText('msfconsole command');
    fireEvent.change(input, { target: { value: 'search test' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await screen.findByText(/msf6 > search test/);
    unmount();

    render(<MetasploitApp />);
    expect(screen.getByText(/msf6 > search test/)).toBeInTheDocument();
  });
});

