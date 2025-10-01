import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import MetasploitApp from '../components/apps/metasploit';
import NotificationCenter from '../components/common/NotificationCenter';
import { SafeModeProvider } from '../components/common/SafeMode';

const renderWithSafeMode = (ui: React.ReactElement) =>
  render(
    <NotificationCenter>
      <SafeModeProvider>{ui}</SafeModeProvider>
    </NotificationCenter>,
  );

describe.skip('Metasploit app', () => {
  beforeEach(() => {
    // @ts-ignore
    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({ loot: [], notes: [] }),
      }),
    );
    localStorage.clear();
  });

  it('does not call module API in demo mode', async () => {
    renderWithSafeMode(<MetasploitApp demoMode />);
    await screen.findByText('Run Demo');
    expect(global.fetch).toHaveBeenCalledWith('/fixtures/metasploit_loot.json');
    expect(global.fetch).not.toHaveBeenCalledWith('/api/metasploit');
  });

  it('shows transcript when module selected', () => {
    renderWithSafeMode(<MetasploitApp demoMode />);
    const moduleEl = screen.getByRole('button', {
      name: /ms17_010_eternalblue/,
    });
    fireEvent.click(moduleEl);
    expect(screen.getByText(/Exploit completed/)).toBeInTheDocument();
  });

  it('shows module docs in sidebar', () => {
    renderWithSafeMode(<MetasploitApp demoMode />);
    const moduleEl = screen.getByRole('button', {
      name: /ms17_010_eternalblue/,
    });
    fireEvent.click(moduleEl);
    expect(
      screen.getByText(/Mock documentation for EternalBlue/),
    ).toBeInTheDocument();
  });

  it('shows legal banner', () => {
    renderWithSafeMode(<MetasploitApp demoMode />);
    expect(
      screen.getByText(/authorized security testing and educational use only/i)
    ).toBeInTheDocument();
  });

  it.skip('outputs demo logs', async () => {
    renderWithSafeMode(<MetasploitApp demoMode />);
    fireEvent.click(screen.getByText('Run Demo'));
    expect(
      await screen.findByText(/Started reverse TCP handler/)
    ).toBeInTheDocument();
  });

  it('toggles loot viewer', async () => {
    // @ts-ignore
    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () =>
          Promise.resolve({
            loot: [{ host: '10.0.0.2', data: 'secret' }],
            notes: [{ host: '10.0.0.2', note: 'priv user' }],
          }),
      }),
    );
    renderWithSafeMode(<MetasploitApp demoMode />);
    fireEvent.click(screen.getByText('Toggle Loot/Notes'));
    expect(await screen.findByText(/10.0.0.2: secret/)).toBeInTheDocument();
    expect(screen.getByText(/priv user/)).toBeInTheDocument();
  });

  it.skip('logs loot during replay', async () => {
    jest.useFakeTimers();
    renderWithSafeMode(<MetasploitApp demoMode />);
    fireEvent.click(screen.getByText('Replay Mock Exploit'));
    await act(async () => {
      jest.runAllTimers();
    });
    expect(
      await screen.findByText('10.0.0.3: ssh-creds.txt')
    ).toBeInTheDocument();
    jest.useRealTimers();
  });
});

