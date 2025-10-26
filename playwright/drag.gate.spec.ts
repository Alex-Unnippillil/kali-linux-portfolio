import { test, expect } from '@playwright/test';

type DragGateItemState = {
  id: number;
  name: string;
  dropCount: number;
  renameCount: number;
  copyCount: number;
};

type DragGateState = {
  items: DragGateItemState[];
  targetDrops: number[];
  dropLog: { itemId: number; targetId: number; time: number }[];
  copyCount: number;
};

type MemorySample = {
  label: string;
  usedJSHeapSize: number;
};

declare global {
  interface Window {
    __dragGate?: {
      state: DragGateState;
      cleanup: () => void;
      getMemoryUsage: () => number | null;
    };
    __listenerStats?: {
      getActiveListeners: () => number;
    };
  }
}

test('drag gate stress test maintains memory bounds and cleans listeners', async ({ page }) => {
  test.slow();

  await page.addInitScript(() => {
    const originalAdd = EventTarget.prototype.addEventListener;
    const originalRemove = EventTarget.prototype.removeEventListener;
    const registry = new Map<number, Map<string, Set<EventListenerOrEventListenerObject>>>();
    let targetId = 0;

    const getListenerKey = (listener: EventListenerOrEventListenerObject | null): EventListenerOrEventListenerObject | null => {
      if (!listener) return null;
      if (typeof listener === 'function') return listener;
      if (typeof listener === 'object') return listener;
      return null;
    };

    const getTargetId = (target: EventTarget): number => {
      const anyTarget = target as EventTarget & { __listenerTrackerId?: number };
      if (!anyTarget.__listenerTrackerId) {
        targetId += 1;
        Object.defineProperty(anyTarget, '__listenerTrackerId', {
          value: targetId,
          configurable: true,
        });
      }
      return anyTarget.__listenerTrackerId;
    };

    const stats = {
      getActiveListeners(): number {
        let total = 0;
        for (const typeMap of registry.values()) {
          for (const listeners of typeMap.values()) {
            total += listeners.size;
          }
        }
        return total;
      },
    };

    Object.defineProperty(window, '__listenerStats', {
      value: stats,
      configurable: true,
    });

    EventTarget.prototype.addEventListener = function patchedAdd(type: string, listener: EventListenerOrEventListenerObject | null, options?: boolean | AddEventListenerOptions) {
      originalAdd.call(this, type, listener as EventListener, options);
      const key = getListenerKey(listener as EventListenerOrEventListenerObject | null);
      if (!key) return;
      const id = getTargetId(this);
      let typeMap = registry.get(id);
      if (!typeMap) {
        typeMap = new Map();
        registry.set(id, typeMap);
      }
      let listeners = typeMap.get(type);
      if (!listeners) {
        listeners = new Set();
        typeMap.set(type, listeners);
      }
      listeners.add(key);
    };

    EventTarget.prototype.removeEventListener = function patchedRemove(type: string, listener: EventListenerOrEventListenerObject | null, options?: boolean | EventListenerOptions) {
      originalRemove.call(this, type, listener as EventListener, options);
      const key = getListenerKey(listener as EventListenerOrEventListenerObject | null);
      if (!key) return;
      const anyTarget = this as EventTarget & { __listenerTrackerId?: number };
      const id = anyTarget.__listenerTrackerId;
      if (!id) return;
      const typeMap = registry.get(id);
      if (!typeMap) return;
      const listeners = typeMap.get(type);
      if (!listeners) return;
      listeners.delete(key);
      if (listeners.size === 0) {
        typeMap.delete(type);
      }
      if (typeMap.size === 0) {
        registry.delete(id);
      }
    };
  });

  await page.goto('/');

  const baselineListeners = await page.evaluate(() => {
    return window.__listenerStats?.getActiveListeners?.() ?? 0;
  });

  await page.evaluate(() => {
    const existing = window.__dragGate;
    if (existing) {
      existing.cleanup();
    }

    const container = document.createElement('section');
    container.id = 'drag-gate-harness';
    container.setAttribute('data-testid', 'drag-gate-harness');
    container.style.position = 'fixed';
    container.style.inset = '0';
    container.style.zIndex = '9999';
    container.style.background = 'rgba(15, 23, 42, 0.92)';
    container.style.color = '#f8fafc';
    container.style.display = 'grid';
    container.style.gridTemplateColumns = 'minmax(0, 2fr) minmax(0, 1fr)';
    container.style.padding = '16px';
    container.style.gap = '16px';
    container.style.fontFamily = 'system-ui, sans-serif';

    const state: DragGateState = {
      items: Array.from({ length: 200 }, (_, index) => ({
        id: index,
        name: `Item ${index}`,
        dropCount: 0,
        renameCount: 0,
        copyCount: 0,
      })),
      targetDrops: Array.from({ length: 10 }, () => 0),
      dropLog: [],
      copyCount: 0,
    };

    const listeners: Array<() => void> = [];
    const register = (node: EventTarget, type: string, handler: EventListenerOrEventListenerObject) => {
      node.addEventListener(type, handler);
      listeners.push(() => node.removeEventListener(type, handler));
    };

    const itemGrid = document.createElement('div');
    itemGrid.setAttribute('data-testid', 'drag-source-grid');
    itemGrid.style.display = 'flex';
    itemGrid.style.flexWrap = 'wrap';
    itemGrid.style.alignContent = 'flex-start';
    itemGrid.style.gap = '8px';
    itemGrid.style.maxHeight = '45vh';
    itemGrid.style.overflow = 'auto';
    itemGrid.style.padding = '8px';
    itemGrid.style.background = 'rgba(30, 41, 59, 0.6)';
    itemGrid.style.borderRadius = '12px';

    for (let index = 0; index < 200; index += 1) {
      const item = document.createElement('div');
      item.setAttribute('data-testid', `drag-item-${index}`);
      item.setAttribute('data-item-id', `${index}`);
      item.draggable = true;
      item.textContent = `Item ${index}`;
      item.style.width = '92px';
      item.style.height = '40px';
      item.style.display = 'flex';
      item.style.alignItems = 'center';
      item.style.justifyContent = 'center';
      item.style.borderRadius = '8px';
      item.style.cursor = 'grab';
      item.style.background = 'rgba(148, 163, 184, 0.28)';
      item.style.border = '1px solid rgba(148, 163, 184, 0.45)';

      register(item, 'dragstart', (event) => {
        const dragEvent = event as DragEvent;
        dragEvent.dataTransfer?.setData('text/plain', `${index}`);
        dragEvent.dataTransfer?.setDragImage(item, 46, 20);
      });

      itemGrid.appendChild(item);
    }

    const dropZoneGrid = document.createElement('div');
    dropZoneGrid.setAttribute('data-testid', 'drop-zone-grid');
    dropZoneGrid.style.display = 'grid';
    dropZoneGrid.style.gridTemplateColumns = 'repeat(5, minmax(120px, 1fr))';
    dropZoneGrid.style.gap = '12px';
    dropZoneGrid.style.padding = '12px';
    dropZoneGrid.style.background = 'rgba(30, 41, 59, 0.6)';
    dropZoneGrid.style.borderRadius = '12px';

    for (let targetIndex = 0; targetIndex < 10; targetIndex += 1) {
      const target = document.createElement('div');
      target.setAttribute('data-testid', `drop-target-${targetIndex}`);
      target.style.height = '88px';
      target.style.border = '2px dashed rgba(148, 163, 184, 0.7)';
      target.style.borderRadius = '12px';
      target.style.display = 'flex';
      target.style.alignItems = 'center';
      target.style.justifyContent = 'center';
      target.style.background = 'rgba(15, 23, 42, 0.35)';
      target.textContent = `Target ${targetIndex} (0)`;

      register(target, 'dragover', (event) => {
        event.preventDefault();
      });

      register(target, 'drop', (event) => {
        event.preventDefault();
        const dragEvent = event as DragEvent;
        const rawId = dragEvent.dataTransfer?.getData('text/plain');
        if (!rawId) return;
        const itemId = Number(rawId);
        if (Number.isNaN(itemId)) return;
        state.targetDrops[targetIndex] += 1;
        const itemState = state.items[itemId];
        if (itemState) {
          itemState.dropCount += 1;
        }
        state.dropLog.push({ itemId, targetId: targetIndex, time: performance.now() });
        target.textContent = `Target ${targetIndex} (${state.targetDrops[targetIndex]})`;
      });

      dropZoneGrid.appendChild(target);
    }

    const copyPanel = document.createElement('div');
    copyPanel.setAttribute('data-testid', 'copy-panel');
    copyPanel.style.display = 'flex';
    copyPanel.style.flexWrap = 'wrap';
    copyPanel.style.gap = '8px';

    const copyButtons: HTMLButtonElement[] = [];

    for (let buttonIndex = 0; buttonIndex < 10; buttonIndex += 1) {
      const copyButton = document.createElement('button');
      copyButton.type = 'button';
      copyButton.setAttribute('data-testid', `copy-button-${buttonIndex}`);
      copyButton.textContent = `Copy Item ${buttonIndex}`;
      copyButton.style.padding = '8px 12px';
      copyButton.style.border = 'none';
      copyButton.style.borderRadius = '6px';
      copyButton.style.cursor = 'pointer';
      copyButton.style.background = '#2563eb';
      copyButton.style.color = '#f8fafc';

      register(copyButton, 'click', () => {
        state.copyCount += 1;
        const itemState = state.items[buttonIndex];
        if (itemState) {
          itemState.copyCount += 1;
        }
        copyButton.dataset.lastCopied = itemState ? itemState.name : '';
      });

      copyPanel.appendChild(copyButton);
      copyButtons.push(copyButton);
    }

    const renamePanel = document.createElement('div');
    renamePanel.setAttribute('data-testid', 'rename-panel');
    renamePanel.style.display = 'grid';
    renamePanel.style.gridTemplateColumns = 'repeat(auto-fill, minmax(180px, 1fr))';
    renamePanel.style.gap = '8px';
    renamePanel.style.maxHeight = '30vh';
    renamePanel.style.overflow = 'auto';
    renamePanel.style.padding = '8px';
    renamePanel.style.background = 'rgba(30, 41, 59, 0.6)';
    renamePanel.style.borderRadius = '12px';

    for (let renameIndex = 0; renameIndex < 20; renameIndex += 1) {
      const wrapper = document.createElement('label');
      wrapper.style.display = 'flex';
      wrapper.style.flexDirection = 'column';
      wrapper.style.fontSize = '12px';
      wrapper.style.color = 'rgba(226, 232, 240, 0.85)';
      wrapper.textContent = `Rename ${renameIndex}`;

      const input = document.createElement('input');
      input.setAttribute('data-testid', `rename-input-${renameIndex}`);
      input.value = state.items[renameIndex].name;
      input.style.marginTop = '4px';
      input.style.padding = '6px';
      input.style.borderRadius = '6px';
      input.style.border = '1px solid rgba(148, 163, 184, 0.6)';
      input.style.background = 'rgba(15, 23, 42, 0.6)';
      input.style.color = '#f8fafc';

      register(input, 'input', () => {
        const value = input.value;
        const itemState = state.items[renameIndex];
        if (itemState) {
          itemState.name = value;
          itemState.renameCount += 1;
          if (copyButtons[renameIndex]) {
            copyButtons[renameIndex].textContent = `Copy ${value}`;
          }
        }
      });

      wrapper.appendChild(input);
      renamePanel.appendChild(wrapper);
    }

    const leftColumn = document.createElement('div');
    leftColumn.style.display = 'flex';
    leftColumn.style.flexDirection = 'column';
    leftColumn.style.gap = '16px';
    leftColumn.appendChild(itemGrid);
    leftColumn.appendChild(renamePanel);

    const rightColumn = document.createElement('div');
    rightColumn.style.display = 'flex';
    rightColumn.style.flexDirection = 'column';
    rightColumn.style.gap = '16px';
    rightColumn.appendChild(dropZoneGrid);
    rightColumn.appendChild(copyPanel);

    container.appendChild(leftColumn);
    container.appendChild(rightColumn);
    document.body.appendChild(container);

    const cleanup = () => {
      while (listeners.length) {
        const dispose = listeners.pop();
        if (dispose) dispose();
      }
      container.remove();
    };

    window.__dragGate = {
      state,
      cleanup,
      getMemoryUsage: () => {
        const memory = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
        return memory ? memory.usedJSHeapSize : null;
      },
    };
  });

  const memorySamples: MemorySample[] = [];

  const sampleMemory = async (label: string) => {
    const value = await page.evaluate((sampleLabel) => {
      const gate = window.__dragGate;
      if (!gate) return null;
      const usage = gate.getMemoryUsage();
      if (usage === null) return null;
      return { label: sampleLabel, usedJSHeapSize: usage };
    }, label);

    if (!value) {
      throw new Error('performance.memory is not available in this browser context');
    }

    memorySamples.push(value);
  };

  await sampleMemory('initial');

  for (let index = 0; index < 200; index += 1) {
    const item = page.locator(`[data-testid="drag-item-${index}"]`);
    const target = page.locator(`[data-testid="drop-target-${index % 10}"]`);
    await item.dragTo(target, {
      sourcePosition: { x: 20, y: 20 },
      targetPosition: { x: 60, y: 44 },
    });

    if ((index + 1) % 50 === 0) {
      await sampleMemory(`drag-${index + 1}`);
    }
  }

  const dropSummary = await page.evaluate(() => {
    const gate = window.__dragGate;
    if (!gate) return null;
    return {
      totalDrops: gate.state.dropLog.length,
      perTarget: gate.state.targetDrops.slice(),
    };
  });

  expect(dropSummary).not.toBeNull();
  expect(dropSummary!.totalDrops).toBe(200);
  expect(dropSummary!.perTarget.reduce((sum, count) => sum + count, 0)).toBe(200);

  for (let index = 0; index < 50; index += 1) {
    const button = page.locator(`[data-testid="copy-button-${index % 10}"]`);
    await button.click();
    if ((index + 1) % 10 === 0) {
      await sampleMemory(`copy-${index + 1}`);
    }
  }

  const copyCount = await page.evaluate(() => window.__dragGate?.state.copyCount ?? 0);
  expect(copyCount).toBe(50);

  for (let index = 0; index < 20; index += 1) {
    const newName = `Item ${index} renamed`;
    const input = page.locator(`[data-testid="rename-input-${index}"]`);
    await input.fill(newName);
    await input.evaluate((element) => element.blur());
  }

  await sampleMemory('after-renames');

  const renameSummary = await page.evaluate(() => {
    const gate = window.__dragGate;
    if (!gate) return [];
    return gate.state.items.slice(0, 20).map((item) => ({
      name: item.name,
      renameCount: item.renameCount,
    }));
  });

  expect(renameSummary).toHaveLength(20);
  for (let index = 0; index < renameSummary.length; index += 1) {
    expect(renameSummary[index].renameCount).toBeGreaterThan(0);
    expect(renameSummary[index].name).toContain('renamed');
  }

  const maxUsage = Math.max(...memorySamples.map((sample) => sample.usedJSHeapSize));
  const baselineUsage = memorySamples[0].usedJSHeapSize;
  const growthMb = (maxUsage - baselineUsage) / (1024 * 1024);
  expect(growthMb).toBeLessThanOrEqual(10);

  await page.evaluate(() => {
    window.__dragGate?.cleanup();
  });

  const finalListeners = await page.evaluate(() => {
    return window.__listenerStats?.getActiveListeners?.() ?? 0;
  });

  expect(finalListeners).toBeLessThanOrEqual(baselineListeners);
});
