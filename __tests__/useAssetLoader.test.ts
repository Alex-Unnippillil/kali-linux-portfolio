import { renderHook, waitFor } from '@testing-library/react';
import useAssetLoader from '../hooks/useAssetLoader';

describe('useAssetLoader', () => {
  afterEach(() => {
    // Cleanup mocks to avoid leaking between tests
    // @ts-ignore
    delete global.Image;
    // @ts-ignore
    delete global.Audio;
  });

  test('resolves when all assets load', async () => {
    class MockImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_src: string) {
        setTimeout(() => {
          this.onload && this.onload();
        }, 0);
      }
    }
    class MockAudio {
      oncanplaythrough: (() => void) | null = null;
      onerror: (() => void) | null = null;
      src = '';
      load() {
        setTimeout(() => {
          this.oncanplaythrough && this.oncanplaythrough();
        }, 0);
      }
    }
    // @ts-ignore
    global.Image = MockImage;
    // @ts-ignore
    global.Audio = MockAudio;

    const { result } = renderHook(() =>
      useAssetLoader({ images: ['a.png'], sounds: ['a.mp3'] }),
    );

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe(false);
  });

  test('reports error when an asset fails to load', async () => {
    class MockImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(src: string) {
        setTimeout(() => {
          if (src.includes('bad')) {
            this.onerror && this.onerror();
          } else {
            this.onload && this.onload();
          }
        }, 0);
      }
    }
    // @ts-ignore
    global.Image = MockImage;
    // @ts-ignore - no audio loading for this test
    global.Audio = function () {};

    const { result } = renderHook(() =>
      useAssetLoader({ images: ['bad.png'] }),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe(true);
  });
});
