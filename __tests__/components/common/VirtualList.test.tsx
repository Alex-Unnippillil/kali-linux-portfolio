import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import VirtualList from '../../../components/common/VirtualList';

type Item = {
  id: number;
  label: string;
};

const items: Item[] = Array.from({ length: 10000 }, (_, index) => ({
  id: index,
  label: `Item ${index + 1}`,
}));

let originalResizeObserver: typeof ResizeObserver | undefined;
let originalRequestAnimationFrame: typeof requestAnimationFrame | undefined;
let originalCancelAnimationFrame: typeof cancelAnimationFrame | undefined;
let boundingClientSpy: jest.SpyInstance<DOMRect, []>;

beforeAll(() => {
  originalResizeObserver = global.ResizeObserver;
  originalRequestAnimationFrame = global.requestAnimationFrame;
  originalCancelAnimationFrame = global.cancelAnimationFrame;

  class ResizeObserverMock {
    callback: ResizeObserverCallback;

    constructor(callback: ResizeObserverCallback) {
      this.callback = callback;
    }

    observe(): void {}

    unobserve(): void {}

    disconnect(): void {}
  }

  (global as unknown as { ResizeObserver: typeof ResizeObserver }).ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;

  global.requestAnimationFrame = (callback: FrameRequestCallback): number => {
    callback(performance.now());
    return 0;
  };

  global.cancelAnimationFrame = () => {};
});

beforeEach(() => {
  boundingClientSpy = jest
    .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
    .mockImplementation(() => ({
      width: 240,
      height: 32,
      top: 0,
      left: 0,
      bottom: 32,
      right: 240,
      x: 0,
      y: 0,
      toJSON() {
        return {};
      },
    } as DOMRect));
});

afterEach(() => {
  boundingClientSpy.mockRestore();
});

afterAll(() => {
  if (originalResizeObserver) {
    (global as unknown as { ResizeObserver: typeof ResizeObserver }).ResizeObserver = originalResizeObserver;
  } else {
    delete (global as unknown as { ResizeObserver?: typeof ResizeObserver }).ResizeObserver;
  }

  if (originalRequestAnimationFrame) {
    global.requestAnimationFrame = originalRequestAnimationFrame;
  } else {
    delete (global as unknown as { requestAnimationFrame?: typeof requestAnimationFrame }).requestAnimationFrame;
  }

  if (originalCancelAnimationFrame) {
    global.cancelAnimationFrame = originalCancelAnimationFrame;
  } else {
    delete (global as unknown as { cancelAnimationFrame?: typeof cancelAnimationFrame }).cancelAnimationFrame;
  }
});

const renderList = (extraProps: Partial<React.ComponentProps<typeof VirtualList<Item>>> = {}) =>
  render(
    <VirtualList<Item>
      data={items}
      itemHeight={32}
      itemKey="id"
      height={400}
      component="ul"
      className="list-none p-0"
      {...extraProps}
    >
      {(item) => (
        <li key={item.id} className="py-2 px-3">
          {item.label}
        </li>
      )}
    </VirtualList>
  );

describe('VirtualList', () => {
  it('renders only the windowed subset for large datasets', () => {
    renderList();

    const rendered = document.querySelectorAll('[data-virtual-list-index]');
    expect(rendered.length).toBeGreaterThan(0);
    expect(rendered.length).toBeLessThan(80);
  });

  it('supports PageDown keyboard navigation and focus management', async () => {
    const { container } = renderList();

    const firstItem = screen.getAllByRole('listitem')[0] as HTMLElement;
    await act(async () => {
      firstItem.focus();
    });

    const scrollContainer = container.querySelector('[role="presentation"]') as HTMLElement;

    await act(async () => {
      fireEvent.keyDown(scrollContainer, { key: 'PageDown' });
    });

    await waitFor(() => {
      expect(document.activeElement?.textContent).toContain('Item 13');
    });
  });

  it('exposes sticky overlay content when scrolling past the sticky index', () => {
    const { container } = renderList({
      stickyIndices: [0],
      renderStickyItem: (item) => <li>{`Pinned ${item.label}`}</li>,
    });

    const scrollContainer = container.querySelector('[role="presentation"]') as HTMLElement;
    act(() => {
      scrollContainer.scrollTop = 1200;
      scrollContainer.dispatchEvent(new Event('scroll'));
    });

    const sticky = container.querySelector('[data-virtual-sticky="true"]');
    expect(sticky).not.toBeNull();
    expect(sticky?.textContent).toContain('Pinned Item 1');
  });
});

