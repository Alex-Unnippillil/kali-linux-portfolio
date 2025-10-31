import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { AppProps } from 'next/app';

jest.mock('@vercel/analytics/next', () => ({
  Analytics: () => null,
}));

jest.mock('@vercel/speed-insights/next', () => ({
  SpeedInsights: () => null,
}));

jest.mock('../hooks/useSettings', () => {
  const React = require('react');
  return {
    SettingsProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

const warnDuringImport = jest.spyOn(console, 'warn').mockImplementation(() => {});
const { default: MyApp } = require('../pages/_app');

describe('PWA install banner', () => {
  const TestPage: AppProps['Component'] = () => <div>Test Page</div>;
  const renderApp = () => render(<MyApp Component={TestPage} pageProps={{}} />);
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    localStorage.clear();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    warnDuringImport.mockClear();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  const dispatchBeforeInstallPrompt = (
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>,
    promptMock = jest.fn(() => Promise.resolve())
  ): jest.Mock => {
    const event = new Event('beforeinstallprompt') as Event & {
      prompt: jest.Mock<Promise<void>, []>;
      userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
    };
    event.prompt = promptMock;
    event.userChoice = userChoice;
    window.dispatchEvent(event);
    return promptMock;
  };

  const flushPromises = async (): Promise<void> => {
    await act(async () => {
      await Promise.resolve();
    });
  };

  it('displays banner when install prompt fires and triggers prompt on install click', async () => {
    renderApp();
    await flushPromises();

    const prompt = dispatchBeforeInstallPrompt(
      Promise.resolve({ outcome: 'accepted', platform: 'test' })
    );

    expect(await screen.findByText(/Install this app/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Install/i }));
    await flushPromises();

    expect(prompt).toHaveBeenCalled();
    expect(screen.queryByText(/Install this app/i)).not.toBeInTheDocument();
    expect(localStorage.getItem('pwa-install-banner-dismissed-at')).toBeNull();
  });

  it('records dismissal and suppresses banner during cooldown', async () => {
    const nowSpy = jest.spyOn(Date, 'now');
    nowSpy.mockReturnValue(1000);
    renderApp();
    await flushPromises();

    dispatchBeforeInstallPrompt(Promise.resolve({ outcome: 'dismissed', platform: 'test' }));

    const dismissButton = await screen.findByRole('button', { name: /Not now/i });
    fireEvent.click(dismissButton);
    await flushPromises();

    const stored = localStorage.getItem('pwa-install-banner-dismissed-at');
    expect(stored).not.toBeNull();

    nowSpy.mockReturnValue(1000 + 60_000);
    dispatchBeforeInstallPrompt(Promise.resolve({ outcome: 'accepted', platform: 'test' }));

    expect(screen.queryByText(/Install this app/i)).not.toBeInTheDocument();
    nowSpy.mockRestore();
  });
});

afterAll(() => {
  warnDuringImport.mockRestore();
});
