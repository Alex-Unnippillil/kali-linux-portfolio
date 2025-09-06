import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import Taskbar from '../components/screen/taskbar';

jest.mock('react-ga4', () => ({ send: jest.fn(), event: jest.fn() }));

const apps = [{ id: 'app1', title: 'App One', icon: '/icon.png' }];

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

  it('hides with autohide "always"', () => {
    localStorage.setItem('xfce.panel.autohideBehavior', JSON.stringify('always'));
    jest.useFakeTimers();
    render(
      <Taskbar
        apps={apps}
        closed_windows={{ app1: false }}
        minimized_windows={{ app1: false }}
        focused_windows={{ app1: false }}
        openApp={() => {}}
        minimize={() => {}}
      />
    );
    const toolbar = screen.getByRole('toolbar');
    fireEvent.mouseEnter(toolbar);
    fireEvent.mouseLeave(toolbar);
    act(() => {
      jest.advanceTimersByTime(150);
    });
    expect(toolbar.className).toContain('translate-y-full');
    jest.useRealTimers();
  });

  it('delays hide for autohide "intelligent"', () => {
    localStorage.setItem('xfce.panel.autohideBehavior', JSON.stringify('intelligent'));
    jest.useFakeTimers();
    render(
      <Taskbar
        apps={apps}
        closed_windows={{ app1: false }}
        minimized_windows={{ app1: false }}
        focused_windows={{ app1: false }}
        openApp={() => {}}
        minimize={() => {}}
      />
    );
    const toolbar = screen.getByRole('toolbar');
    fireEvent.mouseEnter(toolbar);
    fireEvent.mouseLeave(toolbar);
    act(() => {
      jest.advanceTimersByTime(400);
    });
    expect(toolbar.className).not.toContain('translate-y-full');
    act(() => {
      jest.advanceTimersByTime(200);
    });
    expect(toolbar.className).toContain('translate-y-full');
    jest.useRealTimers();
  });
});
