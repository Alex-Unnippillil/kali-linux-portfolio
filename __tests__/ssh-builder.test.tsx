import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SSHBuilder } from '../apps/ssh';

describe('SSH Builder UI', () => {
  it('renders the SSH builder form', () => {
    render(<SSHBuilder />);

    expect(screen.getByLabelText(/^Host/i)).toBeInTheDocument();
  });

  it('updates the command preview when the host changes', async () => {
    const user = userEvent.setup();
    render(<SSHBuilder />);

    const hostInput = screen.getByLabelText(/^Host/i);
    await user.type(hostInput, 'example.com');

    expect(screen.getByLabelText(/ssh command preview/i)).toHaveTextContent('ssh example.com');
  });

  it('disables copy until the configuration is valid', async () => {
    const user = userEvent.setup();
    render(<SSHBuilder />);

    const copyButton = screen.getByRole('button', { name: /copy command/i });
    expect(copyButton).toBeDisabled();

    await user.type(screen.getByLabelText(/^Host/i), 'example.com');
    expect(copyButton).toBeEnabled();
  });
});
