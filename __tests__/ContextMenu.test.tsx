import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import ContextMenu from '../components/common/ContextMenu';

describe('ContextMenu', () => {
  test('traps focus and loops when tabbing', async () => {
    const user = userEvent.setup();
    render(
      <ContextMenu
        id="test-menu"
        open
        onClose={() => {}}
        anchorPoint={{ x: 0, y: 0 }}
        items={[
          { id: 'first', label: 'First Item', onSelect: jest.fn() },
          { id: 'second', label: 'Second Item', onSelect: jest.fn() },
        ]}
      />
    );

    const first = await screen.findByRole('menuitem', { name: /first item/i });
    const second = await screen.findByRole('menuitem', { name: /second item/i });

    await waitFor(() => expect(first).toHaveFocus());

    await user.tab();
    expect(second).toHaveFocus();

    await user.tab();
    expect(first).toHaveFocus();

    await user.tab({ shift: true });
    expect(second).toHaveFocus();
  });

  test('supports arrow key navigation', async () => {
    render(
      <ContextMenu
        id="nav-menu"
        open
        onClose={() => {}}
        anchorPoint={{ x: 0, y: 0 }}
        items={[
          { id: 'first', label: 'First Action', onSelect: jest.fn() },
          { id: 'second', label: 'Second Action', onSelect: jest.fn() },
          { id: 'third', label: 'Third Action', onSelect: jest.fn() },
        ]}
      />
    );

    const first = await screen.findByRole('menuitem', { name: /first action/i });
    const second = await screen.findByRole('menuitem', { name: /second action/i });

    await waitFor(() => expect(first).toHaveFocus());

    fireEvent.keyDown(first, { key: 'ArrowDown' });
    expect(second).toHaveFocus();

    fireEvent.keyDown(second, { key: 'ArrowUp' });
    expect(first).toHaveFocus();
  });
});
