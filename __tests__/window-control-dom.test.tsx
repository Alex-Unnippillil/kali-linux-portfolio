import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { WindowEditButtons } from '../components/base/window';

// A pressed-state render must not replace the element that received pointerdown:
// browsers dispatch the subsequent native click against that same DOM target.
describe.each(['mouse', 'touch', 'pen'])('window control DOM stability with %s', (pointerType) => {
  test.each([
    ['Window minimize', false],
    ['Window maximize', false],
    ['Restore window size', true],
    ['Window close', false],
  ] as const)('%s preserves the native click target', (name, isMaximised) => {
    const action = jest.fn();
    render(
      <WindowEditButtons
        id="stable"
        isMaximised={isMaximised}
        minimize={action}
        maximize={action}
        close={action}
      />,
    );
    const button = screen.getByRole('button', { name, exact: true });
    const icon = button.querySelector('svg')!;
    const shape = icon.firstElementChild!;
    const pointer = { pointerId: 1, pointerType, button: 0, isPrimary: true };
    fireEvent.pointerDown(shape, pointer);
    expect(button.querySelector('svg')).toBe(icon);
    expect(shape.isConnected).toBe(true);
    expect(action).not.toHaveBeenCalled();
    fireEvent.pointerUp(shape, pointer);
    expect(button.querySelector('svg')).toBe(icon);
    expect(shape.isConnected).toBe(true);
    fireEvent.click(shape);
    expect(action).toHaveBeenCalledTimes(1);
  });
});
