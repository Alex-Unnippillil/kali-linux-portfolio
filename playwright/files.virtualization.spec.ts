import { expect, test } from '@playwright/test';

test.describe('File Explorer virtualization', () => {
  test('renders windowed list and keeps frame drops under 55 FPS', async ({ page }) => {
    await page.addInitScript(() => {
      const metrics = {
        frames: 0,
        start: 0,
        last: null as number | null,
        maxDelta: 0,
      };

      const originalRAF = window.requestAnimationFrame.bind(window);

      window.__frameMetrics = metrics;
      window.__resetFrameMetrics = () => {
        metrics.frames = 0;
        metrics.start = 0;
        metrics.last = null;
        metrics.maxDelta = 0;
      };

      window.requestAnimationFrame = (callback) =>
        originalRAF((timestamp) => {
          if (metrics.frames === 0) {
            metrics.start = timestamp;
          } else if (metrics.last !== null) {
            const delta = timestamp - metrics.last;
            if (delta > metrics.maxDelta) metrics.maxDelta = delta;
          }
          metrics.frames += 1;
          metrics.last = timestamp;
          callback(timestamp);
        });

      class MockFileHandle {
        name: string;
        kind: 'file';

        constructor(name: string) {
          this.name = name;
          this.kind = 'file';
        }

        async getFile() {
          return new File(['mock'], this.name, { type: 'text/plain' });
        }

        async createWritable() {
          return {
            write: async () => {},
            close: async () => {},
          };
        }
      }

      class MockDirectoryHandle {
        name: string;
        kind: 'directory';
        private _entries: (MockDirectoryHandle | MockFileHandle)[];

        constructor(name: string, entries: (MockDirectoryHandle | MockFileHandle)[]) {
          this.name = name;
          this.kind = 'directory';
          this._entries = entries;
        }

        async *entries() {
          for (const entry of this._entries) {
            await Promise.resolve();
            yield [entry.name, entry] as const;
          }
        }

        async requestPermission() {
          return 'granted';
        }
      }

      const createRoot = (count: number) => {
        const items: (MockDirectoryHandle | MockFileHandle)[] = [];
        for (let i = 0; i < count; i += 1) {
          if (i % 2 === 0) {
            items.push(new MockDirectoryHandle(`folder-${i}`, []));
          } else {
            items.push(new MockFileHandle(`file-${i}.txt`));
          }
        }
        return new MockDirectoryHandle('mock-root', items);
      };

      const rootHandle = createRoot(5000);

      Object.defineProperty(window, 'showDirectoryPicker', {
        configurable: true,
        value: async () => rootHandle,
      });

      try {
        Object.defineProperty(navigator, 'storage', {
          configurable: true,
          value: {},
        });
      } catch {
        (navigator as any).storage = {};
      }
    });

    await page.goto('http://localhost:3000/apps/files');

    await page.getByRole('button', { name: 'Open Folder' }).click();

    const firstItem = page.getByTestId('file-explorer-item').first();
    await firstItem.waitFor();

    const rendered = await page.getByTestId('file-explorer-item').count();
    expect(rendered).toBeLessThan(200);

    await page.evaluate(async () => {
      window.__resetFrameMetrics();
      const container = document.querySelector<HTMLElement>('[data-testid="file-explorer-virtual-list"]');
      if (!container) return;
      await new Promise<void>((resolve) => {
        let iterations = 0;
        const step = () => {
          container.scrollTop = (container.scrollTop + 240) % container.scrollHeight;
          iterations += 1;
          if (iterations >= 90) {
            resolve();
            return;
          }
          requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
    });

    const metrics = await page.evaluate(() => window.__frameMetrics);
    const maxDelta = metrics.maxDelta || 16;
    const minFps = 1000 / maxDelta;
    expect(minFps).toBeGreaterThanOrEqual(55);
  });
});

declare global {
  interface Window {
    __frameMetrics: {
      frames: number;
      start: number;
      last: number | null;
      maxDelta: number;
    };
    __resetFrameMetrics: () => void;
  }
}
