import React, { useEffect } from 'react';
import { render, waitFor, renderHook, act } from '@testing-library/react';
import { SettingsProvider, useSettings } from '../hooks/useSettings';

describe('UI scale settings', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.style.cssText = '';
    document.documentElement.className = '';
  });

  it('updates CSS variables for scale-dependent spacing', () => {
    const { result } = renderHook(() => useSettings(), {
      wrapper: SettingsProvider,
    });

    act(() => result.current.setUiScale(1.5));

    expect(document.documentElement.style.getPropertyValue('--ui-scale')).toBe('1.5');
    expect(document.documentElement.style.getPropertyValue('--space-4')).toBe('1.5rem');
  });

  it('scales control hit areas without exceeding container width', async () => {
    const Probe = () => {
      const { setUiScale } = useSettings();
      useEffect(() => {
        setUiScale(2);
      }, [setUiScale]);
      return (
        <div data-testid="container" style={{ width: '120px', display: 'block' }}>
          <button
            data-testid="button"
            style={{ minWidth: 'var(--hit-area)', minHeight: 'var(--hit-area)' }}
          >
            Test
          </button>
        </div>
      );
    };

    const { getByTestId } = render(
      <SettingsProvider>
        <Probe />
      </SettingsProvider>,
    );

    await waitFor(() => {
      expect(document.documentElement.style.getPropertyValue('--hit-area')).toBe('64px');
    });

    const containerWidth = parseFloat(getComputedStyle(getByTestId('container')).width);
    const hitArea = parseFloat(document.documentElement.style.getPropertyValue('--hit-area'));

    expect(hitArea).toBeLessThanOrEqual(containerWidth);
  });
});
