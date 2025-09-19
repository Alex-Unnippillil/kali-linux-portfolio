import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Checkbox from '../components/ui/Checkbox';
import Input from '../components/ui/Input';
import Radio from '../components/ui/Radio';
import Select from '../components/ui/Select';
import Switch from '../components/ui/Switch';
import Textarea from '../components/ui/Textarea';

describe('UI primitives', () => {
  it('focuses the input when its label is clicked', async () => {
    const user = userEvent.setup();
    render(<Input id="name" label="Name" />);

    await user.click(screen.getByText('Name'));

    expect(screen.getByLabelText('Name')).toHaveFocus();
  });

  it('respects tab order across fields', async () => {
    const user = userEvent.setup();
    render(
      <form>
        <Input id="first" label="First" />
        <Select id="second" label="Second" defaultValue="">
          <option value="" disabled>
            Select
          </option>
          <option value="one">One</option>
        </Select>
        <Textarea id="third" label="Third" />
        <Checkbox id="fourth" label="Fourth" />
        <Radio id="fifth" name="group" label="Fifth" />
        <Switch id="sixth" label="Sixth" />
      </form>,
    );

    await user.tab();
    expect(screen.getByLabelText('First')).toHaveFocus();

    await user.tab();
    expect(screen.getByLabelText('Second')).toHaveFocus();

    await user.tab();
    expect(screen.getByLabelText('Third')).toHaveFocus();

    await user.tab();
    expect(screen.getByLabelText('Fourth')).toHaveFocus();

    await user.tab();
    expect(screen.getByLabelText('Fifth')).toHaveFocus();

    await user.tab();
    expect(screen.getByLabelText('Sixth')).toHaveFocus();
  });

  it('merges helper, error, and external aria descriptions', () => {
    render(
      <Input
        id="email"
        label="Email"
        helperText="We never share your email."
        errorText="Enter a valid email."
        aria-describedby="external-note"
      />,
    );

    const field = screen.getByLabelText('Email');

    expect(field).toHaveAttribute('aria-invalid', 'true');
    const describedBy = field.getAttribute('aria-describedby') ?? '';
    expect(describedBy.split(' ')).toEqual(
      expect.arrayContaining(['external-note', 'email-error', 'email-helper']),
    );
    expect(screen.getByText('Enter a valid email.')).toBeInTheDocument();
    expect(screen.getByText('We never share your email.')).toBeInTheDocument();
  });
});
