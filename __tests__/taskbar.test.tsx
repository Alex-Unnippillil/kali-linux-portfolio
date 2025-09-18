import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Taskbar from '../components/screen/taskbar';

jest.mock('react-ga4', () => ({ send: jest.fn(), event: jest.fn() }));

const apps = [{ id: 'app1', title: 'App One', icon: '/icon.png' }];

const renderTaskbar = (override = {}) => {
  const props = {
    apps,
    closed_windows: { app1: false },
    minimized_windows: { app1: false },
    focused_windows: { app1: false },
    favourite_apps: {},
    openApp: jest.fn(),
    minimize: jest.fn(),
    showAllApps: jest.fn(),
    ...override,
  };
  render(<Taskbar {...props} />);
  return props;
};

describe('Taskbar', () => {
  it('minimizes focused window on click', () => {
    const { minimize, openApp } = renderTaskbar({ focused_windows: { app1: true } });
    const button = screen.getByRole('button', { name: /app one/i });
    fireEvent.click(button);
    expect(minimize).toHaveBeenCalledWith('app1');
    expect(button).toHaveAttribute('data-context', 'taskbar');
    expect(openApp).not.toHaveBeenCalled();
  });

  it('restores minimized window on click', () => {
    const { openApp, minimize } = renderTaskbar({ minimized_windows: { app1: true } });
    const button = screen.getByRole('button', { name: /app one/i });
    fireEvent.click(button);
    expect(openApp).toHaveBeenCalledWith('app1');
    expect(minimize).not.toHaveBeenCalled();
  });

  it('dispatches preview request on hover', () => {
    const { minimize } = renderTaskbar();
    const button = screen.getByRole('button', { name: /app one/i });
    const spy = jest.spyOn(window, 'dispatchEvent');
    fireEvent.mouseEnter(button);
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ type: 'kali-request-preview' }));
    fireEvent.mouseLeave(button);
    spy.mockRestore();
    expect(minimize).not.toHaveBeenCalled();
  });
});
