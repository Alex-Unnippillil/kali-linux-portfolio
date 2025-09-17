import { render, cleanup } from '@testing-library/react';
import type { ReactNode } from 'react';

import AppGrid from '../components/apps/Grid';
import { SettingsContext, type Density } from '../hooks/useSettings';
import { defaults } from '../utils/settingsStore';

const gridMock = jest.fn();
let autoSizerWidth = 1024;
let autoSizerHeight = 720;

jest.mock('react-virtualized-auto-sizer', () => ({
  __esModule: true,
  default: ({ children }: { children: (size: { width: number; height: number }) => ReactNode }) =>
    children({ width: autoSizerWidth, height: autoSizerHeight }),
}));

jest.mock('react-window', () => {
  const actual = jest.requireActual('react-window');
  return {
    __esModule: true,
    ...actual,
    Grid: (props: any) => {
      gridMock(props);
      const api = {
        element: null,
        scrollToCell: jest.fn(),
        scrollToColumn: jest.fn(),
        scrollToRow: jest.fn(),
      };
      if (props.gridRef) {
        if (typeof props.gridRef === 'function') {
          props.gridRef(api);
        } else {
          props.gridRef.current = api;
        }
      }
      return null;
    },
  };
});

describe('AppGrid density presets', () => {
  beforeEach(() => {
    gridMock.mockClear();
    autoSizerWidth = 1024;
    autoSizerHeight = 720;
  });

  afterEach(() => {
    cleanup();
  });

  const baseContext = {
    accent: defaults.accent,
    setAccent: jest.fn(),
    wallpaper: defaults.wallpaper,
    setWallpaper: jest.fn(),
    density: defaults.density as Density,
    setDensity: jest.fn(),
    reducedMotion: false,
    setReducedMotion: jest.fn(),
    fontScale: defaults.fontScale,
    setFontScale: jest.fn(),
    highContrast: false,
    setHighContrast: jest.fn(),
    largeHitAreas: defaults.largeHitAreas,
    setLargeHitAreas: jest.fn(),
    pongSpin: defaults.pongSpin,
    setPongSpin: jest.fn(),
    allowNetwork: defaults.allowNetwork,
    setAllowNetwork: jest.fn(),
    haptics: defaults.haptics,
    setHaptics: jest.fn(),
    theme: 'default',
    setTheme: jest.fn(),
  } as const;

  const renderGrid = (density: Density, width = 1024) => {
    autoSizerWidth = width;
    const value = { ...baseContext, density };
    return render(
      <SettingsContext.Provider value={value}>
        <AppGrid openApp={jest.fn()} />
      </SettingsContext.Provider>,
    );
  };

  it('calculates comfortable layout at desktop width', () => {
    renderGrid('comfortable');
    const props = gridMock.mock.calls[gridMock.mock.calls.length - 1]?.[0];
    expect(props.columnCount).toBe(4);
    expect(props.columnWidth).toBeCloseTo(256);
    expect(props.rowHeight).toBeCloseTo(152);
    expect(props.cellProps.gap).toBe(24);
  });

  it('calculates cozy layout at desktop width', () => {
    renderGrid('cozy');
    const props = gridMock.mock.calls[gridMock.mock.calls.length - 1]?.[0];
    expect(props.columnCount).toBe(5);
    expect(props.columnWidth).toBeCloseTo(204.8, 1);
    expect(props.rowHeight).toBeCloseTo(136);
    expect(props.cellProps.gap).toBe(20);
  });

  it('calculates compact layout at desktop width', () => {
    renderGrid('compact');
    const props = gridMock.mock.calls[gridMock.mock.calls.length - 1]?.[0];
    expect(props.columnCount).toBe(6);
    expect(props.columnWidth).toBeCloseTo(170.67, 2);
    expect(props.rowHeight).toBeCloseTo(120);
    expect(props.cellProps.gap).toBe(16);
  });

  it('updates row height immediately when density changes', () => {
    const { rerender } = renderGrid('cozy');
    let props = gridMock.mock.calls[gridMock.mock.calls.length - 1]?.[0];
    expect(props.rowHeight).toBeCloseTo(136);

    rerender(
      <SettingsContext.Provider value={{ ...baseContext, density: 'compact' }}>
        <AppGrid openApp={jest.fn()} />
      </SettingsContext.Provider>,
    );
    props = gridMock.mock.calls[gridMock.mock.calls.length - 1]?.[0];
    expect(props.rowHeight).toBeCloseTo(120);
  });

  it('wraps columns predictably at 640px', () => {
    const comfortable = renderGrid('comfortable', 640);
    let props = gridMock.mock.calls[gridMock.mock.calls.length - 1]?.[0];
    expect(props.columnCount).toBe(2);

    gridMock.mockClear();
    comfortable.unmount();
    const cozy = renderGrid('cozy', 640);
    props = gridMock.mock.calls[gridMock.mock.calls.length - 1]?.[0];
    expect(props.columnCount).toBe(3);

    gridMock.mockClear();
    cozy.unmount();
    const compact = renderGrid('compact', 640);
    props = gridMock.mock.calls[gridMock.mock.calls.length - 1]?.[0];
    expect(props.columnCount).toBe(3);
    compact.unmount();
  });

  it('renders search input with accessible metadata', () => {
    const { container } = renderGrid('cozy');
    expect(container.querySelector('input')).toMatchInlineSnapshot(`
      <input
        aria-label="Search applications"
        class="mb-6 mt-4 w-2/3 rounded bg-black bg-opacity-20 px-4 py-2 text-white focus:outline-none md:w-1/3"
        placeholder="Search"
        value=""
      />
    `);
  });
});
