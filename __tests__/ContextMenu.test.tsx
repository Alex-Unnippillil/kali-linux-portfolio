import React, { useMemo, useRef } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ContextMenu from '../components/common/ContextMenu';

function TestContextMenu() {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const items = useMemo(
    () => [
      { label: 'First action', onSelect: jest.fn() },
      { label: 'Second action', onSelect: jest.fn() },
      { label: 'Third action', onSelect: jest.fn() },
    ],
    []
  );

  return (
    <div>
      <button type="button" ref={triggerRef}>
        Trigger menu
      </button>
      <ContextMenu targetRef={triggerRef} items={items} />
    </div>
  );
}

describe('ContextMenu keyboard interactions', () => {
  it('wraps focus when navigating with arrow keys', async () => {
    render(<TestContextMenu />);

    const trigger = screen.getByRole('button', { name: 'Trigger menu' });
    fireEvent.contextMenu(trigger, { pageX: 16, pageY: 20 });

    const menu = screen.getByRole('menu');
    await waitFor(() => expect(menu).toHaveAttribute('aria-hidden', 'false'));

    const items = screen.getAllByRole('menuitem');
    await waitFor(() => expect(items[0]).toHaveFocus());

    fireEvent.keyDown(items[0], { key: 'ArrowUp' });
    expect(items[items.length - 1]).toHaveFocus();

    fireEvent.keyDown(items[items.length - 1], { key: 'ArrowDown' });
    expect(items[0]).toHaveFocus();
  });

  it('closes with Escape and returns focus to the trigger', async () => {
    render(<TestContextMenu />);

    const trigger = screen.getByRole('button', { name: 'Trigger menu' });
    fireEvent.keyDown(trigger, { key: 'F10', shiftKey: true });

    const menu = screen.getByRole('menu');
    await waitFor(() => expect(menu).toHaveAttribute('aria-hidden', 'false'));

    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => expect(menu).toHaveAttribute('aria-hidden', 'true'));
    await waitFor(() => expect(trigger).toHaveFocus());
  });
});

