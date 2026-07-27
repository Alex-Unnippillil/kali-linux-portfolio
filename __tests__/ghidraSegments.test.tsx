import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import Segments, {
  MemorySegment,
} from '@/components/apps/ghidra/Segments';

jest.mock('react-virtualized-auto-sizer', () => ({
  __esModule: true,
  default: ({ children }: { children: (size: { width: number; height: number }) => React.ReactNode }) =>
    children({ width: 800, height: 400 }),
}));

jest.mock('react-window', () => {
  const React = require('react');
  const MockList = React.forwardRef(
    (
      {
        height,
        itemCount,
        itemSize,
        width,
        children,
        outerRef,
        outerElementType = 'div',
      }: {
        height: number;
        itemCount: number;
        itemSize: number;
        width: number;
        children: (props: { index: number; style: React.CSSProperties }) => React.ReactNode;
        outerRef?: React.Ref<HTMLDivElement>;
        outerElementType?: React.ElementType;
      },
      ref
    ) => {
      const visibleCount = Math.min(itemCount, Math.max(Math.floor(height / itemSize), 1));
      const items = Array.from({ length: visibleCount }, (_, index) =>
        children({
          index,
          style: {
            position: 'absolute',
            top: index * itemSize,
            height: itemSize,
            width: '100%',
          },
        })
      );
      React.useImperativeHandle(ref, () => ({
        scrollToItem: () => {},
      }));
      const Outer = outerElementType;
      return React.createElement(
        Outer,
        {
          ref: outerRef,
          style: {
            position: 'relative',
            height,
            width,
            overflow: 'auto',
          },
        },
        items
      );
    }
  );
  MockList.displayName = 'MockFixedSizeList';
  return { FixedSizeList: MockList };
});

describe('Segments component', () => {
  const createSegment = (index: number, extras: Partial<MemorySegment> = {}): MemorySegment => {
    const start = 0x1000 * (index + 1);
    const size = 0x300;
    return {
      id: `segment-${index}`,
      name: `.seg${index}`,
      start,
      end: start + size,
      size,
      permissions: index % 3 === 0 ? ['r', 'x'] : ['r', 'w'],
      type: index % 2 === 0 ? 'CODE' : 'DATA',
      symbols: [],
      ...extras,
    };
  };

  it('virtualizes large segment lists to avoid rendering every row', () => {
    const largeList: MemorySegment[] = Array.from({ length: 200 }, (_, i) => createSegment(i));

    render(
      <div style={{ height: 400 }}>
        <Segments segments={largeList} selectedSegmentId={largeList[0].id} onSelectSegment={jest.fn()} />
      </div>
    );

    const renderedRows = screen.getAllByTestId(/segment-row-/);
    expect(renderedRows.length).toBeLessThan(largeList.length);
  });

  it('keeps selection synchronized and scrolls newly selected segments into view', async () => {
    const segments: MemorySegment[] = [
      createSegment(0, { permissions: ['r', 'x'], symbols: ['start'] }),
      createSegment(1, { permissions: ['r', 'w'], symbols: ['check'] }),
      createSegment(2, { permissions: ['r'], symbols: [] }),
    ];
    const onSelect = jest.fn();

    const { rerender } = render(
      <div style={{ height: 400 }}>
        <Segments segments={segments} selectedSegmentId={segments[0].id} onSelectSegment={onSelect} />
      </div>
    );

    const outer = screen.getByTestId('segments-virtualized-list') as HTMLDivElement;
    const scrollTo = jest.fn();
    outer.scrollTo = scrollTo;

    rerender(
      <div style={{ height: 400 }}>
        <Segments segments={segments} selectedSegmentId={segments[1].id} onSelectSegment={onSelect} />
      </div>
    );

    await waitFor(() => expect(scrollTo).toHaveBeenCalled());
    const selectedRow = screen.getByTestId(`segment-row-${segments[1].id}`);
    expect(selectedRow).toHaveAttribute('aria-selected', 'true');

    fireEvent.click(selectedRow);
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: segments[1].id }));
  });
});
