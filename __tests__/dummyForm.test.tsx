import React from 'react';
import { render, screen } from '@testing-library/react';
import DummyForm from '../pages/dummy-form';

describe('Dummy form mobile attributes', () => {
  it('applies mobile friendly attributes to inputs', () => {
    render(<DummyForm />);

    const nameInput = screen.getByLabelText(/name/i);
    expect(nameInput).toHaveAttribute('inputmode', 'text');
    expect(nameInput).toHaveAttribute('autocomplete', 'name');
    expect(nameInput).toHaveAttribute('autocorrect', 'off');

    const emailInput = screen.getByLabelText(/email/i);
    expect(emailInput).toHaveAttribute('inputmode', 'email');
    expect(emailInput).toHaveAttribute('autocomplete', 'email');
    expect(emailInput).toHaveAttribute('autocorrect', 'off');

    const messageInput = screen.getByLabelText(/message/i);
    expect(messageInput).toHaveAttribute('inputmode', 'text');
    expect(messageInput).toHaveAttribute('autocomplete', 'on');
    expect(messageInput).toHaveAttribute('autocorrect', 'on');
  });
});
