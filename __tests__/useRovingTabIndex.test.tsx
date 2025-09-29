import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import useRovingTabIndex from '../hooks/useRovingTabIndex';

function TestList({
  count = 5,
  orientation = 'horizontal',
  columns = 1,
  isItemDisabled,
}: {
  count?: number;
  orientation?: 'horizontal' | 'vertical' | 'grid';
  columns?: number;
  isItemDisabled?: (index: number) => boolean;
}) {
  const itemRefs = React.useRef<(HTMLButtonElement | null)[]>([]);

  React.useEffect(() => {
    itemRefs.current = itemRefs.current.slice(0, count);
  }, [count]);

  const { getItemProps, onKeyDown } = useRovingTabIndex({
    itemCount: count,
    orientation,
    columns,
    isItemDisabled,
    onActiveChange: (index) => {
      const node = itemRefs.current[index];
      node?.focus();
    },
  });

  return (
    <div role="application" onKeyDown={onKeyDown}>
      {Array.from({ length: count }).map((_, index) => (
        <button
          key={index}
          type="button"
          ref={(el) => {
            itemRefs.current[index] = el;
          }}
          {...getItemProps(index)}
        >
          Item {index + 1}
        </button>
      ))}
    </div>
  );
}

describe('useRovingTabIndex', () => {
  it('moves focus horizontally and wraps around', async () => {
    render(<TestList />);
    const user = userEvent.setup();
    const buttons = screen.getAllByRole('button');

    await user.tab();
    await user.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(buttons[1]);

    await user.keyboard('{ArrowLeft}');
    expect(document.activeElement).toBe(buttons[0]);

    await user.keyboard('{ArrowLeft}');
    expect(document.activeElement).toBe(buttons[buttons.length - 1]);
  });

  it('supports grid navigation using column offsets', async () => {
    render(<TestList orientation="grid" columns={3} count={6} />);
    const user = userEvent.setup();
    const buttons = screen.getAllByRole('button');

    await user.tab();
    await user.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(buttons[3]);

    await user.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(buttons[4]);

    await user.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(buttons[1]);
  });

  it('jumps to first and last items with Home and End keys', async () => {
    render(<TestList orientation="vertical" count={4} />);
    const user = userEvent.setup();
    const buttons = screen.getAllByRole('button');

    await user.tab();
    await user.click(buttons[1]);
    await user.keyboard('{End}');
    expect(document.activeElement).toBe(buttons[3]);

    await user.keyboard('{Home}');
    expect(document.activeElement).toBe(buttons[0]);
  });

  it('skips disabled items when navigating', async () => {
    render(
      <TestList
        count={4}
        isItemDisabled={(index) => index === 1}
      />
    );
    const user = userEvent.setup();
    const buttons = screen.getAllByRole('button');

    await user.tab();
    await user.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(buttons[2]);
  });
});

