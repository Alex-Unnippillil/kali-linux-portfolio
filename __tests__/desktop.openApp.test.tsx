import React from 'react';
import { render } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import fs from 'fs';
import path from 'path';

jest.doMock('react-ga4', () => ({ send: jest.fn(), event: jest.fn() }));

describe('Desktop openApp', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('opens an app and updates closed_windows state', async () => {
    const appsDir = path.join(__dirname, '../components/apps');
    fs.readdirSync(appsDir).forEach((file) => {
      const modPath = `@components/apps/${file}`;
      jest.doMock(modPath, () => new Proxy({ __esModule: true }, { get: () => () => null }));
    });

    const { default: Desktop } = await import('@components/screen/desktop');
    const { default: apps } = await import('@/apps.config.js');

    const desktopRef = React.createRef<any>();
    render(<Desktop ref={desktopRef} changeBackgroundImage={() => {}} bg_image_name="" />);

    const appId = apps[0].id;

    act(() => {
      desktopRef.current.fetchAppsData();
    });

    expect(desktopRef.current.state.closed_windows[appId]).toBe(true);

    act(() => {
      desktopRef.current.openApp(appId);
      jest.advanceTimersByTime(200);
    });

    expect(desktopRef.current.state.closed_windows[appId]).toBe(false);
  });
});
