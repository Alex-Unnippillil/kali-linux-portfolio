import { Desktop, DESKTOP_SORT_MODES } from '../components/screen/desktop';

jest.mock('../apps.config', () => ({
  __esModule: true,
  default: [
    {
      id: 'gamma',
      title: 'Gamma',
      icon: 'gamma.png',
      disabled: false,
      favourite: false,
      desktop_shortcut: true,
      screen: () => null,
    },
    {
      id: 'alpha',
      title: 'Alpha',
      icon: 'alpha.png',
      disabled: false,
      favourite: false,
      desktop_shortcut: true,
      screen: () => null,
    },
    {
      id: 'beta',
      title: 'Beta',
      icon: 'beta.png',
      disabled: false,
      favourite: false,
      desktop_shortcut: true,
      screen: () => null,
    },
  ],
  games: [],
}));

jest.mock('react-ga4', () => ({ send: jest.fn(), event: jest.fn() }));
jest.mock('html-to-image', () => ({ toPng: jest.fn().mockResolvedValue('') }));

describe('Desktop sorting layout', () => {
  let desktop: Desktop;

  beforeEach(() => {
    desktop = new Desktop();
    desktop.savedIconPositions = {};
    desktop.persistIconPositions = jest.fn();
    desktop.persistDesktopSortMode = jest.fn();
    desktop.getDesktopBounds = jest.fn().mockReturnValue({ width: 800, height: 600 });
    desktop.setState = (updater: any, callback?: () => void) => {
      const result = typeof updater === 'function' ? updater(desktop.state) : updater;
      if (result) {
        desktop.state = { ...desktop.state, ...result };
        callback?.();
      }
    };
    const baseOrder = desktop.collectDesktopAppIds();
    desktop.state.desktop_apps = [...baseOrder];
    desktop.state.desktop_icon_positions = {} as Record<string, { x: number; y: number }>;
  });

  it('sorts icons by name deterministically', () => {
    const baseOrder = desktop.collectDesktopAppIds();
    const manualOrder = desktop.mergeDesktopAppOrder(baseOrder, []);
    desktop.state.desktop_apps = manualOrder;
    desktop.state.desktop_icon_positions = {
      gamma: { x: 152, y: 64 },
      alpha: { x: 24, y: 288 },
      beta: { x: 24, y: 176 },
    };

    desktop.applyDesktopSort(DESKTOP_SORT_MODES.NAME, {
      appIds: manualOrder,
      baseOrder,
      persist: true,
    });

    const firstOrder = [...desktop.state.desktop_apps];
    const firstLayout = JSON.parse(JSON.stringify(desktop.state.desktop_icon_positions));

    desktop.applyDesktopSort(DESKTOP_SORT_MODES.NAME, {
      appIds: manualOrder,
      baseOrder,
      persist: true,
    });

    expect(desktop.persistDesktopSortMode).toHaveBeenCalledWith(DESKTOP_SORT_MODES.NAME);
    expect(desktop.persistIconPositions).toHaveBeenCalledTimes(1);
    expect(desktop.state.desktop_apps).toEqual(firstOrder);
    expect(desktop.state.desktop_icon_positions).toEqual(firstLayout);

    const expectedLayout = firstOrder.reduce<Record<string, { x: number; y: number }>>((acc, id, index) => {
      const { x, y } = desktop.computeGridPosition(index);
      acc[id] = { x, y };
      return acc;
    }, {});

    expect(firstOrder).toEqual(['alpha', 'beta', 'gamma']);
    expect(firstLayout).toEqual(expectedLayout);
  });

  it('restores default order with deterministic layout', () => {
    const baseOrder = desktop.collectDesktopAppIds();
    desktop.state.desktop_apps = ['beta', 'gamma', 'alpha'];
    desktop.state.desktop_icon_positions = {
      gamma: { x: 24, y: 288 },
      alpha: { x: 24, y: 64 },
      beta: { x: 152, y: 64 },
    };

    desktop.applyDesktopSort(DESKTOP_SORT_MODES.DEFAULT, {
      appIds: desktop.state.desktop_apps,
      baseOrder,
      persist: true,
    });

    expect(desktop.state.desktop_apps).toEqual(baseOrder);
    expect(desktop.persistDesktopSortMode).toHaveBeenCalledWith(DESKTOP_SORT_MODES.DEFAULT);
    expect(desktop.persistIconPositions).toHaveBeenCalledTimes(1);

    const expectedLayout = baseOrder.reduce<Record<string, { x: number; y: number }>>((acc, id, index) => {
      const { x, y } = desktop.computeGridPosition(index);
      acc[id] = { x, y };
      return acc;
    }, {});

    expect(desktop.state.desktop_icon_positions).toEqual(expectedLayout);
  });
});
