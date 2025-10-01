import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Modal from '../components/base/Modal';
import OverlayHost from '../components/common/OverlayHost';

test('modal traps focus, disables background, and restores opener focus', async () => {
  const root = document.createElement('div');
  root.setAttribute('id', '__next');
  document.body.appendChild(root);

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

  const { getByText, unmount } = render(
    (
      <OverlayHost>
        <Wrapper />
      </OverlayHost>
    ),
    { container: root },
  );
  const openButton = getByText('open');
  openButton.focus();
  fireEvent.click(openButton);

  const first = await screen.findByText('first');
  const second = await screen.findByText('second');
  expect(first).toHaveFocus();
  expect(root).toHaveAttribute('inert');

  second.focus();
  fireEvent.keyDown(second, { key: 'Tab' });
  expect(first).toHaveFocus();

  fireEvent.keyDown(first, { key: 'Tab', shiftKey: true });
  expect(second).toHaveFocus();

  fireEvent.keyDown(first, { key: 'Escape' });
  await waitFor(() => expect(openButton).toHaveFocus());
  expect(root).not.toHaveAttribute('inert');

  unmount();
  document.body.removeChild(root);
});

test('modal closes when Escape pressed globally', async () => {
  const Wrapper: React.FC = () => {
    const [open, setOpen] = React.useState(false);
    return (
      <>
        <button onClick={() => setOpen(true)}>open</button>
        <Modal isOpen={open} onClose={() => setOpen(false)}>
          <button>first</button>
        </Modal>
      </>
    );
  };

  const { getByText } = render(
    <OverlayHost>
      <Wrapper />
    </OverlayHost>,
  );
  const openButton = getByText('open');
  openButton.focus();
  fireEvent.click(openButton);

  const first = getByText('first');
  expect(first).toHaveFocus();

  fireEvent.keyDown(document, { key: 'Escape' });
  await waitFor(() => expect(openButton).toHaveFocus());
});
