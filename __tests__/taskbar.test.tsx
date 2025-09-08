import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
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
        dock={['app1']}
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
        dock={['app1']}
        openApp={openApp}
        minimize={minimize}
      />
    );
    const button = screen.getByRole('button', { name: /app one/i });
    fireEvent.click(button);
    expect(openApp).toHaveBeenCalledWith('app1');
  });

  it('shows separator and running indicator', () => {
    render(
      <Taskbar
        apps={[
          { id: 'app1', title: 'App One', icon: '/1.png' },
          { id: 'app2', title: 'App Two', icon: '/2.png' },
        ]}
        dock={['app1']}
        closed_windows={{ app1: true, app2: false }}
        minimized_windows={{}}
        focused_windows={{}}
        openApp={() => {}}
        minimize={() => {}}
      />
    );

    expect(screen.getByTestId('pinned-separator')).toBeInTheDocument();
    const running = screen.getByRole('button', { name: /app two/i });
    expect(running.querySelector('[data-testid="running-indicator"]')).toBeTruthy();
  });
});
