import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import DefaultMenu from '../../components/context-menus/default';

describe('DefaultMenu', () => {
  const createProps = () => ({
    active: true,
    onClose: jest.fn(),
    addNewFolder: jest.fn(),
    openShortcutSelector: jest.fn(),
    openApp: jest.fn(),
    clearSession: jest.fn(),
  });

  it('renders the standard desktop actions and omits personal links', () => {
    render(<DefaultMenu {...createProps()} />);

    expect(screen.getByRole('menuitem', { name: 'New Folder' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Create Shortcut' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Open in Terminal' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Change Background' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Settings' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /Full Screen/ })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Clear Session' })).toBeInTheDocument();

    expect(screen.queryByText(/Linkedin/i)).toBeNull();
    expect(screen.queryByText(/Github/i)).toBeNull();
    expect(screen.queryByText(/Contact Me/i)).toBeNull();
  });

  it('invokes handlers for actionable menu items', () => {
    const props = createProps();
    render(<DefaultMenu {...props} />);

    fireEvent.click(screen.getByRole('menuitem', { name: 'New Folder' }));
    expect(props.addNewFolder).toHaveBeenCalledTimes(1);
    expect(props.onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('menuitem', { name: 'Create Shortcut' }));
    expect(props.openShortcutSelector).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('menuitem', { name: 'Open in Terminal' }));
    expect(props.openApp).toHaveBeenNthCalledWith(1, 'terminal');

    fireEvent.click(screen.getByRole('menuitem', { name: 'Change Background' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Settings' }));
    expect(props.openApp).toHaveBeenCalledWith('settings');

    fireEvent.click(screen.getByRole('menuitem', { name: 'Clear Session' }));
    expect(props.clearSession).toHaveBeenCalledTimes(1);
    expect(props.onClose).toHaveBeenCalledTimes(6);
  });
});
