import { Desktop } from '../components/screen/desktop';

jest.mock('react-ga4', () => ({ send: jest.fn(), event: jest.fn() }));
jest.mock('html-to-image', () => ({ toPng: jest.fn().mockResolvedValue('data:image/png;base64,') }));

function createTestDesktop() {
  const desktop = new Desktop();
  desktop.props = desktop.props || {};
  const element = document.createElement('div');
  Object.defineProperty(element, 'getBoundingClientRect', {
    value: () => ({ left: 0, top: 0, width: 1024, height: 768, right: 1024, bottom: 768, x: 0, y: 0 }),
  });
  desktop.desktopRef.current = element as unknown as HTMLDivElement;

  desktop.state = {
    ...desktop.state,
    desktop_apps: ['app-1'],
    desktop_icon_positions: { 'app-1': { x: 128, y: 176 } },
  };

  desktop.setState = ((updater: any, callback?: () => void) => {
    const prev = desktop.state;
    const partial = typeof updater === 'function' ? updater(prev) : updater;
    if (partial && typeof partial === 'object') {
      desktop.state = { ...prev, ...partial } as typeof desktop.state;
    }
    if (callback) callback();
  }) as typeof desktop.setState;
  desktop.attachIconKeyboardListeners = jest.fn();
  desktop.detachIconKeyboardListeners = jest.fn();
  desktop.persistIconPositions = jest.fn();

  return desktop;
}

describe('Desktop icon placeholder', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    jest.useRealTimers();
  });

  it('updates placeholder coordinates and grid cell while dragging', () => {
    const desktop = createTestDesktop();

    const container = document.createElement('div');
    Object.defineProperty(container, 'getBoundingClientRect', {
      value: () => ({ left: 100, top: 100, width: 96, height: 88, right: 196, bottom: 188, x: 100, y: 100 }),
    });
    container.setPointerCapture = jest.fn();
    container.releasePointerCapture = jest.fn();

    const pointerDownEvent = {
      button: 0,
      pointerId: 1,
      clientX: 140,
      clientY: 160,
      currentTarget: container,
    } as unknown as PointerEvent;
    desktop.handleIconPointerDown(pointerDownEvent, 'app-1');

    const moveEvent = {
      pointerId: 1,
      clientX: 240,
      clientY: 260,
      preventDefault: jest.fn(),
    } as unknown as PointerEvent;
    desktop.handleIconPointerMove(moveEvent);

    const placeholder = desktop.state.iconPlaceholder;
    expect(placeholder).not.toBeNull();
    expect(placeholder?.id).toBe('app-1');
    expect(placeholder?.visible).toBe(true);
    if (!placeholder) return;

    const cell = desktop.getIconGridCellFromPosition(placeholder.x, placeholder.y);
    expect(placeholder.column).toBe(cell.column);
    expect(placeholder.row).toBe(cell.row);
    expect(placeholder.key).toBe(desktop.getIconPositionKey({ x: placeholder.x, y: placeholder.y }));
  });

  it('fades out placeholder when dropping icon', () => {
    jest.useFakeTimers();
    const desktop = createTestDesktop();

    const container = document.createElement('div');
    Object.defineProperty(container, 'getBoundingClientRect', {
      value: () => ({ left: 100, top: 100, width: 96, height: 88, right: 196, bottom: 188, x: 100, y: 100 }),
    });
    container.setPointerCapture = jest.fn();
    container.releasePointerCapture = jest.fn();

    const pointerDownEvent = {
      button: 0,
      pointerId: 2,
      clientX: 140,
      clientY: 160,
      currentTarget: container,
    } as unknown as PointerEvent;
    desktop.handleIconPointerDown(pointerDownEvent, 'app-1');

    desktop.handleIconPointerMove({
      pointerId: 2,
      clientX: 240,
      clientY: 260,
      preventDefault: jest.fn(),
    } as unknown as PointerEvent);

    expect(desktop.state.iconPlaceholder?.visible).toBe(true);

    desktop.handleIconPointerUp({
      pointerId: 2,
      clientX: 240,
      clientY: 260,
      preventDefault: jest.fn(),
      stopPropagation: jest.fn(),
    } as unknown as PointerEvent);

    expect(desktop.state.iconPlaceholder?.visible).toBe(false);

    jest.advanceTimersByTime(200);
    expect(desktop.state.iconPlaceholder).toBeNull();
  });

  it('does not create placeholder when icon reordering disabled', () => {
    const desktop = createTestDesktop();

    const container = document.createElement('div');
    Object.defineProperty(container, 'getBoundingClientRect', {
      value: () => ({ left: 100, top: 100, width: 96, height: 88, right: 196, bottom: 188, x: 100, y: 100 }),
    });
    container.setPointerCapture = jest.fn();
    container.releasePointerCapture = jest.fn();

    const pointerDownEvent = {
      button: 0,
      pointerId: 3,
      clientX: 140,
      clientY: 160,
      currentTarget: container,
    } as unknown as PointerEvent;
    desktop.handleIconPointerDown(pointerDownEvent, 'app-1');

    jest.spyOn(desktop, 'canReorderIcons').mockReturnValue(false);

    desktop.handleIconPointerMove({
      pointerId: 3,
      clientX: 240,
      clientY: 260,
      preventDefault: jest.fn(),
    } as unknown as PointerEvent);

    expect(desktop.state.iconPlaceholder).toBeNull();
  });
});
