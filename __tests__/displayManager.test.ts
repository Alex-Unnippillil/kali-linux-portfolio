import { DisplayManager, computeWindowPlacement, DisplayInfo } from '../modules/displayManager';

describe('display manager window placement', () => {
  const primary: DisplayInfo = {
    id: 'primary',
    label: 'Primary Display',
    left: 0,
    top: 0,
    width: 1920,
    height: 1080,
    scaleFactor: 1,
    isPrimary: true,
  };

  const secondary: DisplayInfo = {
    id: 'secondary',
    label: 'Secondary Display',
    left: 0,
    top: 0,
    width: 1280,
    height: 720,
    scaleFactor: 1,
    isPrimary: false,
  };

  it('positions a new window inside the active display', () => {
    const manager = new DisplayManager([primary, secondary], { autoDetect: false });
    const { position, size } = computeWindowPlacement(manager.getActiveDisplay(), {
      defaultWidth: 60,
      defaultHeight: 80,
    });

    expect(position.x).toBeGreaterThanOrEqual(primary.left);
    expect(position.y).toBeGreaterThanOrEqual(primary.top);
    expect(position.x + size.width).toBeLessThanOrEqual(primary.left + primary.width + 0.001);
    expect(position.y + size.height).toBeLessThanOrEqual(primary.top + primary.height + 0.001);
  });

  it('clamps an existing position when the active display shrinks', () => {
    const manager = new DisplayManager([primary, secondary], { autoDetect: false });
    manager.setActiveDisplay('secondary');
    const active = manager.getActiveDisplay();
    expect(active.id).toBe('secondary');
    const { position, size } = computeWindowPlacement(active, {
      defaultWidth: 60,
      defaultHeight: 80,
      existingPosition: { x: primary.width - 10, y: primary.height - 10 },
    });

    expect(position.x).toBeGreaterThanOrEqual(active.left);
    expect(position.y).toBeGreaterThanOrEqual(active.top);
    expect(position.x + size.width).toBeLessThanOrEqual(active.left + active.width + 0.001);
    expect(position.y + size.height).toBeLessThanOrEqual(active.top + active.height + 0.001);
  });

  it('prevents negative coordinates when reusing stored positions', () => {
    const manager = new DisplayManager([primary], { autoDetect: false });
    const { position } = computeWindowPlacement(manager.getActiveDisplay(), {
      defaultWidth: 90,
      defaultHeight: 85,
      existingPosition: { x: -500, y: -300 },
    });

    expect(position.x).toBeGreaterThanOrEqual(primary.left);
    expect(position.y).toBeGreaterThanOrEqual(primary.top);
  });
});
