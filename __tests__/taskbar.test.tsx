import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Taskbar from '../components/screen/taskbar';

jest.mock('react-ga4', () => ({ send: jest.fn(), event: jest.fn() }));

const apps = [{ id: 'app1', title: 'App One', icon: '/icon.png' }];

describe('Taskbar', () => {
  it('minimizes focused window on click', () => {
    const openApp = jest.fn();
    const minimize = jest.fn();
    const workspace = {
      closed_windows: { app1: false },
      minimized_windows: { app1: false },
      focused_windows: { app1: true },
    };
    render(
      <Taskbar
        apps={apps}
        workspace={workspace}
        openApp={openApp}
        minimize={minimize}
        displayId="display-1"
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
    const workspace = {
      closed_windows: { app1: false },
      minimized_windows: { app1: true },
      focused_windows: { app1: false },
    };
    render(
      <Taskbar
        apps={apps}
        workspace={workspace}
        openApp={openApp}
        minimize={minimize}
        displayId="display-1"
      />
    );
    const button = screen.getByRole('button', { name: /app one/i });
    fireEvent.click(button);
    expect(openApp).toHaveBeenCalledWith('app1');
  });
});
