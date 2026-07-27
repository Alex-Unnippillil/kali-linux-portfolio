import { test, expect } from '@playwright/test';

const initYouTubeHarness = `(() => {
  const dataUri = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
  const watchLater = [
    {
      id: 'video-1080p-1',
      title: '1080p Demo Reel One',
      thumbnail: dataUri,
      channelName: 'Test Channel One',
      channelId: 'channel-one',
    },
    {
      id: 'video-1080p-2',
      title: '1080p Demo Reel Two',
      thumbnail: dataUri,
      channelName: 'Test Channel Two',
      channelId: 'channel-two',
    },
  ];

  try {
    window.localStorage.setItem('booting_screen', 'false');
    window.localStorage.setItem('screen-locked', 'false');
    window.localStorage.setItem('youtube:watch-later', JSON.stringify(watchLater));
  } catch (error) {
    console.warn('Failed to prime localStorage for YouTube harness', error);
  }

  window.__cls = 0;
  if ('PerformanceObserver' in window) {
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            window.__cls += entry.value;
          }
        }
      }).observe({ type: 'layout-shift', buffered: true });
    } catch (observerError) {
      console.warn('CLS observer not supported', observerError);
    }
  }

  window.__playerState = { theater: false, stats: false };
  window.__ytPlayers = {};
  window.__lastPlayer = null;
  window.__playedVideos = [];

  const recordVideo = (id) => {
    if (!id) return;
    const list = window.__playedVideos;
    if (!list.includes(id)) {
      list.push(id);
    }
  };

  const trackPlayer = (player) => {
    window.__lastPlayer = player;
    window.__playerState.theater = !!player.__theater;
    window.__playerState.stats = !!player.__stats;
  };

  window.YT = {
    PlayerState: { UNSTARTED: -1, ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3, CUED: 5 },
    Player: class {
      constructor(element, options = {}) {
        this.__container = element;
        this.__events = options.events || {};
        this.__state = window.YT.PlayerState.CUED;
        this.__videoId = options.videoId || '';
        this.__quality = 'hd1080';
        this.__rate = 1;
        this.__time = 0;
        this.__theater = false;
        this.__stats = false;
        const id = element.id || 'fake-yt-' + Math.random().toString(36).slice(2);
        element.id = id;
        window.__ytPlayers[id] = this;
        this.__render();
        trackPlayer(this);
        recordVideo(this.__videoId);
        if (this.__events.onReady) {
          setTimeout(() => this.__events.onReady({ target: this }), 0);
        }
      }

      __render() {
        const root = document.createElement('div');
        root.setAttribute('data-testid', 'fake-yt-player');
        root.style.width = '100%';
        root.style.height = '100%';
        root.style.background = '#111';
        root.style.display = 'flex';
        root.style.flexDirection = 'column';
        root.style.justifyContent = 'center';
        root.style.alignItems = 'center';
        root.style.gap = '12px';

        const label = document.createElement('div');
        label.style.color = '#fff';
        label.style.fontSize = '14px';
        label.textContent = this.__videoId ? 'Playing ' + this.__videoId : 'Select a video';
        label.setAttribute('data-testid', 'fake-player-label');
        root.appendChild(label);

        const controlRow = document.createElement('div');
        controlRow.style.display = 'flex';
        controlRow.style.gap = '8px';

        const theaterBtn = document.createElement('button');
        theaterBtn.type = 'button';
        theaterBtn.textContent = 'Toggle theater';
        theaterBtn.setAttribute('data-testid', 'fake-theater-toggle');
        theaterBtn.addEventListener('click', () => {
          this.__theater = !this.__theater;
          root.dataset.theater = String(this.__theater);
          trackPlayer(this);
        });

        const statsBtn = document.createElement('button');
        statsBtn.type = 'button';
        statsBtn.textContent = 'Toggle stats';
        statsBtn.setAttribute('data-testid', 'fake-stats-toggle');
        statsBtn.addEventListener('click', () => {
          this.__stats = !this.__stats;
          root.dataset.stats = String(this.__stats);
          trackPlayer(this);
        });

        controlRow.appendChild(theaterBtn);
        controlRow.appendChild(statsBtn);
        root.appendChild(controlRow);

        this.__container.innerHTML = '';
        this.__container.appendChild(root);
      }

      loadVideoById(id) {
        this.__videoId = typeof id === 'string' ? id : id?.videoId || '';
        const label = this.__container.querySelector('[data-testid="fake-player-label"]');
        if (label) label.textContent = 'Playing ' + this.__videoId;
        this.__state = window.YT.PlayerState.PAUSED;
        trackPlayer(this);
        recordVideo(this.__videoId);
        if (this.__events.onStateChange) {
          this.__events.onStateChange({ data: this.__state });
        }
      }

      playVideo() {
        this.__state = window.YT.PlayerState.PLAYING;
        trackPlayer(this);
        if (this.__events.onStateChange) {
          this.__events.onStateChange({ data: this.__state });
        }
      }

      pauseVideo() {
        this.__state = window.YT.PlayerState.PAUSED;
        trackPlayer(this);
        if (this.__events.onStateChange) {
          this.__events.onStateChange({ data: this.__state });
        }
      }

      seekTo(time) {
        this.__time = time;
      }

      getCurrentTime() {
        return this.__time;
      }

      getPlayerState() {
        return this.__state;
      }

      getPlaybackRate() {
        return this.__rate;
      }

      setPlaybackRate(rate) {
        this.__rate = rate;
      }

      getAvailablePlaybackRates() {
        return [0.5, 1, 1.5, 2];
      }

      getAvailableQualityLevels() {
        return ['large', 'hd720', 'hd1080'];
      }

      setPlaybackQuality(quality) {
        this.__quality = quality;
      }

      getPlaybackQuality() {
        return this.__quality;
      }

      destroy() {
        if (window.__ytPlayers[this.__container.id]) {
          delete window.__ytPlayers[this.__container.id];
        }
        this.__container.innerHTML = '';
        if (window.__lastPlayer === this) {
          window.__lastPlayer = null;
          window.__playerState = { theater: false, stats: false };
        }
      }
    },
  };
})();`;

test('YouTube app plays 1080p videos without regressions', async ({ page }) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('pageerror', (error) => {
    pageErrors.push(error.message);
  });

  await page.addInitScript({ content: initYouTubeHarness });
  await page.goto('/');

  const youtubeWindow = page.getByRole('dialog', { name: 'YouTube' });
  await test.step('Open the YouTube desktop app', async () => {
    const youtubeIcon = page.locator('[data-app-id="youtube"]');
    await youtubeIcon.waitFor();
    await youtubeIcon.click();
    await page.keyboard.press('Enter');
    await expect(youtubeWindow).toBeVisible();
    await page.evaluate(() => {
      (window as any).__cls = 0;
    });
  });

  const watchLaterItems = youtubeWindow.locator('[data-testid="watch-later-list"] div[tabindex="0"]');
  await expect(watchLaterItems).toHaveCount(2);

  await test.step('Play both watch-later stubs in 1080p', async () => {
    for (let i = 0; i < 2; i += 1) {
      await watchLaterItems.nth(i).click();
      await expect(youtubeWindow.locator('[data-testid="fake-yt-player"]')).toBeVisible();

      const playButton = youtubeWindow.getByRole('button', { name: 'Play' });
      await playButton.click();
      await expect(youtubeWindow.getByRole('button', { name: 'Pause' })).toBeVisible();

      const quality = await page.evaluate(() => {
        const player = (window as any).__lastPlayer;
        if (player?.setPlaybackQuality && player?.getPlaybackQuality) {
          player.setPlaybackQuality('hd1080');
          return player.getPlaybackQuality();
        }
        return null;
      });

      expect(quality).toBe('hd1080');

      await expect.poll(async () =>
        page.evaluate(() => {
          const player = (window as any).__lastPlayer;
          return player?.getPlayerState?.() ?? null;
        }),
      ).toBe(1);
    }

    const playedVideos = await page.evaluate(() => {
      const list = Array.isArray((window as any).__playedVideos)
        ? (window as any).__playedVideos
        : [];
      return Array.from(new Set(list)).sort();
    });
    expect(playedVideos).toEqual(['video-1080p-1', 'video-1080p-2']);
  });

  await test.step('Toggle player overlays', async () => {
    await youtubeWindow.locator('[data-testid="fake-theater-toggle"]').click();
    await expect.poll(async () =>
      page.evaluate(() => {
        const state = (window as any).__playerState;
        return state?.theater ?? false;
      }),
    ).toBe(true);

    await youtubeWindow.locator('[data-testid="fake-stats-toggle"]').click();
    await expect.poll(async () =>
      page.evaluate(() => {
        const state = (window as any).__playerState;
        return state?.stats ?? false;
      }),
    ).toBe(true);
  });

  await test.step('Close the player and validate metrics', async () => {
    const memoryBefore = await page.evaluate(() => {
      const perf = window.performance as any;
      if (perf?.memory && typeof perf.memory.usedJSHeapSize === 'number') {
        return perf.memory.usedJSHeapSize;
      }
      return null;
    });

    await page.locator('#close-youtube').click();
    await expect(youtubeWindow).toBeHidden();

    const memoryAfter = await page.evaluate(() => {
      const perf = window.performance as any;
      if (perf?.memory && typeof perf.memory.usedJSHeapSize === 'number') {
        return perf.memory.usedJSHeapSize;
      }
      return null;
    });

    if (memoryBefore !== null && memoryAfter !== null) {
      expect(memoryAfter).toBeLessThanOrEqual(memoryBefore * 1.1);
    }

    const cls = await page.evaluate(() => {
      const clsValue = (window as any).__cls;
      return typeof clsValue === 'number' ? clsValue : 0;
    });
    expect(cls).toBeLessThanOrEqual(0.03);
  });

  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});
