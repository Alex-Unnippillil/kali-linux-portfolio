import { act, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import Pinball from '../apps/pinball';
import { __world } from '../tests/helpers/pinball-world-mock';
jest.mock('../apps/pinball/physics', () => require('../tests/helpers/pinball-world-mock'));
jest.mock('../apps/pinball/audio', () => ({ createPinballAudio: () => ({ unlock: jest.fn(), play: jest.fn(), suspend: jest.fn(), destroy: jest.fn(), setMuted: jest.fn() }) }));

class TestPointerEvent extends MouseEvent {
  pointerId: number;
  constructor(type: string, init: PointerEventInit = {}) { super(type, init); this.pointerId = init.pointerId ?? 0; }
}

describe('Pinball input ownership and lifecycle', () => {
  const originalPointer = window.PointerEvent;
  let pending: FrameRequestCallback[];
  beforeAll(() => { window.PointerEvent = TestPointerEvent as typeof PointerEvent; });
  afterAll(() => { window.PointerEvent = originalPointer; });
  beforeEach(() => {
    localStorage.clear(); pending = [];
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => { pending.push(callback); return pending.length; });
    jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());
  it('does not accept keys or run physics while unfocused', () => {
    render(<Pinball windowMeta={{ isFocused: false }} />);
    fireEvent.keyDown(window, { code: 'ArrowLeft' });
    expect(__world().setLeftFlipper).not.toHaveBeenCalled();
    expect(__world().step).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
  });
  it('pauses and releases held inputs on focus loss, with explicit resume', () => {
    const { rerender } = render(<Pinball windowMeta={{ isFocused: true }} />);
    fireEvent.keyDown(window, { code: 'KeyA' });
    expect(screen.getByRole('button', { name: 'Left flipper' })).toHaveAttribute('aria-pressed', 'true');
    rerender(<Pinball windowMeta={{ isFocused: false }} />);
    expect(screen.getByText('Paused.')).toBeInTheDocument();
    expect(__world().resetFlippers).toHaveBeenCalled();
    rerender(<Pinball windowMeta={{ isFocused: true }} />);
    expect(screen.getByTestId('pinball-app')).toHaveAttribute('data-game-active', 'false');
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByTestId('pinball-app')).toHaveAttribute('data-game-active', 'true');
    expect(screen.getByRole('button', { name: 'Left flipper' })).toHaveAttribute('aria-pressed', 'false');
  });
  it('stops stale RAF callbacks after blur and destroys on unmount', () => {
    const { unmount } = render(<Pinball />);
    const callback = pending[pending.length - 1];
    act(() => callback(0));
    const count = __world().step.mock.calls.length;
    fireEvent.blur(window);
    act(() => callback(16));
    expect(__world().step).toHaveBeenCalledTimes(count);
    unmount();
    expect(__world().destroy).toHaveBeenCalledTimes(1);
    expect(window.cancelAnimationFrame).toHaveBeenCalled();
  });
  it('ignores editable, composing and modifier shortcuts', () => {
    render(<Pinball />);
    const input = document.createElement('input'); document.body.append(input);
    fireEvent.keyDown(input, { code: 'ArrowLeft' });
    fireEvent.keyDown(window, { code: 'ArrowLeft', isComposing: true });
    fireEvent.keyDown(window, { code: 'KeyA', ctrlKey: true });
    expect(__world().setLeftFlipper).not.toHaveBeenCalled();
    input.remove();
  });
  it('keeps a flipper held until all independent input sources release', () => {
    render(<Pinball />);
    const left = screen.getByRole('button', { name: 'Left flipper' });
    fireEvent.keyDown(window, { code: 'KeyA' });
    fireEvent.pointerDown(left, { pointerId: 1, button: 0 });
    fireEvent.keyUp(window, { code: 'KeyA' });
    expect(left).toHaveAttribute('aria-pressed', 'true');
    fireEvent.pointerCancel(left, { pointerId: 1 });
    expect(left).toHaveAttribute('aria-pressed', 'false');
  });
  it('handles simultaneous pointers and lost pointer capture', () => {
    render(<Pinball />);
    const left = screen.getByRole('button', { name: 'Left flipper' });
    const right = screen.getByRole('button', { name: 'Right flipper' });
    fireEvent.pointerDown(left, { pointerId: 10, button: 0 });
    fireEvent.pointerDown(right, { pointerId: 20, button: 0 });
    expect(left).toHaveAttribute('aria-pressed', 'true');
    expect(right).toHaveAttribute('aria-pressed', 'true');
    fireEvent.lostPointerCapture(left, { pointerId: 10 });
    expect(left).toHaveAttribute('aria-pressed', 'false');
    expect(right).toHaveAttribute('aria-pressed', 'true');
    fireEvent.pointerUp(right, { pointerId: 20 });
    expect(right).toHaveAttribute('aria-pressed', 'false');
  });
  it('cancels a charged launch on pause instead of releasing it later', () => {
    render(<Pinball />);
    fireEvent.keyDown(window, { code: 'Space' });
    fireEvent.keyDown(window, { code: 'KeyP' });
    fireEvent.keyUp(window, { code: 'Space' });
    expect(__world().launchBall).not.toHaveBeenCalled();
    fireEvent.keyDown(window, { code: 'KeyP' });
    fireEvent.keyDown(window, { code: 'Space' }); fireEvent.keyUp(window, { code: 'Space' });
    expect(__world().launchBall).toHaveBeenCalledTimes(1);
  });
  it('does not steal settings keyboard input and closes the dialog into paused state', () => {
    render(<Pinball />);
    fireEvent.click(screen.getByRole('button', { name: 'Table settings' }));
    const theme = screen.getByRole('combobox', { name: 'Cabinet theme' });
    fireEvent.keyDown(theme, { code: 'Space', key: ' ' });
    fireEvent.keyUp(theme, { code: 'Space', key: ' ' });
    expect(__world().launchBall).not.toHaveBeenCalled();
    fireEvent.keyDown(theme, { code: 'Escape', key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText('Paused.')).toBeInTheDocument();
  });
});
