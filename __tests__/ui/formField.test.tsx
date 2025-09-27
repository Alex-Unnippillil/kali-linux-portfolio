import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TextAreaField, TextField } from '../../components/ui/FormField';

describe('FormField components', () => {
  it('links descriptions and messages for accessibility', () => {
    render(
      <TextField
        id="email"
        label="Email"
        description="We will write back quickly."
        message="Required"
        state="error"
      />,
    );
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('aria-describedby', expect.stringContaining('email-description'));
    expect(input).toHaveAttribute('aria-describedby', expect.stringContaining('email-message'));
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Required')).toHaveClass('text-[color:var(--game-color-danger)]');
  });

  it('supports success state messaging', () => {
    render(
      <TextField
        id="name"
        label="Name"
        state="success"
        message="Looks good"
        value="Kali"
        onChange={() => {}}
      />,
    );
    const input = screen.getByLabelText('Name');
    expect(input).not.toHaveAttribute('aria-invalid');
    expect(screen.getByText('Looks good')).toHaveClass('text-[color:var(--game-color-success)]');
  });

  it('displays loading indicator for textarea', async () => {
    const user = userEvent.setup();
    render(
      <TextAreaField
        id="message"
        label="Message"
        loading
        defaultValue="hello"
      />,
    );
    const textarea = screen.getByLabelText('Message');
    expect(textarea).toHaveClass('pr-10');
    expect(textarea.parentElement?.querySelector('.animate-spin')).toBeTruthy();
    expect(textarea).toBeEnabled();

    await user.type(textarea, '!');
    expect(textarea).toHaveValue('hello!');
  });
});
