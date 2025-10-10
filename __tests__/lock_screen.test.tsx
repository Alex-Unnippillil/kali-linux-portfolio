import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import LockScreen from '../components/screen/lock_screen';

describe('LockScreen accessibility behaviour', () => {
  let layoutRoot: HTMLDivElement;

  beforeEach(() => {
    layoutRoot = document.createElement('div');
    layoutRoot.setAttribute('id', 'monitor-screen');
    document.body.appendChild(layoutRoot);
  });

  afterEach(() => {
    if (layoutRoot.parentNode) {
      layoutRoot.parentNode.removeChild(layoutRoot);
    }
  });

  test('focuses overlay, inert shell, and restores focus on unlock', async () => {
    const Wrapper: React.FC = () => {
      const [locked, setLocked] = React.useState(false);
      return (
        <>
          <button type="button" onClick={() => setLocked(true)}>
            Lock
          </button>
          <LockScreen isLocked={locked} unLockScreen={() => setLocked(false)} />
          <button type="button">Shell action</button>
        </>
      );
    };

    const { getByText, unmount } = render(<Wrapper />, { container: layoutRoot });

    const lockButton = getByText('Lock');
    const shellButton = getByText('Shell action');

    lockButton.focus();
    expect(lockButton).toHaveFocus();

    fireEvent.click(lockButton);

    const overlay = layoutRoot.querySelector('#ubuntu-lock-screen');
    expect(overlay).not.toBeNull();

    await waitFor(() => expect(overlay).toHaveFocus());
    expect(lockButton).toHaveAttribute('inert');
    expect(shellButton).toHaveAttribute('inert');

    await act(async () => {
      window.dispatchEvent(new Event('click'));
    });

    await waitFor(() => expect(lockButton).toHaveFocus());
    expect(lockButton).not.toHaveAttribute('inert');
    expect(shellButton).not.toHaveAttribute('inert');

    unmount();
  });
});

