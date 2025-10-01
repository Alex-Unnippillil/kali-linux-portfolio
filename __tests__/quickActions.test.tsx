import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import QuickActions from '../components/layout/QuickActions';
import QuickActionsPanel from '../apps/settings/components/QuickActionsPanel';
import { SettingsProvider } from '../hooks/useSettings';

const renderWithSettings = (ui: React.ReactElement) =>
  render(<SettingsProvider>{ui}</SettingsProvider>);

describe('QuickActions toolbar', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  test('drag reorder persists order across remounts', async () => {
    const { unmount } = renderWithSettings(
      <>
        <QuickActions />
        <QuickActionsPanel />
      </>
    );

    const moveUpButton = screen.getByRole('button', {
      name: 'Move Record screen up',
    });

    fireEvent.click(moveUpButton);

    await waitFor(() => {
      const order = screen
        .getAllByTestId(/quick-action-/)
        .map((btn) => btn.getAttribute('data-testid')?.replace('quick-action-', ''));
      expect(order.slice(0, 2)).toEqual(['record-screen', 'new-tab']);
      expect(window.localStorage.getItem('quick-actions')).toContain('record-screen');
    });

    unmount();

    const stored = JSON.parse(window.localStorage.getItem('quick-actions') ?? '[]');
    expect(stored.map((item: any) => item.id).slice(0, 2)).toEqual([
      'record-screen',
      'new-tab',
    ]);
  });

  test('visibility toggles persist through settings panel', async () => {
    const { unmount } = renderWithSettings(
      <>
        <QuickActions />
        <QuickActionsPanel />
      </>
    );

    const checkbox = screen.getByLabelText('Show Record screen');
    expect(checkbox).toBeChecked();

    fireEvent.click(checkbox);

    await waitFor(() => {
      expect(screen.getByLabelText('Show Record screen')).not.toBeChecked();
      expect(screen.queryByTestId('quick-action-record-screen')).toBeNull();
    });

    unmount();

    const stored = JSON.parse(window.localStorage.getItem('quick-actions') ?? '[]');
    const target = stored.find((item: any) => item.id === 'record-screen');
    expect(target?.visible).toBe(false);
  });

  test('record screen button dispatches open-app event', () => {
    renderWithSettings(<QuickActions />);
    const dispatchSpy = jest.spyOn(window, 'dispatchEvent');
    dispatchSpy.mockImplementation(() => true);

    const recordButton = screen.getByTestId('quick-action-record-screen');
    fireEvent.click(recordButton);

    expect(dispatchSpy).toHaveBeenCalled();
    const event = dispatchSpy.mock.calls.find(([evt]) => evt.type === 'open-app')?.[0];
    expect(event).toBeInstanceOf(CustomEvent);
    expect((event as CustomEvent).detail).toBe('screen-recorder');

    dispatchSpy.mockRestore();
  });

  test('buttons expose aria-keyshortcuts when shortcuts are available', () => {
    renderWithSettings(<QuickActions />);

    expect(screen.getByTestId('quick-action-record-screen')).toHaveAttribute(
      'aria-keyshortcuts',
      'Control+Alt+R',
    );
    expect(screen.getByTestId('quick-action-lock-screen')).toHaveAttribute(
      'aria-keyshortcuts',
      'Meta+L',
    );
  });
});
