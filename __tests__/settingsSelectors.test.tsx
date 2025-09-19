import type { ReactNode } from 'react';
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { act, renderHook } from '@testing-library/react';
import {
  selectAccent,
  SettingsProvider,
  useSettingsActions,
  useSettingsSelector,
} from '../hooks/useSettings';

describe('settings selectors', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.dataset.theme = '';
    document.documentElement.className = '';
  });

  test('selector avoids re-render when unrelated state updates', () => {
    let accentRenders = 0;

    const AccentConsumer = () => {
      useSettingsSelector(selectAccent);
      accentRenders += 1;
      return null;
    };

    const ThemeToggle = () => {
      const { setTheme } = useSettingsActions();
      return (
        <button type="button" onClick={() => setTheme('dark')}>
          change theme
        </button>
      );
    };

    render(
      <SettingsProvider>
        <AccentConsumer />
        <ThemeToggle />
      </SettingsProvider>,
    );

    const initialRenders = accentRenders;
    act(() => {
      fireEvent.click(screen.getByText('change theme'));
    });

    expect(accentRenders).toBe(initialRenders);
  });

  test('actions object remains stable across updates', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <SettingsProvider>{children}</SettingsProvider>
    );
    const { result } = renderHook(() => useSettingsActions(), { wrapper });
    const initialActions = result.current;

    act(() => {
      result.current.setAccent('#e53e3e');
    });

    expect(result.current).toBe(initialActions);
  });
});
