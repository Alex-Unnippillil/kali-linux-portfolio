import React, { act } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { Desktop } from '../components/screen/desktop';

jest.mock('next/dynamic', () => jest.fn(() => () => null));
jest.mock('react-ga4', () => ({ send: jest.fn(), event: jest.fn() }));
jest.mock('html-to-image', () => ({ toPng: jest.fn().mockResolvedValue('data:image/png;base64,') }));
jest.mock('../components/util-components/background-image', () => () => <div data-testid="background" />);
jest.mock('../components/base/window', () => () => <div data-testid="window" />);
jest.mock('../components/screen/all-applications', () => () => <div data-testid="all-apps" />);
jest.mock('../components/screen/shortcut-selector', () => () => <div data-testid="shortcut-selector" />);
jest.mock('../components/screen/window-switcher', () => () => <div data-testid="window-switcher" />);
jest.mock('../components/context-menus/desktop-menu', () => ({
  __esModule: true,
  default: () => <div data-testid="desktop-menu" />,
}));
jest.mock('../components/context-menus/default', () => ({
  __esModule: true,
  default: () => <div data-testid="default-menu" />,
}));
jest.mock('../components/context-menus/app-menu', () => ({
  __esModule: true,
  default: () => <div data-testid="app-menu" />,
}));
jest.mock('../components/context-menus/taskbar-menu', () => ({
  __esModule: true,
  default: () => <div data-testid="taskbar-menu" />,
}));
jest.mock('../utils/recentStorage', () => ({ addRecentApp: jest.fn() }));

describe('Desktop keyboard navigation', () => {
  const setupDesktopState = (instance: Desktop) => {
    act(() => {
      instance.setState((prev) => ({
        desktop_apps: ['firefox', 'trash', 'about', 'gedit'],
        desktop_icon_positions: {
          ...prev.desktop_icon_positions,
          firefox: { x: 24, y: 72 },
          trash: { x: 152, y: 72 },
          about: { x: 24, y: 184 },
          gedit: { x: 152, y: 184 },
        },
        disabled_apps: {
          ...prev.disabled_apps,
          firefox: false,
          trash: false,
          about: false,
          gedit: false,
        },
        closed_windows: {
          ...prev.closed_windows,
          firefox: true,
          trash: true,
          about: true,
          gedit: true,
        },
        minimized_windows: {
          ...prev.minimized_windows,
          firefox: false,
          trash: false,
          about: false,
          gedit: false,
        },
      }));
    });
  };

  const renderDesktop = () => {
    const desktopRef = React.createRef<Desktop>();
    render(
      <Desktop
        ref={desktopRef}
        clearSession={() => {}}
        changeBackgroundImage={() => {}}
        bg_image_name="aurora"
        snapEnabled
      />
    );
    const instance = desktopRef.current!;
    setupDesktopState(instance);
    return instance;
  };

  it('moves focus between desktop icons with arrow keys', () => {
    renderDesktop();

    const firefoxIcon = screen.getByRole('button', { name: 'Firefox' });
    const trashIcon = screen.getByRole('button', { name: 'Trash' });
    const contactIcon = screen.getByRole('button', { name: 'Contact Me' });
    const aboutIcon = screen.getByRole('button', { name: 'About Alex' });

    firefoxIcon.focus();
    expect(firefoxIcon).toHaveFocus();

    fireEvent.keyDown(firefoxIcon, { key: 'ArrowRight' });
    expect(trashIcon).toHaveFocus();

    fireEvent.keyDown(trashIcon, { key: 'ArrowDown' });
    expect(contactIcon).toHaveFocus();

    fireEvent.keyDown(contactIcon, { key: 'ArrowLeft' });
    expect(aboutIcon).toHaveFocus();

    fireEvent.keyDown(aboutIcon, { key: 'ArrowUp' });
    expect(firefoxIcon).toHaveFocus();
  });

  it('activates desktop icons with Enter', () => {
    const instance = renderDesktop();
    const openAppSpy = jest.spyOn(instance, 'openApp').mockImplementation(() => {});
    setupDesktopState(instance);

    const firefoxIcon = screen.getByRole('button', { name: 'Firefox' });
    firefoxIcon.focus();
    fireEvent.keyDown(firefoxIcon, { key: 'Enter' });

    expect(openAppSpy).toHaveBeenCalledWith('firefox');
    openAppSpy.mockClear();

    fireEvent.keyDown(firefoxIcon, { key: ' ' });
    expect(openAppSpy).toHaveBeenCalledWith('firefox');

    openAppSpy.mockRestore();
  });
});
