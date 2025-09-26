import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WhiskerMenu from '../components/menu/WhiskerMenu';

describe('WhiskerMenu accessibility roles', () => {
  it('exposes menu, tree, and listbox semantics', async () => {
    render(<WhiskerMenu />);
    const user = userEvent.setup();

    const toggle = screen.getByRole('button', { name: /Applications/i });
    await user.click(toggle);

    const menu = screen.getByRole('menu', { name: /Application launcher/i });
    expect(menu).toBeInTheDocument();

    const tree = within(menu).getByRole('tree', { name: /Application categories/i });
    const treeItems = within(tree).getAllByRole('treeitem');
    expect(treeItems.length).toBeGreaterThan(0);
    expect(within(tree).getByRole('treeitem', { selected: true })).toBeInTheDocument();

    const listbox = within(menu).getByRole('listbox', { name: /Applications/i });
    const activeId = listbox.getAttribute('aria-activedescendant');
    expect(activeId).not.toBeNull();

    const options = within(listbox).getAllByRole('option');
    expect(options.length).toBeGreaterThan(0);
    expect(options[0]).toHaveAttribute('aria-selected', 'true');
    expect(activeId).toBe(options[0].id);
  });
});
