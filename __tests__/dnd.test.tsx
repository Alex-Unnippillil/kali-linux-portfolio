import React, { forwardRef, useImperativeHandle, useState } from 'react';
import { renderHook, act, render, waitFor, screen } from '@testing-library/react';
import { SettingsProvider, useSettings } from '../hooks/useSettings';
import { NotificationCenter } from '../components/common/NotificationCenter';
import Toast from '../components/ui/Toast';

describe('Do Not Disturb integration', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  test('toggleDnd updates override state', () => {
    const { result } = renderHook(() => useSettings(), {
      wrapper: SettingsProvider,
    });

    expect(result.current.dndActive).toBe(false);
    expect(result.current.dndOverride).toBeNull();

    act(() => {
      result.current.toggleDnd();
    });
    expect(result.current.dndActive).toBe(true);
    expect(result.current.dndOverride).toBe('on');

    act(() => {
      result.current.toggleDnd();
    });
    expect(result.current.dndActive).toBe(false);
    expect(result.current.dndOverride).toBe('off');

    act(() => {
      result.current.clearDndOverride();
    });
    expect(result.current.dndOverride).toBeNull();
  });

  test('suppresses toast but logs notification when DND active', async () => {
    const Harness = forwardRef<
      {
        enableDnd: () => void;
        showToast: (message: string) => void;
      }
    >((_, ref) => {
      const { setDndOverride } = useSettings();
      const [toast, setToast] = useState('');

      useImperativeHandle(
        ref,
        () => ({
          enableDnd: () => setDndOverride('on'),
          showToast: (message: string) => setToast(message),
        }),
        [setDndOverride]
      );

      if (!toast) return null;

      return (
        <Toast
          appId="Unit Test"
          message={toast}
          onClose={() => setToast('')}
        />
      );
    });
    Harness.displayName = 'Harness';

    const ref = React.createRef<{
      enableDnd: () => void;
      showToast: (message: string) => void;
    }>();

    render(
      <SettingsProvider>
        <NotificationCenter>
          <Harness ref={ref} />
        </NotificationCenter>
      </SettingsProvider>
    );

    await waitFor(() => expect(ref.current).toBeDefined());

    act(() => {
      ref.current!.enableDnd();
    });

    act(() => {
      ref.current!.showToast('Suppressed toast');
    });

    expect(screen.queryByRole('status')).toBeNull();

    await waitFor(() => {
      expect(screen.getByText('Unit Test')).toBeInTheDocument();
      expect(screen.getByText('Suppressed toast')).toBeInTheDocument();
    });
  });
});
