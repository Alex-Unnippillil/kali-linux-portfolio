import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react';
import ChessGame from '../components/apps/chess';
import { setTheme } from '../utils/theme';

describe('Chess theme switching', () => {
  beforeAll(() => {
    const audioContextMock = jest.fn().mockImplementation(() => ({
      createOscillator: () => ({
        frequency: { value: 0 },
        connect: jest.fn(),
        start: jest.fn(),
        stop: jest.fn(),
      }),
      destination: {},
      currentTime: 0,
    }));
    Object.defineProperty(window, 'AudioContext', {
      writable: true,
      value: audioContextMock,
    });
    Object.defineProperty(window, 'webkitAudioContext', {
      writable: true,
      value: audioContextMock,
    });
    if (!window.requestAnimationFrame) {
      window.requestAnimationFrame = ((cb: FrameRequestCallback) =>
        window.setTimeout(() => cb(Date.now()), 16)) as unknown as typeof window.requestAnimationFrame;
    }
    if (!window.cancelAnimationFrame) {
      window.cancelAnimationFrame = ((id: number) => window.clearTimeout(id)) as unknown as typeof window.cancelAnimationFrame;
    }
  });

  beforeEach(() => {
    document.documentElement.dataset.theme = 'default';
    document.documentElement.classList.remove('dark');
  });

  test('theme swap mid-game keeps board dimensions stable', async () => {
    const { getByLabelText } = render(<ChessGame />);
    const canvas = getByLabelText('Chess board') as HTMLCanvasElement;

    Object.defineProperty(canvas, 'getBoundingClientRect', {
      value: () => ({
        left: 0,
        top: 0,
        right: 512,
        bottom: 512,
        width: 512,
        height: 512,
      }),
      configurable: true,
    });

    const squareSize = 512 / 8;
    const clickSquare = (file: number, rank: number) => {
      const clientX = file * squareSize + squareSize / 2;
      const clientY = (7 - rank) * squareSize + squareSize / 2;
      fireEvent.click(canvas, { clientX, clientY });
    };

    clickSquare(4, 1);
    clickSquare(4, 3);

    const beforeWidth = canvas.style.width;
    const beforeHeight = canvas.style.height;
    expect(beforeWidth).not.toBe('');

    await act(async () => {
      setTheme('dark');
    });

    await waitFor(() => {
      expect(canvas.style.width).toBe(beforeWidth);
      expect(canvas.style.height).toBe(beforeHeight);
    });
  });
});
