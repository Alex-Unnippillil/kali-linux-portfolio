import { Desktop } from '../components/screen/desktop';
import displayManager, { type DisplayInfo } from '../modules/displayManager';

describe('Desktop display bounds', () => {
  const primaryDisplay: DisplayInfo = {
    id: 'primary',
    label: 'Test Primary',
    isPrimary: true,
    scaleFactor: 1,
    bounds: { x: 0, y: 0, width: 1920, height: 1080 },
  };

  const secondaryDisplay: DisplayInfo = {
    id: 'secondary',
    label: 'Test Secondary',
    isPrimary: false,
    scaleFactor: 1,
    bounds: { x: 0, y: 0, width: 1600, height: 900 },
  };

  beforeEach(() => {
    displayManager.setVirtualDisplays([primaryDisplay, secondaryDisplay], 'primary');
  });

  afterEach(() => {
    displayManager.setVirtualDisplays([primaryDisplay, secondaryDisplay], 'primary');
  });

  const attachSetState = (desktop: Desktop) => {
    desktop.setState = ((updater: any, callback?: () => void) => {
      const nextState =
        typeof updater === 'function' ? updater(desktop.state, desktop.props) : updater;
      if (nextState && typeof nextState === 'object') {
        desktop.state = { ...desktop.state, ...nextState };
      }
      if (callback) callback();
    }) as any;
  };

  it('clamps existing windows inside the active display when bounds shrink', () => {
    const desktop = new Desktop();
    desktop.props = { activeDisplayId: 'primary', snapEnabled: false } as any;
    attachSetState(desktop);
    desktop.state.window_positions = {
      'app-1': { x: 2600, y: -120 },
      'app-2': { x: -320, y: 1500 },
    } as any;

    const smallerDisplay: DisplayInfo = {
      id: 'primary',
      label: 'Shrunk Display',
      isPrimary: true,
      scaleFactor: 1,
      bounds: { x: 0, y: 0, width: 1024, height: 640 },
    };

    displayManager.setVirtualDisplays([smallerDisplay], 'primary');
    desktop.realignWindowsToDisplay('primary');

    const active = displayManager.getDisplay('primary');
    expect(active).toBeDefined();
    const bounds = active!.bounds;
    Object.values(desktop.state.window_positions).forEach((position: any) => {
      expect(position.x).toBeGreaterThanOrEqual(bounds.x);
      expect(position.x).toBeLessThanOrEqual(bounds.x + bounds.width);
      expect(position.y).toBeGreaterThanOrEqual(bounds.y);
      expect(position.y).toBeLessThanOrEqual(bounds.y + bounds.height);
    });
  });

  it('respects the selected display when realigning windows', () => {
    const desktop = new Desktop();
    desktop.props = { activeDisplayId: 'secondary', snapEnabled: false } as any;
    attachSetState(desktop);
    desktop.state.window_positions = {
      'app-secondary': { x: 2000, y: 1200 },
    } as any;

    displayManager.setVirtualDisplays([primaryDisplay, secondaryDisplay], 'secondary');
    desktop.realignWindowsToDisplay('secondary');

    const active = displayManager.getDisplay('secondary');
    expect(active).toBeDefined();
    const bounds = active!.bounds;
    const position = desktop.state.window_positions['app-secondary'];
    expect(position.x).toBeGreaterThanOrEqual(bounds.x);
    expect(position.x).toBeLessThanOrEqual(bounds.x + bounds.width);
    expect(position.y).toBeGreaterThanOrEqual(bounds.y);
    expect(position.y).toBeLessThanOrEqual(bounds.y + bounds.height);
  });
});
