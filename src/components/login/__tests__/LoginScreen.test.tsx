import LoginScreen from '../LoginScreen';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('LoginScreen', () => {
  it('focuses password input on mount and calls session function on submit', async () => {
    const user = userEvent.setup();
    const sessionMock = jest.fn().mockResolvedValue(undefined);

    render(<LoginScreen sessionFn={sessionMock} />);
    const input = screen.getByLabelText(/password/i);
    expect(input).toHaveFocus();

    await user.type(input, 'secret');
    await user.click(screen.getByRole('button', { name: /log in/i }));

    expect(sessionMock).toHaveBeenCalledWith('secret');
  });
});
