import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DesktopSwitcher, {
  DesktopSummary,
} from '../components/desktop/DesktopSwitcher';

describe('DesktopSwitcher', () => {
  const sampleDesktops: DesktopSummary[] = [
    { id: 'desk-1', name: 'Desktop 1', windows: [] },
    { id: 'desk-2', name: 'Desktop 2', windows: [] },
  ];

  const createDnDEvent = (data: Record<string, string>) => {
    const types = Object.keys(data);
    return {
      dataTransfer: {
        getData: (type: string) => data[type] || '',
        setData: jest.fn(),
        effectAllowed: 'move',
        dropEffect: 'move',
        types,
      },
      preventDefault: jest.fn(),
      stopPropagation: jest.fn(),
    } as unknown as React.DragEvent;
  };

  it('creates a new desktop and moves window when a thumbnail is dropped', () => {
    const onCreateDesktop = jest.fn(() => 'desk-3');
    const onMoveWindowToDesktop = jest.fn();
    const onSelectDesktop = jest.fn();
    const onFocusWindow = jest.fn();

    render(
      <DesktopSwitcher
        desktops={sampleDesktops}
        activeDesktopId="desk-1"
        onSelectDesktop={onSelectDesktop}
        onCreateDesktop={onCreateDesktop}
        onMoveWindowToDesktop={onMoveWindowToDesktop}
        onFocusWindow={onFocusWindow}
      />,
    );

    const dropZone = screen.getByRole('button', { name: /new desktop/i });

    const dragEnterEvent = createDnDEvent({ 'application/x-window-id': 'window-7' });
    fireEvent.dragEnter(dropZone, dragEnterEvent);
    expect(dropZone).toHaveAttribute('data-drop-active', 'true');

    const dropEvent = createDnDEvent({
      'application/x-window-id': JSON.stringify({ id: 'window-7' }),
      'application/x-desktop-id': 'desk-1',
    });
    fireEvent.drop(dropZone, dropEvent);

    expect(onCreateDesktop).toHaveBeenCalledWith({
      fromDesktopId: 'desk-1',
      windowId: 'window-7',
    });
    expect(onMoveWindowToDesktop).toHaveBeenCalledWith('window-7', 'desk-3', {
      fromDesktopId: 'desk-1',
      focus: true,
    });
    expect(onSelectDesktop).toHaveBeenCalledWith('desk-3');
    expect(onFocusWindow).toHaveBeenCalledWith('window-7');
    expect(dropZone).toHaveAttribute('data-drop-active', 'false');
  });

  it('accepts object return values from onCreateDesktop', () => {
    const onCreateDesktop = jest.fn(() => ({ id: 'desk-4' }));
    const onMoveWindowToDesktop = jest.fn();
    const onSelectDesktop = jest.fn();

    render(
      <DesktopSwitcher
        desktops={sampleDesktops}
        activeDesktopId="desk-1"
        onSelectDesktop={onSelectDesktop}
        onCreateDesktop={onCreateDesktop}
        onMoveWindowToDesktop={onMoveWindowToDesktop}
      />,
    );

    const dropZone = screen.getByRole('button', { name: /new desktop/i });

    const dropEvent = createDnDEvent({ 'application/x-window-id': 'window-9' });
    fireEvent.drop(dropZone, dropEvent);

    expect(onCreateDesktop).toHaveBeenCalledWith({
      fromDesktopId: undefined,
      windowId: 'window-9',
    });
    expect(onMoveWindowToDesktop).toHaveBeenCalledWith('window-9', 'desk-4', {
      fromDesktopId: undefined,
      focus: true,
    });
    expect(onSelectDesktop).toHaveBeenCalledWith('desk-4');
  });

  it('supports keyboard navigation between desktops', async () => {
    const user = userEvent.setup();
    const onSelectDesktop = jest.fn();

    render(
      <DesktopSwitcher
        desktops={sampleDesktops}
        activeDesktopId="desk-1"
        onSelectDesktop={onSelectDesktop}
        onCreateDesktop={() => 'desk-3'}
        onMoveWindowToDesktop={jest.fn()}
      />,
    );

    const container = screen.getByTestId('desktop-switcher');
    container.focus();
    await user.keyboard('{ArrowRight}');

    expect(onSelectDesktop).toHaveBeenCalledWith('desk-2');
  });

  it('creates a new desktop from keyboard activation', async () => {
    const user = userEvent.setup();
    const onCreateDesktop = jest.fn(() => 'desk-5');
    const onSelectDesktop = jest.fn();

    render(
      <DesktopSwitcher
        desktops={sampleDesktops}
        activeDesktopId="desk-1"
        onSelectDesktop={onSelectDesktop}
        onCreateDesktop={onCreateDesktop}
        onMoveWindowToDesktop={jest.fn()}
      />,
    );

    const dropZone = screen.getByRole('button', { name: /new desktop/i });
    dropZone.focus();
    await user.keyboard('{Enter}');

    expect(onCreateDesktop).toHaveBeenCalledWith({});
    expect(onSelectDesktop).toHaveBeenCalledWith('desk-5');
  });
});
