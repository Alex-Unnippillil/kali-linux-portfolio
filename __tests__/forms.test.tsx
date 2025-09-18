import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  FormCheckbox,
  FormField,
  FormInput,
  FormTextarea,
} from '../components/forms';

describe('form components', () => {
  it('wires aria attributes for descriptions and errors', () => {
    render(
      <FormField
        id="email"
        label="Email"
        description="We will only use this to respond"
        error="Invalid email"
        required
      >
        <FormInput type="email" />
      </FormField>,
    );

    const input = screen.getByRole('textbox', { name: /Email/ });
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription(
      expect.stringContaining('We will only use this to respond'),
    );
    expect(input).toHaveAccessibleDescription(
      expect.stringContaining('Invalid email'),
    );
    expect(screen.getByText('Invalid email')).toHaveAttribute('role', 'status');
  });

  it('preserves existing aria-describedby', () => {
    render(
      <FormField id="username" label="Username">
        <FormInput aria-describedby="helper-text" />
      </FormField>,
    );

    const input = screen.getByLabelText('Username');
    expect(input).toHaveAttribute('aria-describedby', 'helper-text');
  });

  it('renders checkbox label and descriptions', async () => {
    const user = userEvent.setup();
    render(
      <FormCheckbox
        id="consent"
        label="Accept terms"
        description="Required to continue"
        error="You must accept"
      />,
    );

    const checkbox = screen.getByRole('checkbox', { name: /Accept terms/ });
    expect(checkbox).toHaveAccessibleDescription(
      expect.stringContaining('Required to continue'),
    );
    expect(checkbox).toHaveAccessibleDescription(
      expect.stringContaining('You must accept'),
    );
    expect(screen.getByText('You must accept')).toBeInTheDocument();
    await user.click(checkbox);
    expect(checkbox).toBeChecked();
  });

  it('supports textarea controls', () => {
    render(
      <FormField id="message" label="Message">
        <FormTextarea defaultValue="hello" />
      </FormField>,
    );

    expect(screen.getByLabelText('Message')).toHaveValue('hello');
  });
});
