import { act, renderHook } from '@testing-library/react';
import React from 'react';
import {
  CommandPaletteProvider,
  useCommandPalette,
  COMMAND_PALETTE_RECENTS_KEY,
  type CommandPaletteAction,
} from '../components/desktop/CommandPalette';
import { useCommandPaletteActions } from '../hooks/useCommandPaletteActions';

describe('CommandPalette integration', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <CommandPaletteProvider>{children}</CommandPaletteProvider>
  );

  it('ranks actions by recent usage with alphabetical fallback', async () => {
    const actions: CommandPaletteAction[] = [
      { id: 'action-terminal', label: 'Terminal', handler: jest.fn(), appId: 'terminal' },
      { id: 'action-browser', label: 'Browser', handler: jest.fn(), appId: 'firefox' },
      { id: 'action-settings', label: 'Settings', handler: jest.fn(), appId: 'settings' },
    ];

    const { result } = renderHook(() => {
      useCommandPaletteActions(actions);
      return useCommandPalette();
    }, { wrapper });

    expect(result.current.actions.map((item) => item.id)).toEqual([
      'action-browser',
      'action-settings',
      'action-terminal',
    ]);

    await act(async () => {
      await result.current.invokeAction('action-terminal');
    });

    expect(actions[0].handler).toHaveBeenCalledTimes(1);
    expect(result.current.actions[0]?.id).toBe('action-terminal');

    const stored = window.localStorage.getItem(COMMAND_PALETTE_RECENTS_KEY);
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored as string) as Record<string, number>;
    expect(parsed['action-terminal']).toEqual(expect.any(Number));
  });

  it('cleans up recents for actions that are unregistered', async () => {
    const primary: CommandPaletteAction = {
      id: 'primary-action',
      label: 'Primary',
      handler: jest.fn(),
      appId: 'terminal',
    };
    const secondary: CommandPaletteAction = {
      id: 'secondary-action',
      label: 'Secondary',
      handler: jest.fn(),
      appId: 'logs',
    };

    const { result, rerender, unmount } = renderHook(
      ({ registered }: { registered: CommandPaletteAction[] }) => {
        useCommandPaletteActions(registered, [registered]);
        return useCommandPalette();
      },
      {
        initialProps: { registered: [primary, secondary] },
        wrapper,
      },
    );

    await act(async () => {
      await result.current.invokeAction('primary-action');
    });

    expect(primary.handler).toHaveBeenCalled();
    let stored = window.localStorage.getItem(COMMAND_PALETTE_RECENTS_KEY);
    expect(stored).not.toBeNull();
    let parsed = JSON.parse(stored as string) as Record<string, number>;
    expect(parsed['primary-action']).toBeDefined();

    rerender({ registered: [secondary] });

    stored = window.localStorage.getItem(COMMAND_PALETTE_RECENTS_KEY);
    if (stored) {
      parsed = JSON.parse(stored) as Record<string, number>;
      expect(parsed['primary-action']).toBeUndefined();
    }

    await act(async () => {
      await result.current.invokeAction('secondary-action');
    });

    stored = window.localStorage.getItem(COMMAND_PALETTE_RECENTS_KEY);
    expect(stored).not.toBeNull();
    parsed = JSON.parse(stored as string) as Record<string, number>;
    expect(parsed['secondary-action']).toBeDefined();
    expect(parsed['primary-action']).toBeUndefined();

    unmount();

    expect(window.localStorage.getItem(COMMAND_PALETTE_RECENTS_KEY)).toBeNull();
  });
});
