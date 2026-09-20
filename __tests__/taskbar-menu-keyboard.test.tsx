import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import TaskbarMenu from '../components/context-menus/taskbar-menu';

test('taskbar menu navigation skips disabled actions and supports Home, End, and Escape', () => {
  const onCloseMenu = jest.fn();
  render(<TaskbarMenu active pinned allowMaximize={false} onCloseMenu={onCloseMenu} />);
  const first = screen.getByRole('menuitem', { name: 'Unpin from taskbar' });
  const minimize = screen.getByRole('menuitem', { name: 'Minimize Window' });
  const last = screen.getByRole('menuitem', { name: 'Close Window' });
  fireEvent.keyDown(first, { key: 'ArrowDown' });
  expect(minimize).toHaveFocus();
  fireEvent.keyDown(minimize, { key: 'ArrowDown' });
  expect(last).toHaveFocus();
  fireEvent.keyDown(last, { key: 'Home' });
  expect(first).toHaveFocus();
  fireEvent.keyDown(first, { key: 'End' });
  expect(last).toHaveFocus();
  fireEvent.keyDown(last, { key: 'Escape' });
  expect(onCloseMenu).toHaveBeenCalledTimes(1);
});
