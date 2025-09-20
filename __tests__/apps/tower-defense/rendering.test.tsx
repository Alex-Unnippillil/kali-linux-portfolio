import { act, fireEvent, render } from '@testing-library/react';
import TowerDefense from '../../../apps/tower-defense';
import type { Projectile } from '../../../apps/games/tower-defense';
import * as offscreen from '../../../apps/tower-defense/render/offscreen';

jest.mock('../../../apps/tower-defense/render/offscreen', () => {
  const actual = jest.requireActual(
    '../../../apps/tower-defense/render/offscreen',
  );
  return {
    __esModule: true,
    ...actual,
    getProjectileRenderer: jest.fn(),
    resetProjectileRenderer: jest.fn(() => actual.resetProjectileRenderer()),
  };
});

const offscreenActual = jest.requireActual<
  typeof import('../../../apps/tower-defense/render/offscreen')
>('../../../apps/tower-defense/render/offscreen');

type ActualProjectileRenderer = ReturnType<
  typeof offscreenActual.getProjectileRenderer
>;
type DrawParams = Parameters<ActualProjectileRenderer['draw']>;
const getProjectileRendererMock =
  offscreen.getProjectileRenderer as jest.MockedFunction<
    typeof offscreenActual.getProjectileRenderer
  >;

const CANVAS_SIZE = 400;
const CELL_SIZE = 40;

const createContextMock = (canvas: HTMLCanvasElement) => {
  const gradient = { addColorStop: jest.fn() };
  return {
    canvas,
    clearRect: jest.fn(),
    drawImage: jest.fn(),
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    stroke: jest.fn(),
    fillRect: jest.fn(),
    strokeRect: jest.fn(),
    arc: jest.fn(),
    fill: jest.fn(),
    fillText: jest.fn(),
    save: jest.fn(),
    restore: jest.fn(),
    createRadialGradient: jest.fn(() => gradient),
    createLinearGradient: jest.fn(() => gradient),
  };
};

type ContextMock = ReturnType<typeof createContextMock>;

const advanceFrames = (ms: number) => {
  act(() => {
    jest.advanceTimersByTime(ms);
  });
};

describe('tower defense rendering layers', () => {
  let contextMap: WeakMap<HTMLCanvasElement, ContextMock>;
  let createdCanvases: HTMLCanvasElement[] = [];
  let originalCreateElement: typeof document.createElement;
  let originalRAF: typeof requestAnimationFrame | undefined;
  let originalCAF: typeof cancelAnimationFrame | undefined;
  type MockedProjectileRenderer = jest.Mocked<ActualProjectileRenderer> & {
    hasContent: boolean;
  };
  let mockRenderer: MockedProjectileRenderer;
  let mockCanvas: HTMLCanvasElement;

  beforeEach(() => {
    jest.useFakeTimers();
    contextMap = new WeakMap();
    let now = 0;
    jest.spyOn(performance, 'now').mockImplementation(() => now);
    originalRAF = global.requestAnimationFrame;
    originalCAF = global.cancelAnimationFrame;
    global.requestAnimationFrame = ((cb: FrameRequestCallback) => {
      const id = setTimeout(() => {
        now += 16;
        cb(now);
      }, 16);
      return id as unknown as number;
    }) as typeof requestAnimationFrame;
    global.cancelAnimationFrame = ((id: number) => {
      clearTimeout(id);
    }) as typeof cancelAnimationFrame;

    createdCanvases = [];

    jest
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockImplementation(function getContext(this: HTMLCanvasElement) {
        if (!contextMap.has(this)) {
          contextMap.set(this, createContextMock(this));
        }
        return contextMap.get(this) as unknown as CanvasRenderingContext2D;
      });

    originalCreateElement = document.createElement.bind(document);
    jest.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      const element = originalCreateElement(tagName);
      if (tagName.toLowerCase() === 'canvas') {
        createdCanvases.push(element as HTMLCanvasElement);
      }
      return element;
    });

    mockCanvas = document.createElement('canvas');
    mockCanvas.dataset.layer = 'tower-defense-projectiles';
    mockRenderer = {
      hasContent: false,
      draw: jest.fn(
        (projectiles: DrawParams[0], _cellSize: DrawParams[1]) => {
          mockRenderer.hasContent = projectiles.some((p) => p.active);
        },
      ),
      blit: jest.fn((ctx: CanvasRenderingContext2D) => {
        if (!mockRenderer.hasContent) return;
        ctx.drawImage(mockCanvas, 0, 0);
      }),
      resize: jest.fn(),
      getCanvas: jest.fn(() => mockCanvas),
    } as MockedProjectileRenderer;
    getProjectileRendererMock.mockReturnValue(
      mockRenderer as unknown as ActualProjectileRenderer,
    );
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.clearAllTimers();
    jest.useRealTimers();
    getProjectileRendererMock.mockReset();
    offscreenActual.resetProjectileRenderer();
    jest.restoreAllMocks();
    if (originalRAF) {
      global.requestAnimationFrame = originalRAF;
    }
    if (originalCAF) {
      global.cancelAnimationFrame = originalCAF;
    }
  });

  const setupTowerDefense = () => {
    const utils = render(<TowerDefense />);
    const canvas = utils.container.querySelector('canvas');
    if (!canvas) {
      throw new Error('no canvas rendered');
    }
    Object.assign(canvas, {
      getBoundingClientRect: () => ({
        left: 0,
        top: 0,
        right: CANVAS_SIZE,
        bottom: CANVAS_SIZE,
        width: CANVAS_SIZE,
        height: CANVAS_SIZE,
        x: 0,
        y: 0,
      }),
    });
    advanceFrames(32);
    const clickCell = (clientX: number, clientY: number) => {
      act(() => {
        fireEvent.click(canvas, { clientX, clientY });
      });
      advanceFrames(64);
    };
    return { ...utils, canvas: canvas as HTMLCanvasElement, clickCell };
  };

  const prepareBattlefield = () => {
    const utils = setupTowerDefense();
    utils.clickCell(20, 200);
    utils.clickCell(380, 200);
    act(() => {
      fireEvent.click(utils.getByText('Finish Editing'));
    });
    advanceFrames(64);
    utils.clickCell(160, 160);
    return utils;
  };

  const getContextFor = (canvas: HTMLCanvasElement) => {
    const ctx = contextMap.get(canvas);
    if (!ctx) throw new Error('missing context');
    return ctx;
  };

  test('projectiles render through offscreen buffer', () => {
    const utils = prepareBattlefield();
    act(() => {
      fireEvent.click(utils.getByText('Start'));
    });
    advanceFrames(4000);
    advanceFrames(4000);

    expect(mockRenderer.draw).toHaveBeenCalled();

    const mainCtx = getContextFor(utils.canvas);
    const blitsMainCanvas = mockRenderer.blit.mock.calls.some(
      ([ctx]) => ctx === mainCtx,
    );
    expect(blitsMainCanvas).toBe(true);
  });

  test('background redraw stays throttled after initial changes', () => {
    prepareBattlefield();
    const backgroundCanvas = createdCanvases.find(
      (c) => c.dataset.layer === 'tower-defense-background',
    );
    expect(backgroundCanvas).toBeDefined();
    const backgroundCtx = getContextFor(backgroundCanvas!);

    // Allow initial redraws to occur
    advanceFrames(500);
    const clearsAfterSetup = backgroundCtx.clearRect.mock.calls.length;

    // Run many frames without altering the layout and ensure no extra clears
    advanceFrames(4000);
    expect(backgroundCtx.clearRect.mock.calls.length).toBe(clearsAfterSetup);
  });
});

describe('projectile renderer utility', () => {
  let contextMap: WeakMap<HTMLCanvasElement, ContextMock>;

  beforeEach(() => {
    contextMap = new WeakMap();
    jest
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockImplementation(function getContext(this: HTMLCanvasElement) {
        if (!contextMap.has(this)) {
          contextMap.set(this, createContextMock(this));
        }
        return contextMap.get(this) as unknown as CanvasRenderingContext2D;
      });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    offscreenActual.resetProjectileRenderer();
  });

  test('offscreen canvas is tagged for debugging', () => {
    const renderer = offscreenActual.getProjectileRenderer(CANVAS_SIZE, CANVAS_SIZE);
    const canvas = renderer.getCanvas() as HTMLCanvasElement | null;
    expect(canvas?.dataset.layer).toBe('tower-defense-projectiles');
  });

  test('blits only when projectiles are active', () => {
    const renderer = offscreenActual.getProjectileRenderer(CANVAS_SIZE, CANVAS_SIZE);
    const mainCtx = createContextMock(document.createElement('canvas'));

    renderer.draw([], CELL_SIZE);
    renderer.blit(mainCtx as unknown as CanvasRenderingContext2D);
    expect(mainCtx.drawImage).not.toHaveBeenCalled();

    const projectile: Projectile = {
      active: true,
      x: 10,
      y: 12,
      targetId: 1,
      damage: 5,
      speed: 1,
    };

    renderer.draw([projectile], CELL_SIZE);
    renderer.blit(mainCtx as unknown as CanvasRenderingContext2D);
    expect(mainCtx.drawImage).toHaveBeenCalled();
  });
});
