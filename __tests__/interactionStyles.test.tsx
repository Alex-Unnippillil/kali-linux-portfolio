import React from 'react';
import { render, screen, act } from '@testing-library/react';
import ApplicationsMenu, { KALI_CATEGORIES } from '../components/menu/ApplicationsMenu';
import PlacesMenu from '../components/menu/PlacesMenu';
import UbuntuApp from '../components/base/ubuntu_app';
import WindowStateShelf from '../components/desktop/WindowStateShelf';
import Navbar from '../components/screen/navbar';

jest.mock('../components/util-components/clock', () => () => <div data-testid="clock" />);
jest.mock('../components/util-components/status', () => () => <div data-testid="status" />);
jest.mock('../components/ui/QuickSettings', () => ({ open }: { open: boolean }) => (
  <div data-testid="quick-settings">{open ? 'open' : 'closed'}</div>
));
jest.mock('../components/menu/WhiskerMenu', () => () => <button type="button">Menu</button>);
jest.mock('../components/ui/PerformanceGraph', () => () => <div data-testid="performance" />);

describe('interactive surfaces expose consistent feedback styles', () => {
  it('Ubuntu app icons expose hover and active transitions', () => {
    render(
      <UbuntuApp
        id="terminal"
        icon="/icon.png"
        name="Terminal"
        openApp={() => {}}
      />,
    );

    const iconButton = screen.getByRole('button', { name: /terminal/i });
    expect(iconButton.className).toContain('duration-100');
    expect(iconButton.className).toContain('hover:bg-sky-400/15');
    expect(iconButton.className).toContain('active:bg-sky-400/25');
  });

  it('application and places menus include hover and active states', () => {
    const { rerender } = render(
      <ApplicationsMenu activeCategory={KALI_CATEGORIES[0]!.id} onSelect={() => {}} />,
    );

    const menuButtons = screen.getAllByRole('button');
    const activeButton = menuButtons[0];
    const inactiveButton = menuButtons[1];
    expect(activeButton.className).toContain('duration-100');
    expect(activeButton.className).toContain('active:bg-slate-700/90');
    expect(inactiveButton.className).toContain('hover:bg-slate-700/60');
    expect(inactiveButton.className).toContain('active:bg-slate-700/80');

    rerender(
      <PlacesMenu
        heading="Places"
        items={[
          { id: 'home', label: 'Home', icon: '/icon.png' },
          { id: 'downloads', label: 'Downloads', icon: '/icon.png' },
        ]}
      />,
    );

    const placeButtons = screen.getAllByRole('button');
    const firstPlace = placeButtons[0];
    expect(firstPlace.className).toContain('duration-100');
    expect(firstPlace.className).toContain('hover:bg-slate-700/60');
    expect(firstPlace.className).toContain('active:bg-slate-700/80');
  });

  it('dock buttons expose hover and active feedback', () => {
    render(<Navbar />);

    act(() => {
      window.dispatchEvent(
        new CustomEvent('workspace-state', {
          detail: {
            workspaces: [],
            activeWorkspace: 0,
            runningApps: [
              {
                id: 'terminal',
                title: 'Terminal',
                icon: '/icon.png',
                isFocused: true,
                isMinimized: false,
              },
            ],
          },
        }),
      );
    });

    const dockButton = screen.getByRole('button', { name: /terminal/i });
    expect(dockButton.className).toContain('duration-100');
    expect(dockButton.className).toContain('hover:bg-white/10');
    expect(dockButton.className).toContain('active:bg-white/20');

    const statusButton = screen.getByRole('button', { name: /system status/i });
    expect(statusButton.className).toContain('duration-100');
    expect(statusButton.className).toContain('active:bg-white/15');
  });

  it('window shelves offer consistent interactive states', () => {
    render(
      <WindowStateShelf
        label="Minimized windows"
        entries={[{ id: '1', title: 'Terminal', icon: '/icon.png' }]}
        open
        onToggle={() => {}}
        onActivate={() => {}}
        emptyLabel="None"
        anchor="left"
        accent="minimized"
      />,
    );

    const toggleButton = screen.getByRole('button', { name: /minimized windows/i });
    expect(toggleButton.className).toContain('duration-100');
    expect(toggleButton.className).toContain('hover:bg-white/10');
    expect(toggleButton.className).toContain('active:bg-white/15');

    const entryButton = screen.getByRole('button', { name: /terminal/i });
    expect(entryButton.className).toContain('hover:bg-white/10');
    expect(entryButton.className).toContain('active:bg-white/15');
  });
});

