import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import WorkspaceSwitcher from '../components/WorkspaceSwitcher';
import { WorkspaceProvider } from '../hooks/useWorkspaceStore';

jest.mock('../hooks/useSettings', () => ({
  useSettings: () => ({ accent: '#ff0000' }),
}));

describe('WorkspaceSwitcher', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('toggles workspaces and sets aria-pressed', () => {
    render(
      <WorkspaceProvider>
        <WorkspaceSwitcher />
      </WorkspaceProvider>
    );

    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(4);
    expect(buttons[0]).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(buttons[2]);
    expect(buttons[2]).toHaveAttribute('aria-pressed', 'true');
    expect(buttons[0]).toHaveAttribute('aria-pressed', 'false');
    expect(window.localStorage.getItem('active-workspace')).toBe('2');
  });
});
