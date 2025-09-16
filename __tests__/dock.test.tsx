import { render, screen } from '@testing-library/react';
import Dock from '../components/desktop/Dock';

describe('Dock accessibility', () => {
  const baseProps = {
    hide: false,
    hideSideBar: jest.fn(),
    showAllApps: jest.fn(),
    allAppsView: false,
    focused_windows: {},
    isMinimized: {},
    openAppByAppId: jest.fn(),
  };

  it('announces itself as a toolbar labelled Dock', () => {
    render(
      <Dock
        {...baseProps}
        apps={[{ id: 'app-one', title: 'App One', icon: '/icon.png' }]}
        favourite_apps={{ 'app-one': true }}
        closed_windows={{ 'app-one': true }}
        pinnedApps={{ 'app-one': true }}
      />
    );

    expect(screen.getByRole('toolbar', { name: 'Dock' })).toBeInTheDocument();
  });

  it('exposes pinned and running state via aria-pressed', () => {
    render(
      <Dock
        {...baseProps}
        apps={[
          { id: 'app-one', title: 'App One', icon: '/icon1.png' },
          { id: 'app-two', title: 'App Two', icon: '/icon2.png' },
        ]}
        favourite_apps={{ 'app-one': true, 'app-two': true }}
        closed_windows={{ 'app-one': true, 'app-two': false }}
        pinnedApps={{ 'app-one': true }}
      />
    );

    expect(screen.getByRole('button', { name: 'App One' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'App Two' })).toHaveAttribute('aria-pressed', 'mixed');
  });
});

