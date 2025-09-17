import React from 'react';
import { render, screen, fireEvent, within, act, waitFor } from '@testing-library/react';
import Taskbar from '../components/screen/taskbar';

jest.mock('react-ga4', () => ({ send: jest.fn(), event: jest.fn() }));

const apps = [{ id: 'app1', title: 'App One', icon: '/icon.png' }];

const overflowingApps = [
  { id: 'app1', title: 'App One', icon: '/icon.png' },
  { id: 'app2', title: 'App Two', icon: '/icon.png' },
  { id: 'app3', title: 'App Three', icon: '/icon.png' },
];

function mockDimensions(toolbar: HTMLElement, overflowButton: HTMLElement, measurementWidth: number) {
  Object.defineProperty(toolbar, 'clientWidth', {
    value: 150,
    configurable: true,
  });

  const measurementButtons = document.querySelectorAll<HTMLButtonElement>('button[data-measurement="true"]');
  measurementButtons.forEach(button => {
    Object.defineProperty(button, 'offsetWidth', {
      value: measurementWidth,
      configurable: true,
    });
  });

  Object.defineProperty(overflowButton, 'offsetWidth', {
    value: 40,
    configurable: true,
  });
}

describe('Taskbar', () => {
  it('minimizes focused window on click', () => {
    const openApp = jest.fn();
    const minimize = jest.fn();
    render(
      <Taskbar
        apps={apps}
        closed_windows={{ app1: false }}
        minimized_windows={{ app1: false }}
        focused_windows={{ app1: true }}
        openApp={openApp}
        minimize={minimize}
      />
    );
    const button = screen.getByRole('button', { name: /app one/i });
    fireEvent.click(button);
    expect(minimize).toHaveBeenCalledWith('app1');
    expect(button).toHaveAttribute('data-context', 'taskbar');
  });

  it('restores minimized window on click', () => {
    const openApp = jest.fn();
    const minimize = jest.fn();
    render(
      <Taskbar
        apps={apps}
        closed_windows={{ app1: false }}
        minimized_windows={{ app1: true }}
        focused_windows={{ app1: false }}
        openApp={openApp}
        minimize={minimize}
      />
    );
    const button = screen.getByRole('button', { name: /app one/i });
    fireEvent.click(button);
    expect(openApp).toHaveBeenCalledWith('app1');
  });
});

it('shows an overflow toggle and menu when items exceed available width', () => {
  const openApp = jest.fn();
  const minimize = jest.fn();

  render(
    <Taskbar
      apps={overflowingApps}
      closed_windows={{ app1: false, app2: false, app3: false }}
      minimized_windows={{ app1: false, app2: false, app3: false }}
      focused_windows={{ app1: true, app2: false, app3: false }}
      openApp={openApp}
      minimize={minimize}
    />
  );

  const toolbar = screen.getByRole('toolbar');
  const overflowToggle = screen.getByLabelText(/show more running applications/i);

  mockDimensions(toolbar, overflowToggle, 80);

  act(() => {
    fireEvent(window, new Event('resize'));
  });

  expect(overflowToggle).not.toBeDisabled();

  fireEvent.click(overflowToggle);

  const menu = screen.getByRole('menu', { name: /overflow taskbar items/i });
  const menuItems = within(menu).getAllByRole('menuitem');

  expect(menuItems).toHaveLength(2);
  expect(menuItems[0]).toHaveAccessibleName('App Two');
  expect(menuItems[1]).toHaveAccessibleName('App Three');
});

it('supports keyboard navigation inside the overflow menu', async () => {
  const openApp = jest.fn();
  const minimize = jest.fn();

  render(
    <Taskbar
      apps={overflowingApps}
      closed_windows={{ app1: false, app2: false, app3: false }}
      minimized_windows={{ app1: false, app2: false, app3: false }}
      focused_windows={{ app1: true, app2: false, app3: false }}
      openApp={openApp}
      minimize={minimize}
    />
  );

  const toolbar = screen.getByRole('toolbar');
  const overflowToggle = screen.getByLabelText(/show more running applications/i);

  mockDimensions(toolbar, overflowToggle, 80);

  act(() => {
    fireEvent(window, new Event('resize'));
  });

  fireEvent.click(overflowToggle);

  const menu = screen.getByRole('menu', { name: /overflow taskbar items/i });
  const menuItems = within(menu).getAllByRole('menuitem');

  await waitFor(() => expect(menuItems[0]).toHaveFocus());

  fireEvent.keyDown(menu, { key: 'ArrowDown' });
  expect(menuItems[1]).toHaveFocus();

  fireEvent.keyDown(menu, { key: 'ArrowUp' });
  expect(menuItems[0]).toHaveFocus();

  fireEvent.keyDown(menu, { key: 'End' });
  expect(menuItems[menuItems.length - 1]).toHaveFocus();

  fireEvent.keyDown(menu, { key: 'Escape' });
  expect(overflowToggle).toHaveFocus();
});
