import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import AppMenu from '../components/context-menus/app-menu';

describe('AppMenu', () => {
  const baseProps = {
    active: true,
    pinned: false,
    pinApp: jest.fn(),
    unpinApp: jest.fn(),
    onClose: jest.fn(),
    onOpenNewInstance: jest.fn(),
    onAssignWorkspace: jest.fn(),
    onViewDetails: jest.fn(),
    workspaces: [
      { id: 0, label: 'Workspace 1' },
      { id: 1, label: 'Workspace 2' },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('triggers new instance action and closes menu', () => {
    render(<AppMenu {...baseProps} />);

    fireEvent.click(screen.getByRole('menuitem', { name: /open new window/i }));

    expect(baseProps.onOpenNewInstance).toHaveBeenCalledTimes(1);
    expect(baseProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('invokes workspace assignment with the selected id', () => {
    render(<AppMenu {...baseProps} />);

    fireEvent.click(screen.getByRole('menuitem', { name: /move to workspace 2/i }));

    expect(baseProps.onAssignWorkspace).toHaveBeenCalledWith(1);
    expect(baseProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('dispatches view details action and closes the menu', () => {
    render(<AppMenu {...baseProps} />);

    fireEvent.click(screen.getByRole('menuitem', { name: /view app details/i }));

    expect(baseProps.onViewDetails).toHaveBeenCalledTimes(1);
    expect(baseProps.onClose).toHaveBeenCalledTimes(1);
  });
});
