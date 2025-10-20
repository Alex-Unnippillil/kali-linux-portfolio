import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import DummyForm from '../pages/dummy-form';

describe('DummyForm accessibility validation', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('shows an error summary and field-level messaging with aria attributes', async () => {
    render(<DummyForm />);

    fireEvent.click(screen.getByRole('button', { name: /submit/i }));

    const summary = await screen.findByRole('alert', {
      name: /please fix the following errors/i,
    });

    await waitFor(() => expect(summary).toHaveFocus());

    expect(screen.getByRole('link', { name: /name is required/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /email is required/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /message is required/i })).toBeInTheDocument();

    const nameInput = screen.getByLabelText(/name/i);
    const emailInput = screen.getByLabelText(/email/i);
    const messageInput = screen.getByLabelText(/message/i);

    expect(nameInput).toHaveAttribute('aria-invalid', 'true');
    expect(nameInput).toHaveAttribute('aria-describedby', 'name-error');

    expect(emailInput).toHaveAttribute('aria-invalid', 'true');
    expect(emailInput).toHaveAttribute('aria-describedby', 'email-error');

    expect(messageInput).toHaveAttribute('aria-invalid', 'true');
    expect(messageInput).toHaveAttribute('aria-describedby', 'message-error');
  });

  it('focuses the associated field when an error summary link is activated', async () => {
    render(<DummyForm />);

    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Alex' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'invalid-email' } });
    fireEvent.change(screen.getByLabelText(/message/i), { target: { value: 'Hello there' } });

    fireEvent.click(screen.getByRole('button', { name: /submit/i }));

    await screen.findByRole('link', { name: /please enter a valid email/i });

    fireEvent.click(screen.getByRole('link', { name: /please enter a valid email/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/email/i)).toHaveFocus();
    });
  });
});
