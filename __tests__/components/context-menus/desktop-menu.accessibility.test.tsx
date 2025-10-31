import React from 'react';
import { render, fireEvent, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import DesktopMenu from '../../../components/context-menus/desktop-menu';
import DefaultMenu from '../../../components/context-menus/default';

describe('context menu accessibility', () => {
  test('desktop menu supports arrow navigation and typeahead', async () => {
    const DesktopMenuWrapper: React.FC = () => {
      const [open, setOpen] = React.useState(true);
      const triggerRef = React.useRef<HTMLButtonElement | null>(null);
      const restoreFocusRef = React.useRef<HTMLElement | null>(null);

      React.useEffect(() => {
        restoreFocusRef.current = triggerRef.current;
      });

      return (
        <>
          <button ref={triggerRef} onClick={() => setOpen((value) => !value)}>
            Toggle desktop menu
          </button>
          <DesktopMenu
            active={open}
            onClose={() => setOpen(false)}
            restoreFocusRef={restoreFocusRef}
            openApp={jest.fn()}
            addNewFolder={jest.fn()}
            openShortcutSelector={jest.fn()}
            iconSizePreset="medium"
            iconSizeBucket="desktop"
            iconSizeBucketLabel="current display"
            setIconSizePreset={jest.fn()}
            clearSession={jest.fn()}
          />
        </>
      );
    };

    render(<DesktopMenuWrapper />);

    const menu = await screen.findByRole('menu', { name: /desktop context menu/i });
    const newFolder = within(menu).getByRole('menuitem', { name: /new folder/i });
    await waitFor(() => expect(newFolder).toHaveFocus());

    fireEvent.keyDown(newFolder, { key: 'ArrowDown' });
    const createShortcut = within(menu).getByRole('menuitem', { name: /create shortcut/i });
    await waitFor(() => expect(createShortcut).toHaveFocus());

    fireEvent.keyDown(createShortcut, { key: 'ArrowUp' });
    await waitFor(() => expect(newFolder).toHaveFocus());

    fireEvent.keyDown(newFolder, { key: 'ArrowDown' });
    await waitFor(() => expect(createShortcut).toHaveFocus());

    fireEvent.keyDown(createShortcut, { key: 'o' });
    const openInTerminal = within(menu).getByRole('menuitem', { name: /open in terminal/i });
    await waitFor(() => expect(openInTerminal).toHaveFocus());
  });

  test('default menu closes on Escape and restores focus to trigger', async () => {
    const DefaultMenuWrapper: React.FC = () => {
      const [open, setOpen] = React.useState(true);
      const triggerRef = React.useRef<HTMLButtonElement | null>(null);
      const restoreFocusRef = React.useRef<HTMLElement | null>(null);

      React.useEffect(() => {
        restoreFocusRef.current = triggerRef.current;
      });

      return (
        <>
          <button ref={triggerRef} onClick={() => setOpen((value) => !value)}>
            Toggle default menu
          </button>
          <DefaultMenu
            active={open}
            onClose={() => setOpen(false)}
            restoreFocusRef={restoreFocusRef}
          />
        </>
      );
    };

    const { container } = render(<DefaultMenuWrapper />);

    const menu = await screen.findByRole('menu');
    const firstLink = within(menu).getByRole('menuitem', { name: /linkedin/i });
    await waitFor(() => expect(firstLink).toHaveFocus());

    fireEvent.keyDown(firstLink, { key: 'Escape' });

    await waitFor(() => expect(menu).toHaveAttribute('aria-hidden', 'true'));
    const triggerButton = screen.getByRole('button', { name: /toggle default menu/i });
    await waitFor(() => expect(triggerButton).toHaveFocus());

    expect(container.querySelector('#default-menu')).toHaveAttribute('aria-hidden', 'true');
  });
});

