import React from 'react';
import { act, render, screen } from '@testing-library/react';
import ShortcutOverlay from '../components/common/ShortcutOverlay';
import {
  SHORTCUT_OVERLAY_EVENT,
  type ShortcutOverlayEventDetail,
} from '../components/common/shortcutOverlayEvents';

describe('ShortcutOverlay', () => {
  beforeEach(() => {
    window.localStorage.removeItem('keymap');
  });

  it('lists shortcuts and highlights conflicts', () => {
    window.localStorage.setItem(
      'keymap',
      JSON.stringify({
        'Show keyboard shortcuts': 'A',
        'Open settings': 'A',
      })
    );
    render(<ShortcutOverlay />);

    const openEvent = new CustomEvent<ShortcutOverlayEventDetail>(
      SHORTCUT_OVERLAY_EVENT,
      {
        detail: { action: 'hold', state: 'start', trigger: 'test' },
      }
    );

    act(() => {
      window.dispatchEvent(openEvent);
    });

    expect(
      screen.getByText('Show keyboard shortcuts')
    ).toBeInTheDocument();
    expect(screen.getByText('Open settings')).toBeInTheDocument();
    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveAttribute('data-conflict', 'true');
    expect(items[1]).toHaveAttribute('data-conflict', 'true');
  });
});
