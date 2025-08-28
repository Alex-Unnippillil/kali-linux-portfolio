import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Modal from '../components/base/Modal';

test('modal traps focus and restores focus on close', async () => {
  const Wrapper: React.FC = () => {
    const [open, setOpen] = React.useState(false);
    return (
      <>
        <button onClick={() => setOpen(true)}>open</button>
        <Modal isOpen={open} onClose={() => setOpen(false)}>
          <button>first</button>
          <button>second</button>
        </Modal>
      </>
    );
  };

  const { getByText } = render(<Wrapper />);
  const openButton = getByText('open');
  openButton.focus();
  fireEvent.click(openButton);

  const first = getByText('first');
  const second = getByText('second');
  expect(first).toHaveFocus();

  second.focus();
  fireEvent.keyDown(second, { key: 'Tab' });
  expect(first).toHaveFocus();

  fireEvent.keyDown(first, { key: 'Tab', shiftKey: true });
  expect(second).toHaveFocus();

  fireEvent.keyDown(first, { key: 'Escape' });
  await waitFor(() => expect(openButton).toHaveFocus());
});
