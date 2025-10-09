import React from 'react';
import { Desktop } from '../components/screen/desktop';

jest.mock('react-ga4', () => ({ send: jest.fn(), event: jest.fn() }));
jest.mock('html-to-image', () => ({ toPng: jest.fn().mockResolvedValue('data:image/png;base64,') }));
jest.mock('../components/util-components/background-image', () => () => <div data-testid="background" />);
jest.mock('../components/base/window', () => () => <div data-testid="window" />);
jest.mock('../components/base/ubuntu_app', () => () => <div data-testid="ubuntu-app" />);
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

describe('Desktop selection utilities', () => {
  it('collects icons whose bounds overlap the selection box', () => {
    const desktop = new Desktop();
    desktop.iconDimensions = { width: 80, height: 80 };
    desktop.state.desktop_apps = ['first', 'second', 'third'];
    desktop.state.desktop_icon_positions = {
      first: { x: 0, y: 0 },
      second: { x: 40, y: 40 },
      third: { x: 200, y: 200 },
    };

    const selection = { left: 30, top: 30, right: 110, bottom: 110, width: 80, height: 80 };
    const result = desktop.getIconsWithinSelectionBox(selection);
    expect(result).toEqual(['first', 'second']);
  });

  it('returns unique ids even when icons share overlapping coordinates', () => {
    const desktop = new Desktop();
    desktop.iconDimensions = { width: 72, height: 72 };
    desktop.state.desktop_apps = ['alpha', 'beta'];
    desktop.state.desktop_icon_positions = {
      alpha: { x: 10, y: 10 },
      beta: { x: 10, y: 10 },
    };

    const selection = { left: 0, top: 0, right: 90, bottom: 90, width: 90, height: 90 };
    const result = desktop.getIconsWithinSelectionBox(selection);
    expect(result).toEqual(['alpha', 'beta']);
  });
});
