import { render, screen, fireEvent, waitFor, renderHook, act } from '@testing-library/react';
import { del } from 'idb-keyval';
import type { ReactNode } from 'react';
import Settings from '../apps/settings';
import { SettingsProvider, useSettings } from '../hooks/useSettings';
import { getPreferredTextColor } from '../utils/color';

const wrapper = ({ children }: { children: ReactNode }) => (
  <SettingsProvider>{children}</SettingsProvider>
);

beforeEach(async () => {
  window.localStorage.clear();
  document.documentElement.style.cssText = '';
  await del('accent');
});

describe('accent customization', () => {
  test('prevents saving accents with insufficient focus contrast', async () => {
    const { unmount } = render(
      <SettingsProvider>
        <Settings />
      </SettingsProvider>
    );

    const input = await screen.findByLabelText(/custom accent/i);
    await waitFor(() =>
      expect(document.documentElement.style.getPropertyValue('--color-ub-orange')).toBe('#1793d1')
    );

    fireEvent.change(input, { target: { value: '#10161a' } });

    await waitFor(() =>
      expect(
        screen.getByText(/focus contrast [0-9.]+:1 is below the 3:1 non-text requirement/i),
      ).toBeInTheDocument(),
    );

    expect(document.documentElement.style.getPropertyValue('--color-ub-orange')).toBe('#1793d1');

    unmount();
  });

  test('persists accessible custom accent selections', async () => {
    const { result, unmount } = renderHook(() => useSettings(), { wrapper });

    await waitFor(() => expect(result.current.accent).toBeDefined());

    const customAccent = '#ff4f7a';
    act(() => result.current.setAccent(customAccent));

    await waitFor(() => expect(result.current.accent).toBe(customAccent));

    await waitFor(() =>
      expect(document.documentElement.style.getPropertyValue('--color-ub-orange')).toBe(customAccent),
    );

    const expectedTextColor = getPreferredTextColor(customAccent).text;
    await waitFor(() =>
      expect(document.documentElement.style.getPropertyValue('--color-on-accent')).toBe(
        expectedTextColor,
      ),
    );

    unmount();

    const rerender = renderHook(() => useSettings(), { wrapper });
    await waitFor(() => expect(rerender.result.current.accent).toBe(customAccent));

    await waitFor(() =>
      expect(document.documentElement.style.getPropertyValue('--color-ub-orange')).toBe(customAccent),
    );

    rerender.unmount();
  });
});
