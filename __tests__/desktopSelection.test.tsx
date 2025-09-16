import React from 'react';
import { act, fireEvent, render } from '@testing-library/react';
import DesktopSelection from '../components/DesktopSelection';

type RectConfig = {
  left: number;
  top: number;
  width: number;
  height: number;
};

function mockBoundingClientRect(element: HTMLElement, config: RectConfig) {
  Object.defineProperty(element, 'getBoundingClientRect', {
    value: () =>
      ({
        x: config.left,
        y: config.top,
        left: config.left,
        top: config.top,
        right: config.left + config.width,
        bottom: config.top + config.height,
        width: config.width,
        height: config.height,
        toJSON: () => ({}),
      } as DOMRect),
  });
}

describe('DesktopSelection marquee behavior', () => {
  test('dragging selects multiple icons and clears on mouseup', async () => {
    const { getByTestId } = render(
      <main
        id="desktop"
        style={{ position: 'relative', width: '400px', height: '400px' }}
      >
        <div
          data-testid="icon-a"
          data-context="app"
          style={{ position: 'absolute', left: '20px', top: '20px' }}
        />
        <div
          data-testid="icon-b"
          data-context="app"
          style={{ position: 'absolute', left: '120px', top: '20px' }}
        />
        <div
          data-testid="icon-c"
          data-context="app"
          style={{ position: 'absolute', left: '220px', top: '20px' }}
        />
        <DesktopSelection />
      </main>
    );

    await act(async () => {});

    const desktop = document.getElementById('desktop');
    if (!desktop) {
      throw new Error('Desktop root not found');
    }

    mockBoundingClientRect(desktop, {
      left: 0,
      top: 0,
      width: 400,
      height: 400,
    });

    const iconA = getByTestId('icon-a');
    const iconB = getByTestId('icon-b');
    const iconC = getByTestId('icon-c');

    mockBoundingClientRect(iconA, {
      left: 20,
      top: 20,
      width: 50,
      height: 50,
    });

    mockBoundingClientRect(iconB, {
      left: 120,
      top: 20,
      width: 50,
      height: 50,
    });

    mockBoundingClientRect(iconC, {
      left: 220,
      top: 20,
      width: 50,
      height: 50,
    });

    fireEvent.mouseDown(desktop, { button: 0, clientX: 10, clientY: 10 });
    fireEvent.mouseMove(document, { clientX: 190, clientY: 100 });

    expect(iconA).toHaveAttribute('data-selected', '1');
    expect(iconB).toHaveAttribute('data-selected', '1');
    expect(iconC).not.toHaveAttribute('data-selected');

    fireEvent.mouseUp(document);

    expect(iconA).not.toHaveAttribute('data-selected');
    expect(iconB).not.toHaveAttribute('data-selected');
    expect(iconC).not.toHaveAttribute('data-selected');
  });
});
