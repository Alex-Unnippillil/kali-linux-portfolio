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

  it('reports icon positions relative to window area', () => {
    const reportIconPositions = jest.fn();
    const area = document.createElement('div');
    area.id = 'window-area';
    area.getBoundingClientRect = () => ({
      left: 10,
      top: 20,
      right: 810,
      bottom: 620,
      width: 800,
      height: 600,
      x: 10,
      y: 20,
      toJSON: () => {},
    });
    document.body.appendChild(area);

    render(
      <Taskbar
        apps={apps}
        closed_windows={{ app1: false }}
        minimized_windows={{ app1: false }}
        focused_windows={{ app1: false }}
        openApp={() => {}}
        minimize={() => {}}
        reportIconPositions={reportIconPositions}
      />
    );

    const button = screen.getByRole('button', { name: /app one/i });
    button.getBoundingClientRect = () => ({
      left: 50,
      top: 540,
      right: 98,
      bottom: 572,
      width: 48,
      height: 32,
      x: 50,
      y: 540,
      toJSON: () => {},
    });

    reportIconPositions.mockClear();
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });

    expect(reportIconPositions).toHaveBeenCalledWith({ app1: { x: 64, y: 536 } });
    area.remove();
  });
});
