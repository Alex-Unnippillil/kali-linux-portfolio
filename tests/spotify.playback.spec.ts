import { test, expect } from '@playwright/test';

declare global {
  interface Window {
    __spotifyPlayCalls?: Array<{ when: number; offset: number }>;
    __spotifyRecordSnapshot?: (label: string) => unknown;
  }
}

const MP3_STUB_HEADERS = {
  status: 200,
  headers: {
    'content-type': 'audio/mpeg',
    'access-control-allow-origin': '*',
  },
  body: Buffer.alloc(1024),
};

test('spotify playlist playback stays stable and cleans up', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });

  const cleanupKey = `__spotifyCleanup_${Date.now()}`;
  await page.addInitScript((key) => {
    const cleanupStorageKey = key as string;
    const rafPending = new Set<number>();
    const frameDeltas: number[] = [];
    let lastFrame: number | null = null;
    const audioContexts: Array<{ _closed: boolean }> = [];

    // Track requestAnimationFrame usage so zombie loops can be detected later.
    const originalRaf = window.requestAnimationFrame.bind(window);
    const originalCancel = window.cancelAnimationFrame.bind(window);
    window.requestAnimationFrame = (cb) => {
      const id = originalRaf((ts) => {
        rafPending.delete(id);
        if (lastFrame !== null) {
          const delta = ts - lastFrame;
          if (!Number.isNaN(delta)) {
            frameDeltas.push(delta);
            if (frameDeltas.length > 120) frameDeltas.shift();
          }
        }
        lastFrame = ts;
        cb(ts);
      });
      rafPending.add(id);
      return id;
    };
    window.cancelAnimationFrame = (id) => {
      rafPending.delete(id);
      return originalCancel(id);
    };

    const recordSnapshot = (label: string) => {
      const snapshot = {
        label,
        closedContexts: audioContexts.map((ctx) => ctx._closed),
        rafPending: rafPending.size,
        frameDeltas: frameDeltas.slice(-60),
      };
      try {
        sessionStorage.setItem(cleanupStorageKey, JSON.stringify(snapshot));
      } catch (err) {
        console.warn('sessionStorage unavailable', err);
      }
      try {
        const existing = window.name ? JSON.parse(window.name) : {};
        existing[cleanupStorageKey] = snapshot;
        window.name = JSON.stringify(existing);
      } catch {
        window.name = JSON.stringify({ [cleanupStorageKey]: snapshot });
      }
      return snapshot;
    };

    // Stubs for Web Audio API
    class FakeGainNode {
      gain = {
        value: 0,
        setValueAtTime() {},
        linearRampToValueAtTime() {},
      };
      connect() {}
    }

    class FakeAnalyserNode {
      fftSize = 256;
      frequencyBinCount = 128;
      connect() {}
      getByteFrequencyData(array: Uint8Array) {
        const now = performance.now();
        for (let i = 0; i < array.length; i += 1) {
          const value = Math.abs(Math.sin(now / 120 + i)) * 255;
          array[i] = value;
        }
      }
    }

    const playCalls: Array<{ when: number; offset: number }> = [];
    window.__spotifyPlayCalls = playCalls;

    class FakeAudioBufferSourceNode {
      buffer: { duration: number } | null = null;
      connect() {}
      start(when = 0, offset = 0) {
        playCalls.push({ when, offset });
      }
      stop() {}
    }

    class FakeAudioContext {
      private createdAt = performance.now();
      private stateValue: 'running' | 'suspended' | 'closed' = 'running';
      _closed = false;
      destination = {
        connect() {},
      };

      constructor() {
        audioContexts.push(this);
      }

      get currentTime() {
        return (performance.now() - this.createdAt) / 1000;
      }

      get state() {
        return this.stateValue;
      }

      createGain() {
        return new FakeGainNode();
      }

      createAnalyser() {
        return new FakeAnalyserNode();
      }

      createBufferSource() {
        return new FakeAudioBufferSourceNode();
      }

      async decodeAudioData() {
        return { duration: 240 };
      }

      suspend() {
        this.stateValue = 'suspended';
        return Promise.resolve();
      }

      resume() {
        this.stateValue = 'running';
        return Promise.resolve();
      }

      close() {
        this.stateValue = 'closed';
        this._closed = true;
        recordSnapshot('close');
        setTimeout(() => recordSnapshot('post-close'), 50);
        return Promise.resolve();
      }
    }

    window.AudioContext = FakeAudioContext as unknown as typeof AudioContext;
    window.webkitAudioContext = FakeAudioContext as unknown as typeof AudioContext;
    window.__spotifyRecordSnapshot = recordSnapshot;
  }, cleanupKey);

  const fetchedUrls: string[] = [];
  await page.route('**/*.mp3', async (route) => {
    fetchedUrls.push(route.request().url());
    await route.fulfill(MP3_STUB_HEADERS);
  });

  await page.goto('/apps/spotify');

  await page.evaluate((key) => {
    sessionStorage.removeItem(key);
    window.name = '';
    localStorage.setItem('app:theme', 'default');
    document.documentElement.dataset.theme = 'default';
  }, cleanupKey);

  const playlist = Array.from({ length: 10 }, (_, i) => ({
    title: `Track ${i + 1}`,
    url: `https://example.com/fake-track-${i + 1}.mp3`,
  }));
  const playlistJson = JSON.stringify(playlist, null, 2);

  const playlistEditor = page.locator('textarea');
  await playlistEditor.fill(playlistJson);
  await page.getByRole('button', { name: 'Load Playlist' }).click();

  const queueItems = page.locator('h2:has-text("Queue") + ul li');
  await expect(queueItems).toHaveCount(10);

  const currentTitle = page.locator('div.mt-2 > p.mb-2');
  await expect(currentTitle).toHaveText('Track 1');

  const progressSlider = page.locator('input[type="range"].w-full');
  await progressSlider.waitFor();

  const nextButton = page.getByRole('button', { name: 'Next' });
  const themeCycle = ['default', 'dark', 'neon', 'matrix'];

  for (let index = 0; index < playlist.length; index += 1) {
    const trackNumber = index + 1;
    await expect(currentTitle).toHaveText(`Track ${trackNumber}`);

    const seekValue = String(trackNumber * 10);
    await progressSlider.evaluate((el, value) => {
      const input = el as HTMLInputElement;
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }, seekValue);
    await expect(progressSlider).toHaveValue(seekValue);

    const theme = themeCycle[trackNumber % themeCycle.length];
    await page.evaluate((selectedTheme) => {
      document.documentElement.dataset.theme = selectedTheme;
      localStorage.setItem('app:theme', selectedTheme);
    }, theme);

    const activeQueueItem = queueItems.nth(index);
    await expect(activeQueueItem).toHaveClass(/bg-gray-700/);

    if (index < playlist.length - 1) {
      await nextButton.click();
    }
  }

  const playCalls = await page.evaluate(() => window.__spotifyPlayCalls?.length ?? 0);
  expect(playCalls).toBeGreaterThanOrEqual(playlist.length);

  await page.waitForTimeout(100);

  await page.goto('/apps');
  await page.waitForLoadState('domcontentloaded');

  const cleanupState = await page.evaluate((key) => {
    const fromSession = sessionStorage.getItem(key);
    if (fromSession) {
      sessionStorage.removeItem(key);
      const parsed = JSON.parse(fromSession);
      window.name = '';
      return parsed;
    }
    if (window.name) {
      try {
        const payload = JSON.parse(window.name);
        if (payload && payload[key]) {
          const snapshot = payload[key];
          window.name = '';
          return snapshot;
        }
      } catch (err) {
        console.warn('Failed to parse window.name payload', err);
      }
    }
    return null;
  }, cleanupKey);

  expect(cleanupState).toBeTruthy();
  expect(Array.isArray(cleanupState.closedContexts)).toBe(true);
  expect(cleanupState.closedContexts.length).toBeGreaterThan(0);
  expect(cleanupState.closedContexts.every((flag: boolean) => flag)).toBe(true);
  expect(cleanupState.rafPending).toBe(0);

  const deltas = (cleanupState.frameDeltas as number[]).filter((delta) => Number.isFinite(delta) && delta > 0);
  expect(deltas.length).toBeGreaterThan(5);
  const maxDelta = Math.max(...deltas);
  const minDelta = Math.min(...deltas);
  expect(maxDelta).toBeLessThanOrEqual(200);
  expect(maxDelta - minDelta).toBeLessThanOrEqual(150);

  const fakeTrackFetches = fetchedUrls.filter((url) => url.includes('fake-track-'));
  expect(fakeTrackFetches.length).toBeGreaterThanOrEqual(playlist.length);
});
