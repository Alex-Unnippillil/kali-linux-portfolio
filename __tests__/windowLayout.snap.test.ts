import * as windowLayout from '../utils/windowLayout';

const setSafeAreaBottom = (value: string) => {
  document.documentElement.style.setProperty('--safe-area-bottom', value);
};

const setTaskbarHeight = (value: string) => {
  document.documentElement.style.setProperty('--shell-taskbar-height', value);
};

describe('windowLayout snap helpers', () => {
  beforeEach(() => {
    setSafeAreaBottom('16px');
    setTaskbarHeight('40px');
  });

  afterEach(() => {
    document.documentElement.style.removeProperty('--safe-area-bottom');
    document.documentElement.style.removeProperty('--shell-taskbar-height');
  });

  it('computes snap regions using viewport size and safe area metrics', () => {
    const regions = windowLayout.computeSnapRegions(1200, 800, 64, 40);

    expect(regions.left).toEqual({ left: 0, top: 76, width: 600, height: 668 });
    expect(regions.right).toEqual({ left: 600, top: 76, width: 600, height: 668 });
    expect(regions.top).toEqual({ left: 0, top: 76, width: 1200, height: 668 });
    expect(regions['top-left']).toEqual({ left: 0, top: 76, width: 600, height: 334 });
    expect(regions['top-right']).toEqual({ left: 600, top: 76, width: 600, height: 334 });
    expect(regions['bottom-left']).toEqual({ left: 0, top: 410, width: 600, height: 334 });
    expect(regions['bottom-right']).toEqual({ left: 600, top: 410, width: 600, height: 334 });
  });

  it('clamps provided top inset to desktop padding minimum', () => {
    const regions = windowLayout.computeSnapRegions(1024, 768, 200, 24);

    expect(regions.top.top).toBe(200);
    expect(regions.top.height).toBe(528);

    setSafeAreaBottom('0px');
    const minRegions = windowLayout.computeSnapRegions(1024, 768, 20, 24);
    expect(minRegions.top.top).toBe(76);
  });

  it('normalizes right corner snap previews to the right half', () => {
    const regions = {
      right: { left: 600, top: 76, width: 600, height: 668 },
      'top-right': { left: 600, top: 76, width: 600, height: 334 },
      'bottom-right': { left: 600, top: 410, width: 600, height: 334 },
    } as const;

    const candidate = { position: 'top-right' as const, preview: regions['top-right'] };
    const normalized = windowLayout.normalizeRightCornerSnap(candidate, regions);
    expect(normalized).toEqual({ position: 'right', preview: regions.right });

    const bottomCandidate = { position: 'bottom-right' as const, preview: regions['bottom-right'] };
    const normalizedBottom = windowLayout.normalizeRightCornerSnap(bottomCandidate, {
      right: { left: 600, top: 76, width: 0, height: 0 },
    });
    expect(normalizedBottom).toBe(bottomCandidate);
  });

  it('returns descriptive snap labels', () => {
    expect(windowLayout.getSnapLabel('top-left')).toBe('Snap top-left quarter');
    expect(windowLayout.getSnapLabel('unknown' as any)).toBe('Snap window');
    expect(windowLayout.getSnapLabel(null as any)).toBe('Snap window');
  });

  it('clamps edge thresholds between minimum and maximum', () => {
    expect(windowLayout.computeEdgeThreshold(200)).toBe(48);
    expect(windowLayout.computeEdgeThreshold(2000)).toBe(100);
    expect(windowLayout.computeEdgeThreshold(4000)).toBe(160);
  });

  it('computes percentages safely', () => {
    expect(windowLayout.percentOf(50, 200)).toBe(25);
    expect(windowLayout.percentOf(10, 0)).toBe(0);
  });
});
