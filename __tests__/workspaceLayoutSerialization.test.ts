import {
  clearStoredWorkspaceLayouts,
  deserializeWorkspaceSnapshot,
  getStoredWorkspaceLayout,
  getViewportWidthBucket,
  listStoredWorkspaceLayouts,
  saveWorkspaceLayout,
  serializeWorkspaceSnapshot,
} from '../utils/windowLayout';

describe('workspace layout serialization', () => {
  beforeEach(() => {
    clearStoredWorkspaceLayouts();
    localStorage.clear();
  });

  it('computes width buckets for different viewports', () => {
    expect(getViewportWidthBucket(375)).toBe('xs');
    expect(getViewportWidthBucket(640)).toBe('sm');
    expect(getViewportWidthBucket(1024)).toBe('lg');
    expect(getViewportWidthBucket(1600)).toBe('xl');
    expect(getViewportWidthBucket(undefined)).toBe('base');
  });

  it('serializes and deserializes a workspace snapshot', () => {
    const snapshot = serializeWorkspaceSnapshot({
      workspaceId: 2,
      closedWindows: { terminal: false, logs: true },
      windowPositions: { terminal: { x: 101.7, y: 220.2 } },
      windowSizes: { terminal: { width: 480.3, height: 360.4 } },
      stack: ['terminal'],
      viewportWidth: 1366,
    });

    expect(snapshot.workspaceId).toBe(2);
    expect(snapshot.bucket).toBe('lg');
    expect(Array.isArray(snapshot.windows)).toBe(true);
    expect(snapshot.windows).toHaveLength(1);
    expect(snapshot.windows[0]).toMatchObject({
      id: 'terminal',
      zIndex: 0,
      position: { x: 102, y: 220 },
      size: { width: 480, height: 360 },
    });

    const restored = deserializeWorkspaceSnapshot(snapshot);
    expect(restored).not.toBeNull();
    expect(restored?.workspaceId).toBe(2);
    expect(restored?.stack).toEqual(['terminal']);
    expect(restored?.positions.terminal).toEqual({ x: 102, y: 220 });
    expect(restored?.sizes.terminal).toEqual({ width: 480, height: 360 });
  });

  it('stores workspace layouts per width bucket', () => {
    const desktopLayout = serializeWorkspaceSnapshot({
      workspaceId: 0,
      closedWindows: { terminal: false },
      windowPositions: { terminal: { x: 12, y: 24 } },
      windowSizes: { terminal: { width: 420, height: 300 } },
      stack: ['terminal'],
      viewportWidth: 1280,
    });

    const compactLayout = serializeWorkspaceSnapshot({
      workspaceId: 0,
      closedWindows: { terminal: false },
      windowPositions: { terminal: { x: 8, y: 16 } },
      windowSizes: { terminal: { width: 380, height: 280 } },
      stack: ['terminal'],
      viewportWidth: 640,
    });

    saveWorkspaceLayout('Daily Ops', desktopLayout);
    saveWorkspaceLayout('Daily Ops', compactLayout);

    const summaries = listStoredWorkspaceLayouts();
    expect(summaries).toHaveLength(1);
    expect(summaries[0].name).toBe('Daily Ops');
    expect(summaries[0].buckets).toEqual(expect.arrayContaining(['lg', 'sm']));

    const large = getStoredWorkspaceLayout('Daily Ops', 1300);
    expect(large?.bucket).toBe('lg');

    const fallback = getStoredWorkspaceLayout('Daily Ops', 500);
    expect(fallback?.bucket).toBe('sm');
  });
});
