import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Taskbar from '../components/screen/taskbar';
import { SettingsProvider } from '../hooks/useSettings';

jest.mock('react-ga4', () => ({ send: jest.fn(), event: jest.fn() }));

const apps = [{ id: 'app1', title: 'App One', icon: '/icon.png' }];

describe('Taskbar', () => {
  it('minimizes focused window on click', () => {
    const openApp = jest.fn();
    const minimize = jest.fn();
    render(
      <SettingsProvider>
        <Taskbar
          apps={apps}
          closed_windows={{ app1: false }}
          minimized_windows={{ app1: false }}
          focused_windows={{ app1: true }}
          openApp={openApp}
          minimize={minimize}
        />
      </SettingsProvider>
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
      <SettingsProvider>
        <Taskbar
          apps={apps}
          closed_windows={{ app1: false }}
          minimized_windows={{ app1: true }}
          focused_windows={{ app1: false }}
          openApp={openApp}
          minimize={minimize}
        />
      </SettingsProvider>
    );
    const button = screen.getByRole('button', { name: /app one/i });
    fireEvent.click(button);
    expect(openApp).toHaveBeenCalledWith('app1');
  });
});
