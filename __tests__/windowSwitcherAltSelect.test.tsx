import { act, render, cleanup } from '@testing-library/react';
import WindowSwitcher, { WINDOW_SWITCHER_CYCLE_EVENT } from '../components/screen/window-switcher';

describe('WindowSwitcher keyboard interactions', () => {
  afterEach(() => {
    cleanup();
    jest.restoreAllMocks();
  });

  it('selects the highlighted window when Alt is released', () => {
    const onSelect = jest.fn();
    const windows = [
      { id: 'one', title: 'First App', icon: '/icon-1.png' },
      { id: 'two', title: 'Second App', icon: '/icon-2.png' },
      { id: 'three', title: 'Third App', icon: '/icon-3.png' },
    ];

    render(
      <WindowSwitcher
        windows={windows}
        onSelect={onSelect}
        onClose={jest.fn()}
        initialWindowId="one"
      />
    );

    act(() => {
      window.dispatchEvent(
        new CustomEvent(WINDOW_SWITCHER_CYCLE_EVENT, { detail: { direction: 1 } })
      );
    });

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Alt' }));
    });

    expect(onSelect).toHaveBeenCalledWith('two');
  });
});
