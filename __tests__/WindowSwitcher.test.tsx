import { render, screen, act } from '@testing-library/react';
import WindowSwitcher, { WindowInfo } from '../src/wm/WindowSwitcher';

describe('WindowSwitcher', () => {
  it('shows overlay when Alt+Tab is pressed', () => {
    const windows: WindowInfo[] = [{ id: '1', title: 'Window 1', icon: '/icon.png' }];
    render(<WindowSwitcher windows={windows} />);
    expect(screen.queryByText('Window 1')).toBeNull();
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', altKey: true }));
    });
    expect(screen.getByText('Window 1')).toBeInTheDocument();
  });

  it('ignores selection if mouse is clicked before Alt release', () => {
    const windows: WindowInfo[] = [{ id: '1', title: 'Window 1', icon: '/icon.png' }];
    const onSelect = jest.fn();
    render(<WindowSwitcher windows={windows} onSelect={onSelect} />);
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', altKey: true }));
    });
    expect(screen.getByText('Window 1')).toBeInTheDocument();
    act(() => {
      window.dispatchEvent(new MouseEvent('mousedown'));
      window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Alt' }));
    });
    expect(onSelect).not.toHaveBeenCalled();
  });
});
