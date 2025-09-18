import { Desktop } from '../components/screen/desktop';

describe('Launcher focus management', () => {
  it('returns focus to the launcher button when closing the app grid', () => {
    const desktop = new Desktop();
    desktop.setState = (updater: any, callback?: () => void) => {
      const prevState = { ...desktop.state };
      const partial =
        typeof updater === 'function' ? updater(desktop.state, desktop.props) : updater;
      desktop.state = { ...desktop.state, ...partial };
      if (callback) callback();
      desktop.componentDidUpdate?.(desktop.props, prevState);
    };

    const launcherButton = document.createElement('button');
    launcherButton.setAttribute('data-launcher-trigger', 'true');
    document.body.appendChild(launcherButton);

    desktop.showAllApps({ currentTarget: launcherButton } as any);
    expect(desktop.state.allAppsView).toBe(true);

    const placeholder = document.createElement('button');
    document.body.appendChild(placeholder);
    placeholder.focus();

    desktop.showAllApps({ currentTarget: launcherButton } as any);
    expect(desktop.state.allAppsView).toBe(false);
    expect(document.activeElement).toBe(launcherButton);

    document.body.removeChild(launcherButton);
    document.body.removeChild(placeholder);
  });
});
