import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginPage from '../pages/login';

const push = jest.fn();

jest.mock('next/router', () => ({
  useRouter: () => ({ push }),
}));

describe('LoginPage', () => {
  beforeEach(() => {
    push.mockReset();
  });

  it('toggles password visibility and blocks invalid credentials', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);
    const pass = screen.getByLabelText(/^password$/i);
    await user.type(screen.getByLabelText(/username/i), 'kali');
    await user.type(pass, 'wrong');
    await user.click(screen.getByLabelText(/show password/i));
    expect(pass).toHaveAttribute('type', 'text');
    await user.click(screen.getByRole('button', { name: /log in/i }));
    expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it('logs in with correct credentials', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);
    await user.type(screen.getByLabelText(/username/i), 'kali');
    await user.type(screen.getByLabelText(/^password$/i), 'kali');
    await user.click(screen.getByRole('button', { name: /log in/i }));
    expect(push).toHaveBeenCalledWith('/');
  });
});

