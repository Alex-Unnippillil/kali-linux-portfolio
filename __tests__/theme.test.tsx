import React from 'react';
import { render, fireEvent, renderHook, act } from '@testing-library/react';
import { ThemeProvider } from '../components/providers/ThemeProvider';
import { useTheme } from '../hooks/useTheme';
import AppearancePanel from '../components/apps/settings/AppearancePanel';
import { THEME_KEY } from '../utils/theme';
import { THEME_DEFINITIONS } from '../lib/theme/tokens';

type WrapperProps = { children: React.ReactNode };

const Wrapper: React.FC<WrapperProps> = ({ children }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.dataset.theme = '';
  document.documentElement.className = '';
  document.documentElement.style.cssText = '';
});

describe('ThemeProvider', () => {
  test('exposes default theme tokens', () => {
    const { result } = renderHook(() => useTheme(), { wrapper: Wrapper });
    expect(result.current.theme).toBe('default');
    expect(result.current.tokens).toBe(THEME_DEFINITIONS.default.tokens);
  });

  test('setTheme persists selection and updates CSS variables', async () => {
    const { result } = renderHook(() => useTheme(), { wrapper: Wrapper });

    await act(async () => {
      result.current.setTheme('dark');
    });

    expect(result.current.theme).toBe('dark');
    expect(window.localStorage.getItem(THEME_KEY)).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(
      document.documentElement.style.getPropertyValue('--color-bg').trim(),
    ).toBe(THEME_DEFINITIONS.dark.tokens.background);
  });

  test('responds to storage events from other tabs', () => {
    const { result } = renderHook(() => useTheme(), { wrapper: Wrapper });

    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', { key: THEME_KEY, newValue: 'neon' }),
      );
    });

    expect(result.current.theme).toBe('neon');
  });
});

describe('AppearancePanel', () => {
  test('clicking a theme option updates the active theme', () => {
    const { getByRole } = render(<AppearancePanel />, { wrapper: Wrapper });

    const neonOption = getByRole('radio', { name: /neon/i });
    fireEvent.click(neonOption);

    expect(document.documentElement.dataset.theme).toBe('neon');
    expect(neonOption).toHaveAttribute('aria-checked', 'true');
  });
});
