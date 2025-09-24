import React from 'react';
import { render, act, cleanup } from '@testing-library/react';

jest.mock('canvas-confetti', () => jest.fn());

const saveSlotMock = jest.fn();
const loadSlotMock = jest.fn();

jest.mock('../components/apps/Games/common/save', () => ({
  __esModule: true,
  default: () => ({
    saveSlot: saveSlotMock,
    loadSlot: loadSlotMock,
    deleteSlot: jest.fn(),
    listSlots: jest.fn(),
    exportSaves: jest.fn(),
    importSaves: jest.fn(),
  }),
}));

jest.mock('../components/apps/Games/common/input-remap/InputRemap', () => () => null);

const defaultMapping = {
  left: 'ArrowLeft',
  right: 'ArrowRight',
  down: 'ArrowDown',
  rotate: 'ArrowUp',
  drop: 'Space',
  hold: 'Shift',
  pause: 'p',
  reset: 'r',
  sound: 'm',
  settings: 's',
};

jest.mock('../components/apps/Games/common/input-remap/useInputMapping', () => ({
  __esModule: true,
  default: () => [defaultMapping, jest.fn()],
}));

describe('Tetris autosave integration', () => {
  let originalRAF: typeof window.requestAnimationFrame;
  let originalCancel: typeof window.cancelAnimationFrame;
  let visibility: DocumentVisibilityState;

  beforeAll(() => {
    visibility = 'visible';
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => visibility,
    });

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(() => ({
        matches: false,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      })),
    });

    class MockAudioContext {
      destination = {};
      currentTime = 0;
      createOscillator() {
        return {
          type: 'sine',
          frequency: { value: 0 },
          connect: jest.fn(),
          start: jest.fn(),
          stop: jest.fn(),
        };
      }
      close() {
        return Promise.resolve();
      }
    }

    Object.defineProperty(window, 'AudioContext', {
      writable: true,
      value: MockAudioContext,
    });
    Object.defineProperty(window, 'webkitAudioContext', {
      writable: true,
      value: MockAudioContext,
    });

    Object.defineProperty(window, 'IntersectionObserver', {
      writable: true,
      value: class {
        observe() {}
        disconnect() {}
      },
    });

    HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
      fillRect: jest.fn(),
      strokeRect: jest.fn(),
      fillStyle: '#000',
      strokeStyle: '#000',
      globalAlpha: 1,
      clearRect: jest.fn(),
    }));
  });

  beforeEach(() => {
    jest.useFakeTimers();
    saveSlotMock.mockReset();
    loadSlotMock.mockReset();
    loadSlotMock.mockResolvedValue(undefined);
    originalRAF = window.requestAnimationFrame;
    originalCancel = window.cancelAnimationFrame;
    window.requestAnimationFrame = jest.fn(() => 1);
    window.cancelAnimationFrame = jest.fn();
  });

  afterEach(() => {
    cleanup();
    jest.useRealTimers();
    window.requestAnimationFrame = originalRAF;
    window.cancelAnimationFrame = originalCancel;
  });

  it('captures a snapshot on the autosave interval', async () => {
    const { default: Tetris } = await import('../components/apps/tetris');
    render(<Tetris />);

    await act(async () => {
      jest.advanceTimersByTime(10000);
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(saveSlotMock).toHaveBeenCalled();
    const call = saveSlotMock.mock.calls[0][0];
    expect(call.name).toBe('autosave');
    expect(call.data.board).toHaveLength(20);
    call.data.board.forEach((row: number[]) => {
      expect(row).toHaveLength(10);
    });
    expect(call.data.next).toHaveLength(3);
    expect(call.data.generator).toMatchObject({ mode: 'seven-bag' });
  });

  it('hydrates from an autosave snapshot when available', async () => {
    const snapshot = {
      board: Array.from({ length: 20 }, () => Array(10).fill('T')),
      piece: { type: 'L', color: '#fff', rotation: 0, shape: [[1]] },
      pos: { x: 3, y: 4 },
      next: [
        { type: 'I', color: '#fff', rotation: 0, shape: [[1]] },
        { type: 'O', color: '#fff', rotation: 0, shape: [[1]] },
        { type: 'S', color: '#fff', rotation: 0, shape: [[1]] },
      ],
      hold: { type: 'Z', color: '#fff', rotation: 0, shape: [[1]] },
      canHold: false,
      score: 42,
      level: 3,
      lines: 12,
      mode: 'sprint',
      useBag: false,
      sprintElapsed: 5000,
      generator: { mode: 'true-random', bag: ['T', 'J'] },
    };
    loadSlotMock.mockResolvedValueOnce(snapshot);
    const { default: Tetris } = await import('../components/apps/tetris');
    render(<Tetris />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(loadSlotMock).toHaveBeenCalledWith('autosave');
    await act(async () => {
      jest.advanceTimersByTime(10000);
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(saveSlotMock).toHaveBeenCalled();
    const latest = saveSlotMock.mock.calls[0][0];
    expect(latest.data.mode).toBe('sprint');
    expect(latest.data.useBag).toBe(false);
    expect(latest.data.score).toBe(42);
    expect(latest.data.level).toBe(3);
  });
});
