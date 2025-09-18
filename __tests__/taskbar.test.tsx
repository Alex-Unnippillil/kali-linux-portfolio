import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Taskbar from '../components/screen/taskbar';
import { storeFocusTarget, restoreFocusTarget } from '../utils/focusManager';

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
    expect(openApp).toHaveBeenCalledWith('app1', expect.objectContaining({ trigger: expect.any(HTMLElement) }));
  });

  it('restores focus to the taskbar button when a window closes', () => {
    const openApp = jest.fn((id: string, options?: { trigger?: HTMLElement | null }) => {
      if (options?.trigger) {
        storeFocusTarget(`window:${id}`, options.trigger);
      }
    });
    const minimize = jest.fn();
    render(
      <Taskbar
        apps={apps}
        closed_windows={{ app1: true }}
        minimized_windows={{ app1: false }}
        focused_windows={{ app1: false }}
        openApp={openApp}
        minimize={minimize}
      />
    );

    const button = screen.getByRole('button', { name: /app one/i });
    button.focus();
    fireEvent.click(button);
    expect(openApp).toHaveBeenCalledWith('app1', expect.objectContaining({ trigger: expect.any(HTMLElement) }));

    const placeholder = document.createElement('button');
    document.body.appendChild(placeholder);
    placeholder.focus();

    restoreFocusTarget('window:app1', () => button);
    expect(button).toHaveFocus();

    document.body.removeChild(placeholder);
  });
});
