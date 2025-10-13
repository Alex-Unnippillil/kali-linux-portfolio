import React from 'react';
import { render } from '@testing-library/react';
import { act } from 'react';
import { Desktop } from '../components/screen/desktop';
import { SettingsContext } from '../hooks/useSettings';
import { defaults } from '../utils/settingsStore';
import { resolveDesktopTheme } from '../utils/theme';
import { UI_HAPTIC_EVENTS, UI_HAPTIC_PATTERNS } from '../utils/uiHaptics';

function createMockComponent(testId: string, displayName: string) {
  const MockComponent = () => <div data-testid={testId} />;
  MockComponent.displayName = displayName;
  return MockComponent;
}

jest.mock('next/image', () => {
  function MockNextImage({ src, alt, ...rest }: any) {
    return <img src={src} alt={alt} {...rest} />;
  }
  MockNextImage.displayName = 'MockNextImage';
  return {
    __esModule: true,
    default: MockNextImage,
  };
});

jest.mock('react-ga4', () => ({ send: jest.fn(), event: jest.fn() }));

jest.mock('../components/base/window', () => {
  const MockWindow = createMockComponent('window', 'MockWindow');
  return {
    __esModule: true,
    default: MockWindow,
    WindowTopBar: createMockComponent('window-top-bar', 'MockWindowTopBar'),
    WindowEditButtons: ({ minimize }: any) => (
      <button type="button" aria-label="Window minimize" onClick={minimize}>
        minimize
      </button>
    ),
  };
});

jest.mock('../components/util-components/background-image', () => ({
  __esModule: true,
  default: createMockComponent('background', 'MockBackgroundImage'),
}));

jest.mock('../components/base/ubuntu_app', () => ({
  __esModule: true,
  default: createMockComponent('ubuntu-app', 'MockUbuntuApp'),
}));

jest.mock('../components/screen/all-applications', () => ({
  __esModule: true,
  default: createMockComponent('all-apps', 'MockAllApps'),
}));

jest.mock('../components/screen/shortcut-selector', () => ({
  __esModule: true,
  default: createMockComponent('shortcut-selector', 'MockShortcutSelector'),
}));

jest.mock('../components/screen/window-switcher', () => ({
  __esModule: true,
  default: createMockComponent('window-switcher', 'MockWindowSwitcher'),
}));

jest.mock('../components/context-menus/desktop-menu', () => ({
  __esModule: true,
  default: createMockComponent('desktop-menu', 'MockDesktopMenu'),
}));

jest.mock('../components/context-menus/default', () => ({
  __esModule: true,
  default: createMockComponent('default-menu', 'MockDefaultMenu'),
}));

jest.mock('../components/context-menus/app-menu', () => ({
  __esModule: true,
  default: createMockComponent('app-menu', 'MockAppMenu'),
}));

jest.mock('../components/context-menus/taskbar-menu', () => ({
  __esModule: true,
  default: createMockComponent('taskbar-menu', 'MockTaskbarMenu'),
}));

jest.mock('../utils/recentStorage', () => ({ addRecentApp: jest.fn() }));

type SettingsValue = React.ContextType<typeof SettingsContext>;

const defaultDesktopTheme = resolveDesktopTheme({
  theme: 'default',
  accent: defaults.accent,
  wallpaperName: defaults.wallpaper,
  bgImageName: defaults.wallpaper,
  useKaliWallpaper: defaults.useKaliWallpaper,
});

const createSettingsValue = (overrides: Partial<SettingsValue> = {}): SettingsValue => ({
  accent: defaults.accent,
  wallpaper: defaults.wallpaper,
  bgImageName: defaults.wallpaper,
  useKaliWallpaper: defaults.useKaliWallpaper,
  density: defaults.density as SettingsValue['density'],
  reducedMotion: defaults.reducedMotion,
  fontScale: defaults.fontScale,
  highContrast: defaults.highContrast,
  largeHitAreas: defaults.largeHitAreas,
  pongSpin: defaults.pongSpin,
  allowNetwork: defaults.allowNetwork,
  haptics: defaults.haptics,
  theme: 'default',
  desktopTheme: defaultDesktopTheme,
  setAccent: jest.fn(),
  setWallpaper: jest.fn(),
  setUseKaliWallpaper: jest.fn(),
  setDensity: jest.fn(),
  setReducedMotion: jest.fn(),
  setFontScale: jest.fn(),
  setHighContrast: jest.fn(),
  setLargeHitAreas: jest.fn(),
  setPongSpin: jest.fn(),
  setAllowNetwork: jest.fn(),
  setHaptics: jest.fn(),
  setTheme: jest.fn(),
  ...overrides,
});

const originalNavigatorVibrate = navigator.vibrate;

const setNavigatorVibrate = (
  value: Navigator['vibrate'] | ((pattern: number | number[]) => void) | undefined,
) => {
  Object.defineProperty(navigator, 'vibrate', {
    configurable: true,
    writable: true,
    value,
  });
};

describe('Desktop haptics', () => {
  beforeEach(() => {
    setNavigatorVibrate(originalNavigatorVibrate);
  });

  afterEach(() => {
    setNavigatorVibrate(originalNavigatorVibrate);
  });

  const renderDesktop = (settingsOverrides: Partial<SettingsValue> = {}) => {
    const ref = React.createRef<Desktop>();
    const result = render(
      <SettingsContext.Provider value={createSettingsValue(settingsOverrides)}>
        <Desktop
          ref={ref}
          clearSession={() => {}}
          changeBackgroundImage={() => {}}
          bg_image_name="aurora"
          snapEnabled
        />
      </SettingsContext.Provider>,
    );
    return { ref, ...result };
  };

  const buildPointerEvent = () => ({
    pointerId: 1,
    pointerType: 'mouse',
    clientX: 220,
    clientY: 220,
    stopPropagation: jest.fn(),
    preventDefault: jest.fn(),
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
  }) as unknown as PointerEvent;

  const primeDragState = (desktop: Desktop) => {
    desktop.iconDragState = {
      id: 'app-terminal',
      pointerId: 1,
      moved: true,
      selectionChangedOnPointerDown: false,
      multiSelectIntent: false,
      container: { releasePointerCapture: jest.fn() },
      offsetX: 0,
      offsetY: 0,
      startX: 0,
      startY: 0,
    } as any;
  };

  it('vibrates when dropping icons on the desktop grid', () => {
    const vibrateMock = jest.fn();
    setNavigatorVibrate(vibrateMock);

    const { ref, unmount } = renderDesktop();
    const instance = ref.current!;
    primeDragState(instance);
    jest.spyOn(instance, 'getFolderDropTarget').mockReturnValue(null);
    jest.spyOn(instance, 'resolveDropPosition').mockReturnValue({ x: 120, y: 240 });
    jest.spyOn(instance, 'updateIconPosition').mockImplementation(() => {});

    act(() => {
      instance.handleIconPointerUp(buildPointerEvent());
    });

    expect(vibrateMock).toHaveBeenCalledWith(
      UI_HAPTIC_PATTERNS[UI_HAPTIC_EVENTS.ICON_DROP],
    );

    unmount();
  });

  it('honors the haptics feature toggle when dropping icons', () => {
    const vibrateMock = jest.fn();
    setNavigatorVibrate(vibrateMock);

    const { ref, unmount } = renderDesktop({ haptics: false });
    const instance = ref.current!;
    primeDragState(instance);
    jest.spyOn(instance, 'getFolderDropTarget').mockReturnValue(null);
    jest.spyOn(instance, 'resolveDropPosition').mockReturnValue({ x: 80, y: 160 });
    jest.spyOn(instance, 'updateIconPosition').mockImplementation(() => {});

    act(() => {
      instance.handleIconPointerUp(buildPointerEvent());
    });

    expect(vibrateMock).not.toHaveBeenCalled();

    unmount();
  });

  it('fails gracefully if navigator.vibrate is unavailable', () => {
    setNavigatorVibrate(undefined);

    const { ref, unmount } = renderDesktop();
    const instance = ref.current!;
    primeDragState(instance);
    jest.spyOn(instance, 'getFolderDropTarget').mockReturnValue(null);
    jest.spyOn(instance, 'resolveDropPosition').mockReturnValue({ x: 60, y: 120 });
    jest.spyOn(instance, 'updateIconPosition').mockImplementation(() => {});

    expect(() => {
      act(() => {
        instance.handleIconPointerUp(buildPointerEvent());
      });
    }).not.toThrow();

    unmount();
  });
});
