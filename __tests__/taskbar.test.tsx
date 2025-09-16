import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Taskbar from '../components/desktop/Taskbar';

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
    expect(button).toHaveAttribute('aria-label', 'App One — Active window');
    expect(button).toHaveAttribute('aria-pressed', 'true');
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
    expect(button).toHaveAttribute('aria-label', 'App One — Minimized window');
    expect(button).toHaveAttribute('aria-pressed', 'false');
  });
});
