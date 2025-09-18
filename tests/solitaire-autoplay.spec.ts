import { expect, test } from "@playwright/test";

const MOVES_TARGET = 100;

test.describe("Solitaire autoplay stability", () => {
  test("runs autoplay moves, resets, and cleans up listeners", async ({
    page,
  }) => {
    test.setTimeout(120000);

    await page.addInitScript(() => {
      try {
        window.localStorage.setItem("booting_screen", "false");
        window.localStorage.setItem("screen-locked", "false");
        window.localStorage.setItem("shut-down", "false");
      } catch {
        /* ignore storage failures */
      }

      type Listener = EventListenerOrEventListenerObject;
      type ListenerSet = Set<Listener>;
      type TypeMap = Map<string, ListenerSet>;

      const registry = new WeakMap<EventTarget, TypeMap>();
      const totals = { total: 0 };
      const perType = new Map<string, number>();

      const originalAdd = EventTarget.prototype.addEventListener;
      const originalRemove = EventTarget.prototype.removeEventListener;

      const getCapture = (
        options?: boolean | AddEventListenerOptions,
      ): boolean => {
        if (typeof options === "boolean") return options;
        if (typeof options === "object" && options) return !!options.capture;
        return false;
      };

      const ensureMap = (target: EventTarget): TypeMap => {
        let map = registry.get(target);
        if (!map) {
          map = new Map();
          registry.set(target, map);
        }
        return map;
      };

      const ensureSet = (map: TypeMap, key: string): ListenerSet => {
        let set = map.get(key);
        if (!set) {
          set = new Set();
          map.set(key, set);
        }
        return set;
      };

      const increment = (type: string) => {
        totals.total += 1;
        perType.set(type, (perType.get(type) || 0) + 1);
      };

      const decrement = (type: string) => {
        totals.total = Math.max(0, totals.total - 1);
        const current = perType.get(type) || 0;
        if (current <= 1) {
          perType.delete(type);
        } else {
          perType.set(type, current - 1);
        }
      };

      EventTarget.prototype.addEventListener = function add(
        type,
        listener,
        options,
      ) {
        if (listener) {
          const capture = getCapture(options);
          const key = `${type}::${capture ? "1" : "0"}`;
          const map = ensureMap(this);
          const set = ensureSet(map, key);
          if (!set.has(listener)) {
            set.add(listener);
            increment(type);
          }
        }
        return originalAdd.call(this, type, listener, options);
      };

      EventTarget.prototype.removeEventListener = function remove(
        type,
        listener,
        options,
      ) {
        if (listener) {
          const capture = getCapture(options);
          const key = `${type}::${capture ? "1" : "0"}`;
          const map = registry.get(this);
          const set = map?.get(key);
          if (set && set.has(listener)) {
            set.delete(listener);
            if (set.size === 0) {
              map.delete(key);
            }
            if (map && map.size === 0) {
              registry.delete(this);
            }
            decrement(type);
          }
        }
        return originalRemove.call(this, type, listener, options);
      };

      window.__listenerTracker = {
        summary() {
          const byType: Record<string, number> = {};
          perType.forEach((value, key) => {
            byType[key] = value;
          });
          return { total: totals.total, byType };
        },
      };
    });

    await page.goto("/");
    await page.waitForSelector("#window-area");
    await page.waitForTimeout(1000);

    const baseline = await page.evaluate(() =>
      (window as any).__listenerTracker.summary(),
    );
    const heapBefore = await page.evaluate(() => {
      const memory = (performance as any).memory as
        | { usedJSHeapSize: number }
        | undefined;
      if (!memory) return null;
      return memory.usedJSHeapSize;
    });

    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent("open-app", { detail: "solitaire" }),
      );
    });

    await page.waitForSelector("#solitaire");
    await page.getByRole("button", { name: "Solve" }).click();

    await page.waitForFunction(
      (target) => {
        const root = document.querySelector("#solitaire");
        if (!root) return false;
        const node = Array.from(root.querySelectorAll("span")).find((span) =>
          span.textContent?.trim().startsWith("Moves:"),
        );
        if (!node || !node.textContent) return false;
        const match = node.textContent.match(/Moves:\s*(\d+)/);
        const value = match ? Number(match[1]) : 0;
        return value >= target;
      },
      MOVES_TARGET,
      { timeout: 60000 },
    );

    const movesBeforeRestart = await page.evaluate(() => {
      const root = document.querySelector("#solitaire");
      if (!root) return 0;
      const node = Array.from(root.querySelectorAll("span")).find((span) =>
        span.textContent?.trim().startsWith("Moves:"),
      );
      if (!node || !node.textContent) return 0;
      const match = node.textContent.match(/Moves:\s*(\d+)/);
      return match ? Number(match[1]) : 0;
    });

    expect(movesBeforeRestart).toBeGreaterThanOrEqual(MOVES_TARGET);

    await page.getByRole("button", { name: "Restart" }).click();

    await page.waitForFunction(
      () => {
        const root = document.querySelector("#solitaire");
        if (!root) return false;
        const node = Array.from(root.querySelectorAll("span")).find((span) =>
          span.textContent?.trim().startsWith("Moves:"),
        );
        if (!node || !node.textContent) return false;
        const match = node.textContent.match(/Moves:\s*(\d+)/);
        const value = match ? Number(match[1]) : 0;
        return value === 0;
      },
      undefined,
      { timeout: 10000 },
    );

    await page.click("#close-solitaire");
    await page.waitForSelector("#solitaire", { state: "detached" });

    await page.waitForFunction(
      (expected) => {
        const summary = (window as any).__listenerTracker.summary();
        if (summary.total !== expected.total) return false;
        const expectedEntries = Object.entries(expected.byType ?? {});
        const summaryEntries = Object.entries(summary.byType ?? {});
        if (expectedEntries.length !== summaryEntries.length) return false;
        return expectedEntries.every(
          ([type, count]) => summary.byType[type] === count,
        );
      },
      baseline,
      { timeout: 5000 },
    );

    const finalSummary = await page.evaluate(() =>
      (window as any).__listenerTracker.summary(),
    );
    expect(finalSummary.total).toBe(baseline.total);
    expect(finalSummary.byType).toEqual(baseline.byType);

    if (heapBefore !== null) {
      const heapAfter = await page.evaluate(() => {
        const memory = (performance as any).memory as
          | { usedJSHeapSize: number }
          | undefined;
        if (!memory) return null;
        return memory.usedJSHeapSize;
      });
      if (heapAfter !== null) {
        expect(heapAfter).toBeLessThanOrEqual(heapBefore + 10_000_000);
      }
    }
  });
});
