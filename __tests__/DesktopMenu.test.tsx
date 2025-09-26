import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DesktopMenu from '../components/context-menus/DesktopMenu';

describe('DesktopMenu', () => {
  const baseProps = () => ({
    active: true,
    position: { x: 100, y: 200 },
    onClose: jest.fn(),
    onAddNewFolder: jest.fn(),
    onOpenShortcutSelector: jest.fn(),
    onOpenTerminal: jest.fn(),
    onChangeWallpaper: jest.fn(),
    onDisplaySettings: jest.fn(),
    onClearSession: jest.fn(),
  });

  it('calls onClose when Escape is pressed', () => {
    const props = baseProps();
    render(<DesktopMenu {...props} />);
    const menu = screen.getByRole('menu');
    fireEvent.keyDown(menu, { key: 'Escape' });
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it('closes when focus leaves the menu', () => {
    const props = baseProps();
    render(<DesktopMenu {...props} />);
    const firstItem = screen.getAllByRole('menuitem')[0];
    firstItem.focus();
    fireEvent.blur(firstItem, { relatedTarget: null });
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it('supports arrow key navigation between items', async () => {
    const props = baseProps();
    render(<DesktopMenu {...props} />);
    const items = screen.getAllByRole('menuitem');
    items[0].focus();
    await userEvent.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(items[1]);
    await userEvent.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(items[2]);
  });
});
