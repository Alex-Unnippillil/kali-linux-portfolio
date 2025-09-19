import React, { useEffect, useRef } from 'react';
import { render, waitFor, act } from '@testing-library/react';
import BackgroundImage from '../components/util-components/background-image';
import { SettingsProvider, useSettings } from '../hooks/useSettings';

jest.mock('../utils/color', () => {
  const actual = jest.requireActual('../utils/color');
  return {
    ...actual,
    getDominantColor: jest.fn(),
  };
});

const mockedDominantColor = require('../utils/color').getDominantColor as jest.MockedFunction<
  typeof import('../utils/color').getDominantColor
>;

describe('wallpaper accent updates', () => {
  const OriginalImage = global.Image;

  beforeAll(() => {
    class MockImage {
      public complete = false;
      public naturalWidth = 1920;
      public naturalHeight = 1080;
      public decoding = 'async';
      public _src = '';

      set src(value: string) {
        this._src = value;
        this.complete = true;
      }

      get src() {
        return this._src;
      }

      decode() {
        return Promise.resolve();
      }

      addEventListener() {}

      removeEventListener() {}
    }

    // @ts-ignore
    global.Image = MockImage;
  });

  afterAll(() => {
    global.Image = OriginalImage;
  });

  beforeEach(() => {
    document.documentElement.removeAttribute('style');
    mockedDominantColor.mockReset();
  });

  const Controller = ({ onReady }: { onReady: (controls: { setWallpaper: (value: string) => void }) => void }) => {
    const { setWallpaper } = useSettings();
    const readyRef = useRef(false);
    useEffect(() => {
      if (readyRef.current) return;
      readyRef.current = true;
      onReady({ setWallpaper });
    }, [onReady, setWallpaper]);
    return null;
  };

  it('updates focus variables without console warnings when wallpaper changes', async () => {
    mockedDominantColor
      .mockResolvedValueOnce('#112233')
      .mockResolvedValueOnce('#445566');

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    let controls: { setWallpaper: (value: string) => void } | undefined;

    render(
      <SettingsProvider>
        <BackgroundImage />
        <Controller onReady={(value) => {
          controls = value;
        }} />
      </SettingsProvider>,
    );

    await waitFor(() => {
      expect(mockedDominantColor).toHaveBeenCalledTimes(1);
      expect(document.documentElement.style.getPropertyValue('--color-wallpaper-accent').trim()).toBe('#112233');
      expect(document.documentElement.style.getPropertyValue('--color-focus-ring').trim()).toBe('#112233');
    });

    expect(controls).toBeDefined();

    await act(async () => {
      controls?.setWallpaper('wall-3');
    });

    await waitFor(() => {
      expect(mockedDominantColor).toHaveBeenCalledTimes(2);
      expect(document.documentElement.style.getPropertyValue('--color-wallpaper-accent').trim()).toBe('#445566');
      expect(document.documentElement.style.getPropertyValue('--color-focus-ring').trim()).toBe('#445566');
    });
    expect(warnSpy).not.toHaveBeenCalled();

    warnSpy.mockRestore();
  });
});
