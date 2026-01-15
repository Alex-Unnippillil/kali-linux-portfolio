import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

import { WindowEditButtons, WindowTopBar } from '../components/base/window';

describe('WindowEditButtons hit targets', () => {
  const noop = () => {};

  it('applies larger Tailwind-driven hit areas for window controls', () => {
    render(
      <WindowEditButtons
        minimize={noop}
        maximize={noop}
        close={noop}
        id="demo"
        allowMaximize
      />
    );

    const minimizeButton = screen.getByRole('button', { name: /window minimize/i });

    expect(minimizeButton.className).toContain('h-10');
    expect(minimizeButton.className).toContain('w-10');
  });

  it('prevents enlarged control hit areas from triggering drag gestures', () => {
    const handlePointerDown = jest.fn();
    render(
      <WindowTopBar
        title="Demo"
        onKeyDown={noop}
        onBlur={noop}
        grabbed={false}
        onPointerDown={handlePointerDown}
        onDoubleClick={noop}
        controls={
          <WindowEditButtons
            minimize={noop}
            maximize={noop}
            close={noop}
            id="demo"
            allowMaximize
          />
        }
      />
    );

    const minimizeButton = screen.getByRole('button', { name: /window minimize/i });
    fireEvent.pointerDown(minimizeButton);

    expect(handlePointerDown).not.toHaveBeenCalled();
  });
});
