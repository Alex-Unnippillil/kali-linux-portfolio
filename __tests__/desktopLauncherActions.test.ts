import { Desktop } from '../components/screen/desktop';

jest.mock('react-ga4', () => ({ event: jest.fn(), send: jest.fn() }));
jest.mock('html-to-image', () => ({ toPng: jest.fn().mockResolvedValue('data:image/png;base64,') }));
jest.mock('../components/util-components/background-image', () => () => null);
jest.mock('../components/base/ubuntu_app', () => () => null);
jest.mock('../components/screen/all-applications', () => () => null);
jest.mock('../components/screen/shortcut-selector', () => () => null);
jest.mock('../components/screen/window-switcher', () => () => null);
jest.mock('../components/context-menus/desktop-menu', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('../components/context-menus/default', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('../components/context-menus/app-menu', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('../components/context-menus/taskbar-menu', () => ({
  __esModule: true,
  default: () => null,
}));

describe('Desktop launcher actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens an app in the current workspace without switching', () => {
    const desktop = new Desktop();
    const openSpy = jest.spyOn(desktop, 'openApp').mockImplementation(() => {});
    const switchSpy = jest.spyOn(desktop, 'switchWorkspace');

    desktop.state.activeWorkspace = 1;
    desktop.openAppInWorkspace('about', 1);

    expect(switchSpy).not.toHaveBeenCalled();
    expect(openSpy).toHaveBeenCalledWith('about');
  });

  it('switches workspaces before opening in another workspace', () => {
    const desktop = new Desktop();
    const openSpy = jest.spyOn(desktop, 'openApp').mockImplementation(() => {});
    const switchSpy = jest.spyOn(desktop, 'switchWorkspace').mockImplementation((workspaceId: number, callback?: () => void) => {
      if (callback) callback();
    });

    desktop.openAppInWorkspace('about', 2);

    expect(switchSpy).toHaveBeenCalledWith(2, expect.any(Function));
    expect(openSpy).toHaveBeenCalledWith('about');
  });

  it('falls back to opening when workspace is out of range', () => {
    const desktop = new Desktop();
    desktop.state.workspaces = [{ id: 0, label: 'Workspace 1' } as any];
    const openSpy = jest.spyOn(desktop, 'openApp').mockImplementation(() => {});
    const switchSpy = jest.spyOn(desktop, 'switchWorkspace');

    desktop.openAppInWorkspace('about', 5);

    expect(switchSpy).not.toHaveBeenCalled();
    expect(openSpy).toHaveBeenCalledWith('about');
  });

  it('computes pinned status from favourites and overrides', () => {
    const desktop = new Desktop();
    desktop.initFavourite = { about: true, files: false };
    desktop.state.favourite_apps = { files: true, notes: true } as any;

    expect(desktop.isAppPinned('about')).toBe(true);
    expect(desktop.isAppPinned('files')).toBe(false);
    expect(desktop.isAppPinned('notes')).toBe(true);
    expect(desktop.isAppPinned('unknown')).toBe(false);
  });
});
