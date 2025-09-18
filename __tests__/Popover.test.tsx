import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Popover from '../components/base/Popover';

test('popover applies elevation token and closes on outside interaction', () => {
  const anchor = document.createElement('button');
  document.body.appendChild(anchor);
  const anchorRef = { current: anchor } as React.RefObject<HTMLElement>;
  const onClose = jest.fn();

  const { getByRole, unmount } = render(
    <Popover open anchorRef={anchorRef} onClose={onClose} ariaLabel="Test popover">
      <button type="button">Action</button>
    </Popover>,
  );

  const dialog = getByRole('dialog', { name: 'Test popover' });
  expect(dialog).toBeInTheDocument();
  expect(dialog).toHaveClass('shadow-elevation-3');

  fireEvent.mouseDown(document.body);
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(onClose).toHaveBeenCalledTimes(2);

  unmount();
  document.body.removeChild(anchor);
});

test('popover does not render when closed', () => {
  const { queryByRole } = render(
    <Popover open={false} ariaLabel="Hidden popover">
      <div>hidden</div>
    </Popover>,
  );

  expect(queryByRole('dialog')).toBeNull();
});
