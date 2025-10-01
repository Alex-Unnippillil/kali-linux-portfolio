import React from 'react';
import { render, screen, within, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
jest.mock('../hooks/usePrefersReducedMotion', () => ({
  __esModule: true,
  default: () => true,
}));

import Waterfall from '../components/apps/firefox/Waterfall';

describe('Firefox Waterfall simulation', () => {
  beforeAll(() => {
    class ResizeObserverMock {
      callback: ResizeObserverCallback;
      constructor(callback: ResizeObserverCallback) {
        this.callback = callback;
      }
      observe() {
        this.callback([{ contentRect: { width: 900, height: 320 } }] as ResizeObserverEntry[], this as any);
      }
      disconnect() {}
      unobserve() {}
    }
    // @ts-expect-error test environment mock
    global.ResizeObserver = ResizeObserverMock;
  });

  it('renders timing summary and axis ticks by default', async () => {
    render(<Waterfall />);
    expect(screen.getByRole('combobox', { name: /detail level/i })).toBeInTheDocument();
    const table = screen.getByRole('table', { name: /request timing breakdown/i });
    expect(within(table).getAllByRole('row').length).toBeGreaterThan(1);
    const ticks = await screen.findAllByTestId('waterfall-tick');
    expect(ticks.length).toBeGreaterThan(2);
  });

  it('allows increasing the detail level to reveal more requests', async () => {
    const user = userEvent.setup();
    render(<Waterfall />);
    const select = screen.getByRole('combobox', { name: /detail level/i });
    const table = screen.getByRole('table', { name: /request timing breakdown/i });
    const initialRows = within(table).getAllByRole('row').length;
    await user.selectOptions(select, 'Deep dive lab');
    await waitFor(() => {
      const rows = within(table).getAllByRole('row').length;
      expect(rows).toBeGreaterThan(initialRows);
    });
  });

  it('updates the view snapshot when zooming and dragging', async () => {
    render(<Waterfall />);
    await screen.findAllByTestId('waterfall-tick');
    const surface = await screen.findByTestId('waterfall-surface');
    Object.defineProperty(surface, 'getBoundingClientRect', {
      value: () => ({
        width: 900,
        height: 400,
        left: 0,
        top: 0,
        right: 900,
        bottom: 400,
        x: 0,
        y: 0,
        toJSON: () => {},
      }),
    });
    const zoomBefore = surface.getAttribute('data-zoom');
    const offsetBefore = surface.getAttribute('data-view-offset');
    fireEvent.wheel(surface, { deltaY: 240, ctrlKey: true, clientX: 450, clientY: 200 });
    await waitFor(() => {
      const zoomAfter = surface.getAttribute('data-zoom');
      expect(zoomAfter).not.toEqual(zoomBefore);
    });
    fireEvent.pointerDown(surface, { clientX: 500, clientY: 160, pointerId: 1, pointerType: 'mouse' });
    fireEvent.pointerMove(surface, { clientX: 300, clientY: 160, pointerId: 1, pointerType: 'mouse' });
    fireEvent.pointerUp(surface, { clientX: 300, clientY: 160, pointerId: 1, pointerType: 'mouse' });
    await waitFor(() => {
      const offsetAfter = surface.getAttribute('data-view-offset');
      expect(offsetAfter).not.toEqual(offsetBefore);
    });
  });
});
