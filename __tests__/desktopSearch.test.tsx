import React from 'react';
import { render } from '@testing-library/react';
import { Desktop } from '../components/screen/desktop';

jest.mock('react-ga4', () => ({ send: jest.fn(), event: jest.fn() }));
jest.mock('html-to-image', () => ({ toPng: jest.fn().mockResolvedValue('') }));
jest.mock('../components/util-components/background-image', () => () => <div data-testid="background" />);
jest.mock('../components/base/ubuntu_app', () => {
  const React = require('react');
  return function MockUbuntuApp(props: any) {
    const content = React.isValidElement(props.displayName) || Array.isArray(props.displayName)
      ? props.displayName
      : props.displayName ?? props.name;
    return (
      <div data-testid="desktop-icon" data-app-id={props.id}>
        {content}
      </div>
    );
  };
});

describe('Desktop search', () => {
  it('matches icons using provided tags', () => {
    const desktop = new Desktop();
    const matches = desktop.computeDesktopSearchMatches('browser', ['firefox', 'about', 'trash', 'gedit']);
    expect(matches.has('firefox')).toBe(true);
    expect(matches.size).toBe(1);
  });

  it('renders only matching icons when search is active', () => {
    const desktop = new Desktop();
    desktop.state = {
      ...desktop.state,
      desktop_apps: ['firefox', 'about', 'trash', 'gedit'],
      desktop_icon_positions: {
        firefox: { x: 0, y: 0 },
        about: { x: 100, y: 0 },
        trash: { x: 0, y: 100 },
        gedit: { x: 100, y: 100 },
      },
      disabled_apps: { firefox: false, about: false, trash: false, gedit: false },
      closed_windows: { firefox: true, about: true, trash: true, gedit: true },
      minimized_windows: { firefox: false, about: false, trash: false, gedit: false },
      desktopSearchActive: true,
      desktopSearchQuery: 'trash',
      desktopSearchMatches: new Set(['trash']),
    };

    const { queryAllByTestId, rerender, container } = render(<>{desktop.renderDesktopApps()}</>);
    const visibleIcons = queryAllByTestId('desktop-icon');
    expect(visibleIcons).toHaveLength(1);
    expect(visibleIcons[0]).toHaveAttribute('data-app-id', 'trash');
    expect(container.querySelector('mark')).toHaveTextContent(/trash/i);

    desktop.state = {
      ...desktop.state,
      desktopSearchActive: false,
      desktopSearchQuery: '',
      desktopSearchMatches: new Set(),
    };

    rerender(<>{desktop.renderDesktopApps()}</>);
    const restoredIcons = queryAllByTestId('desktop-icon');
    const ids = restoredIcons.map((node) => node.getAttribute('data-app-id'));
    expect(ids.sort()).toEqual(['about', 'firefox', 'gedit', 'trash'].sort());
  });
});
