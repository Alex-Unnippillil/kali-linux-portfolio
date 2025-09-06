import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import KernelTab from '../apps/settings/components/KernelTab';

describe('KernelTab', () => {
  it('shows preview after apply without editing', async () => {
    const user = userEvent.setup();
    render(<KernelTab />);

    const textarea = screen.getByLabelText('kernel-settings');
    await user.clear(textarea);
    await user.type(textarea, 'net.ipv4.ip_forward = 1');
    await user.click(screen.getByRole('button', { name: /apply/i }));
    const preview = screen.getByLabelText('kernel-preview');
    expect(preview).toHaveTextContent('net.ipv4.ip_forward = 1');
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });
});

