import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import WorkspaceSwitcher, { WorkspaceSummary } from '../components/panel/WorkspaceSwitcher';

describe('WorkspaceSwitcher', () => {
  const workspaces: WorkspaceSummary[] = [
    { id: 0, label: 'Workspace 1', openWindows: 2 },
    { id: 1, label: 'Workspace 2', openWindows: 0 },
  ];

  it('renders tooltips with workspace and window information', () => {
    render(
      <WorkspaceSwitcher
        workspaces={workspaces}
        activeWorkspace={0}
        onSelect={() => {}}
      />
    );

    const buttons = screen.getAllByRole('button');
    expect(buttons[0]).toHaveAttribute('title', 'Workspace 1 • 2 windows open');
    expect(buttons[1]).toHaveAttribute('title', 'Workspace 2 • No windows open');
  });

  it('cycles workspaces via scroll wheel when handler provided', () => {
    const onCycle = jest.fn();
    render(
      <WorkspaceSwitcher
        workspaces={workspaces}
        activeWorkspace={0}
        onSelect={() => {}}
        onCycle={onCycle}
      />
    );

    const navigation = screen.getByRole('navigation', { name: /workspace switcher/i });
    fireEvent.wheel(navigation, { deltaY: 120 });
    fireEvent.wheel(navigation, { deltaY: -120 });

    expect(onCycle).toHaveBeenCalledWith(1);
    expect(onCycle).toHaveBeenCalledWith(-1);
  });
});

