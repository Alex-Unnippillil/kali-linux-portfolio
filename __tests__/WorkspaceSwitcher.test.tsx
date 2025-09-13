import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ModuleWorkspace from '../pages/module-workspace';

describe('WorkspaceSwitcher', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  test('activates workspaces and persists list', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<ModuleWorkspace />);

    const input = screen.getByPlaceholderText('New workspace');
    const create = screen.getByRole('button', { name: /create/i });

    await user.type(input, 'Alpha');
    await user.click(create);
    await user.type(input, 'Beta');
    await user.click(create);

    const alpha = screen.getByRole('button', { name: 'Alpha' });
    const beta = screen.getByRole('button', { name: 'Beta' });

    // Latest created workspace is active
    expect(beta.className).toContain('bg-blue-600');

    await user.click(alpha);
    expect(alpha.className).toContain('bg-blue-600');

    unmount();
    render(<ModuleWorkspace />);
    expect(screen.getByRole('button', { name: 'Alpha' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Beta' })).toBeInTheDocument();
  });
});
