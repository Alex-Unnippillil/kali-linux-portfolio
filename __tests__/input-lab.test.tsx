import React from 'react';
import {
  act,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';

import InputLab from '../apps/input-lab';

describe('Input Lab device coverage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('shows fallback message when the Gamepad API is unavailable', async () => {
    render(<InputLab />);
    expect(
      await screen.findByText('Gamepad API not supported in this browser.'),
    ).toBeInTheDocument();
  });

  it('updates keyboard telemetry on keydown', async () => {
    render(<InputLab />);

    await screen.findByText('Keyboard ready. Press keys to see updates.');

    act(() => {
      fireEvent.keyDown(window, { key: 'a', code: 'KeyA' });
    });

    expect(
      await screen.findByText(/Key: a \(KeyA\) • modifiers: none/i),
    ).toBeInTheDocument();
  });

  it('records mouse movement when pointer events fire', async () => {
    render(<InputLab />);

    await screen.findByText('Move the mouse or click to capture pointer data.');

    act(() => {
      fireEvent.mouseMove(window, { clientX: 12, clientY: 34 });
    });

    expect(await screen.findByText('Mouse activity detected.')).toBeInTheDocument();
    expect(
      await screen.findByText('mousemove at (12, 34)'),
    ).toBeInTheDocument();
  });

  it('samples connected gamepads for live updates', async () => {
    jest.useFakeTimers();
    const originalGetGamepads = (navigator as any).getGamepads;

    const mockButtons: GamepadButton[] = [
      { pressed: false, touched: false, value: 0 },
      { pressed: true, touched: true, value: 1 },
    ];

    const mockGamepad = {
      id: 'Test Pad',
      index: 0,
      connected: true,
      mapping: 'standard',
      timestamp: Date.now(),
      axes: [0.5, -0.5],
      buttons: mockButtons,
    } as unknown as Gamepad;

    Object.defineProperty(navigator, 'getGamepads', {
      configurable: true,
      value: jest.fn(() => [mockGamepad, null, null, null]),
    });

    try {
      render(<InputLab />);

      const connectedEvent = new Event('gamepadconnected') as GamepadEvent;
      (connectedEvent as any).gamepad = mockGamepad;

      act(() => {
        window.dispatchEvent(connectedEvent);
      });

      act(() => {
        jest.advanceTimersByTime(600);
      });

      expect(await screen.findByText('Connected: Test Pad')).toBeInTheDocument();
      expect(
        await screen.findByText('Buttons pressed: 1'),
      ).toBeInTheDocument();
    } finally {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
      if (originalGetGamepads) {
        Object.defineProperty(navigator, 'getGamepads', {
          configurable: true,
          value: originalGetGamepads,
        });
      } else {
        delete (navigator as any).getGamepads;
      }
    }
  });
});
