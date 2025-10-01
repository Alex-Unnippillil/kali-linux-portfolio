import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ContextMenu from '../components/common/ContextMenu';

describe('ContextMenu focus management', () => {
  function Wrapper() {
    const targetRef = React.useRef<HTMLButtonElement>(null);
    const items = React.useMemo(
      () => [
        { label: 'Open', onSelect: jest.fn() },
        { label: 'Delete', onSelect: jest.fn() },
      ],
      [],
    );

    return (
      <div>
        <button data-testid="trigger" ref={targetRef} type="button">
          Trigger
        </button>
        <ContextMenu targetRef={targetRef} items={items} />
      </div>
    );
  }

  test('focuses first item on open, traps tab, and restores trigger on close', async () => {
    const { getByTestId } = render(<Wrapper />);
    const trigger = getByTestId('trigger');

    trigger.focus();
    fireEvent.contextMenu(trigger, { pageX: 10, pageY: 10 });

    const firstItem = await screen.findByRole('menuitem', { name: 'Open' });
    const secondItem = await screen.findByRole('menuitem', { name: 'Delete' });

    await waitFor(() => expect(firstItem).toHaveFocus());

    fireEvent.keyDown(firstItem, { key: 'ArrowDown' });
    expect(secondItem).toHaveFocus();

    fireEvent.keyDown(secondItem, { key: 'Tab' });
    expect(firstItem).toHaveFocus();

    fireEvent.keyDown(firstItem, { key: 'Tab', shiftKey: true });
    expect(secondItem).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => expect(trigger).toHaveFocus());
  });
});
