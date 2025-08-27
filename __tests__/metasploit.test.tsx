import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import MetasploitApp from '../components/apps/metasploit';

describe('Metasploit app', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('persists command history', async () => {
    const { unmount } = render(<MetasploitApp />);
    const input = screen.getByPlaceholderText('msfconsole command');
    fireEvent.change(input, { target: { value: 'search test' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await screen.findByText(/msf6 > search test/);
    unmount();

    render(<MetasploitApp />);
    expect(screen.getByText(/msf6 > search test/)).toBeInTheDocument();
  });

  it('shows legal banner', () => {
    render(<MetasploitApp />);
    expect(
      screen.getByText(/authorized security testing and educational use only/i)
    ).toBeInTheDocument();
  });

  it('outputs demo logs', () => {
    render(<MetasploitApp />);
    fireEvent.click(screen.getByText('Run Demo'));
    expect(
      screen.getByText(/Started reverse TCP handler/)
    ).toBeInTheDocument();
  });
});

