import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import MenuSurface from '../components/context-menus/MenuSurface';

test('menu surface roves focus with arrow, home, and end keys', async () => {
  const user = userEvent.setup();
  render(
    <MenuSurface id="menu" active onClose={jest.fn()} aria-label="Test menu" className="test">
      <button role="menuitem" aria-label="Alpha">Alpha</button>
      <button role="menuitem" aria-label="Beta">Beta</button>
      <button role="menuitem" aria-label="Gamma">Gamma</button>
    </MenuSurface>
  );

  const alpha = screen.getByRole('menuitem', { name: 'Alpha' });
  const beta = screen.getByRole('menuitem', { name: 'Beta' });
  const gamma = screen.getByRole('menuitem', { name: 'Gamma' });

  await waitFor(() => expect(alpha).toHaveFocus());
  await user.keyboard('{ArrowDown}');
  expect(beta).toHaveFocus();
  await user.keyboard('{End}');
  expect(gamma).toHaveFocus();
  await user.keyboard('{Home}');
  expect(alpha).toHaveFocus();
  await user.keyboard('{ArrowUp}');
  expect(gamma).toHaveFocus();
});

test('menu surface supports typeahead and escape closes menu', async () => {
  const user = userEvent.setup();
  const onClose = jest.fn();
  render(
    <MenuSurface id="menu" active onClose={onClose} aria-label="Test menu" className="test">
      <button role="menuitem" aria-label="Alpha">Alpha</button>
      <button role="menuitem" aria-label="Beta">Beta</button>
      <button role="menuitem" aria-label="Gamma">Gamma</button>
    </MenuSurface>
  );

  const alpha = screen.getByRole('menuitem', { name: 'Alpha' });
  const gamma = screen.getByRole('menuitem', { name: 'Gamma' });

  await waitFor(() => expect(alpha).toHaveFocus());
  await user.keyboard('g');
  expect(gamma).toHaveFocus();
  await user.keyboard('{Escape}');
  expect(onClose).toHaveBeenCalled();
});

test('menu surface restores focus to opener when closed', async () => {
  const user = userEvent.setup();
  const Wrapper: React.FC = () => {
    const [open, setOpen] = React.useState(false);
    return (
      <>
        <button onClick={() => setOpen(true)}>open</button>
        <button onClick={() => setOpen(false)}>close menu</button>
        <MenuSurface
          id="menu"
          active={open}
          onClose={() => setOpen(false)}
          aria-label="Test menu"
          className="test"
        >
          <button role="menuitem" aria-label="Alpha">Alpha</button>
        </MenuSurface>
      </>
    );
  };

  render(<Wrapper />);

  const openButton = screen.getByText('open');
  const closeButton = screen.getByText('close menu');

  openButton.focus();
  await user.click(openButton);
  const alpha = await screen.findByRole('menuitem', { name: 'Alpha' });
  await waitFor(() => expect(alpha).toHaveFocus());

  await user.click(closeButton);
  await waitFor(() => expect(openButton).toHaveFocus());
});
