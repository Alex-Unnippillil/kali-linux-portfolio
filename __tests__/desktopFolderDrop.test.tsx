import { Desktop } from '../components/screen/desktop';

jest.mock('html-to-image', () => ({ toPng: jest.fn().mockResolvedValue('data:image/png;base64,') }));
jest.mock('../components/util-components/background-image', () => () => null);
jest.mock('../components/base/window', () => () => null);
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
jest.mock('../utils/recentStorage', () => ({ addRecentApp: jest.fn() }));

const createTestDesktop = () => {
  const desktop = new Desktop({
    clearSession: jest.fn(),
    changeBackgroundImage: jest.fn(),
    bg_image_name: 'test',
    snapEnabled: false,
  });
  desktop.setState = (updater: any, callback?: () => void) => {
    const prev = desktop.state;
    const partial = typeof updater === 'function' ? updater(prev) : updater;
    if (!partial) {
      if (callback) callback();
      return;
    }
    desktop.state = { ...prev, ...partial };
    if (callback) callback();
  };
  desktop.setWorkspaceState = (updater: any, callback?: () => void) => {
    if (typeof updater === 'function') {
      const partial = updater(desktop.state);
      if (partial) {
        desktop.state = { ...desktop.state, ...partial };
      }
    } else if (updater) {
      desktop.state = { ...desktop.state, ...updater };
    }
    if (callback) callback();
  };
  desktop.commitWorkspacePartial = jest.fn();
  desktop.persistIconPositions = jest.fn();
  desktop.persistFolderContents = jest.fn();
  desktop.detachIconKeyboardListeners = jest.fn();
  desktop.desktopRef.current = {
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 400, height: 400 }),
  } as unknown as HTMLDivElement;
  return desktop;
};

describe('Desktop folder drag-and-drop', () => {
  beforeEach(() => {
    window.localStorage?.clear?.();
  });

  it('moves icon metadata into folder contents on drop', () => {
    const desktop = createTestDesktop();
    desktop.getAppById = jest.fn((id: string) => {
      if (id === 'icon-app') {
        return { id: 'icon-app', title: 'Icon App', icon: '/icon.png' };
      }
      if (id === 'folder-app') {
        return { id: 'folder-app', title: 'Folder', icon: '/folder.png', isFolder: true };
      }
      return null;
    }) as any;

    desktop.state = {
      ...desktop.state,
      desktop_apps: ['icon-app', 'folder-app'],
      desktop_icon_positions: {
        'icon-app': { x: 16, y: 16 },
        'folder-app': { x: 128, y: 128 },
      },
      folder_contents: { 'folder-app': [] },
      selectedIcons: new Set(['icon-app']),
      draggingIconId: 'icon-app',
    };

    desktop.iconDragState = {
      id: 'icon-app',
      pointerId: 1,
      moved: true,
      container: { releasePointerCapture: jest.fn() },
      selectionChangedOnPointerDown: false,
      multiSelectIntent: false,
    };

    const updateSpy = jest.spyOn(desktop, 'updateIconPosition').mockImplementation(() => {});

    desktop.handleIconPointerUp({
      pointerId: 1,
      clientX: 150,
      clientY: 150,
      preventDefault: jest.fn(),
      stopPropagation: jest.fn(),
      pointerType: 'mouse',
    } as unknown as PointerEvent);

    expect(desktop.state.desktop_apps).not.toContain('icon-app');
    expect(desktop.state.folder_contents['folder-app']).toEqual([
      expect.objectContaining({ id: 'icon-app', title: 'Icon App', icon: '/icon.png' }),
    ]);
    expect(desktop.state.desktop_icon_positions['icon-app']).toBeUndefined();
    expect(desktop.persistFolderContents).toHaveBeenCalled();
    expect(desktop.persistIconPositions).toHaveBeenCalled();
    expect(desktop.state.draggingIconId).toBeNull();
    expect(updateSpy).not.toHaveBeenCalled();

    updateSpy.mockRestore();
  });
});

describe('Desktop folder windows', () => {
  beforeEach(() => {
    window.localStorage?.clear?.();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('exposes folder contents through window context when opened', () => {
    jest.useFakeTimers();
    const desktop = createTestDesktop();
    desktop.focus = jest.fn();
    desktop.saveSession = jest.fn();
    desktop.getAppById = jest.fn((id: string) => {
      if (id === 'folder-app') {
        return { id: 'folder-app', title: 'Folder', icon: '/folder.png', isFolder: true, screen: () => null };
      }
      if (id === 'icon-app') {
        return { id: 'icon-app', title: 'Icon App', icon: '/icon.png' };
      }
      return null;
    }) as any;
    desktop.validAppIds.add('folder-app');
    desktop.appMap.set('folder-app', { id: 'folder-app', title: 'Folder', icon: '/folder.png', isFolder: true, screen: () => null });

    desktop.state = {
      ...desktop.state,
      desktop_apps: ['folder-app'],
      disabled_apps: { ...desktop.state.disabled_apps, 'folder-app': false },
      favourite_apps: { ...desktop.state.favourite_apps, 'folder-app': false },
      minimized_windows: { ...desktop.state.minimized_windows, 'folder-app': false },
      closed_windows: { ...desktop.state.closed_windows, 'folder-app': true },
      folder_contents: {
        ...desktop.state.folder_contents,
        'folder-app': [{ id: 'icon-app', title: 'Icon App', icon: '/icon.png' }],
      },
    };

    desktop.openApp('folder-app');
    jest.runOnlyPendingTimers();

    expect(desktop.state.window_context['folder-app']).toMatchObject({
      folderId: 'folder-app',
      folderItems: [expect.objectContaining({ id: 'icon-app', title: 'Icon App', icon: '/icon.png' })],
    });
    expect(desktop.state.closed_windows['folder-app']).toBe(false);
  });
});
