import { fireEvent, render } from '@testing-library/react';
import type { ComponentType } from 'react';

type AppTileModule = {
  default: ComponentType<any>;
  __clearAppTilePrefetchCacheForTests: () => void;
};

let routerPrefetch: jest.Mock;

jest.mock('next/router', () => {
  routerPrefetch = jest.fn().mockResolvedValue(undefined);
  const router = { prefetch: routerPrefetch };
  return {
    __esModule: true,
    default: router,
    prefetch: routerPrefetch,
  };
});

const mod = require('../../components/base/app-tile') as AppTileModule;
const AppTile = mod.default;
const clearCache = mod.__clearAppTilePrefetchCacheForTests;

afterEach(() => {
  routerPrefetch.mockClear();
  clearCache();
});

describe('AppTile prefetch behaviour', () => {
  it('invokes custom prefetch and router.prefetch on focus', () => {
    const customPrefetch = jest.fn();
    const { getByRole } = render(
      <AppTile id="calculator" name="Calculator" icon="/calculator.png" openApp={jest.fn()} prefetch={customPrefetch} />,
    );

    fireEvent.focus(getByRole('button'));

    expect(customPrefetch).toHaveBeenCalledTimes(1);
    expect(routerPrefetch).toHaveBeenCalledWith('/apps/calculator');
  });

  it('uses an explicit href when provided', () => {
    const { getByRole } = render(
      <AppTile id="settings" name="Settings" icon="/settings.png" openApp={jest.fn()} href="/apps/custom-settings" />,
    );

    fireEvent.mouseEnter(getByRole('button'));

    expect(routerPrefetch).toHaveBeenCalledWith('/apps/custom-settings');
  });

  it('throttles repeated prefetch attempts across instances', () => {
    const initialPrefetch = jest.fn();
    const timeSpy = jest.spyOn(Date, 'now');

    timeSpy.mockReturnValue(1_000);
    const firstRender = render(
      <AppTile id="terminal" name="Terminal" icon="/terminal.png" openApp={jest.fn()} prefetch={initialPrefetch} />,
    );

    fireEvent.focus(firstRender.getByRole('button'));
    expect(initialPrefetch).toHaveBeenCalledTimes(1);
    expect(routerPrefetch).toHaveBeenCalledTimes(1);

    firstRender.unmount();
    routerPrefetch.mockClear();

    const throttledPrefetch = jest.fn();
    timeSpy.mockReturnValue(2_000);
    const secondRender = render(
      <AppTile id="terminal" name="Terminal" icon="/terminal.png" openApp={jest.fn()} prefetch={throttledPrefetch} />,
    );

    fireEvent.mouseEnter(secondRender.getByRole('button'));
    expect(throttledPrefetch).not.toHaveBeenCalled();
    expect(routerPrefetch).not.toHaveBeenCalled();

    timeSpy.mockReturnValue(6_000);
    fireEvent.focus(secondRender.getByRole('button'));
    expect(throttledPrefetch).toHaveBeenCalledTimes(1);
    expect(routerPrefetch).toHaveBeenCalledTimes(1);

    timeSpy.mockRestore();
  });
});
