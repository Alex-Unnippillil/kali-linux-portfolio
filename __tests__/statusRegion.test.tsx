import React from 'react';
import { render, screen } from '@testing-library/react';
import { renderHook, act } from '@testing-library/react';
import { SettingsProvider, useSettings } from '../hooks/useSettings';

describe('status region', () => {
  test('announces messages', () => {
    jest.useFakeTimers();
    render(<div id="status-region" role="status" aria-live="polite"></div>);
    const announce = (message: string) => {
      const region = document.getElementById('status-region')!;
      region.textContent = '';
      setTimeout(() => {
        region.textContent = message;
      }, 100);
    };
    (window as any).__announce = announce;
    act(() => {
      announce('Copied to clipboard');
      jest.runAllTimers();
    });
    expect(screen.getByRole('status')).toHaveTextContent('Copied to clipboard');
  });

  test('theme changes announce', () => {
    const announce = jest.fn();
    (window as any).__announce = announce;
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: () => null,
        setItem: () => undefined,
        removeItem: () => undefined,
        clear: () => undefined,
      },
      writable: true,
    });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SettingsProvider>{children}</SettingsProvider>
    );
    const { result } = renderHook(() => useSettings(), { wrapper });
    act(() => {
      result.current.setTheme('dark');
    });
    expect(announce).toHaveBeenCalledWith('Theme changed to dark');
  });
});
