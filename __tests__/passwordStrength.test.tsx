import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import PasswordStrength from '@apps/password-strength';

describe('PasswordStrength', () => {
  it('shows analysis details', () => {
    const { getByLabelText, getByText } = render(<PasswordStrength />);
    fireEvent.change(getByLabelText(/password/i), { target: { value: 'password' } });
    fireEvent.click(getByText('Check'));
    expect(getByText(/Score:/)).toBeInTheDocument();
    expect(getByText(/Entropy:/)).toBeInTheDocument();
    expect(getByText(/Guesses:/)).toBeInTheDocument();
  });

  it('warns on reused passwords', () => {
    const { getByLabelText, getByText } = render(<PasswordStrength />);
    const input = getByLabelText(/password/i);
    fireEvent.change(input, { target: { value: 'secret123' } });
    fireEvent.click(getByText('Check'));
    fireEvent.change(input, { target: { value: 'secret123' } });
    fireEvent.click(getByText('Check'));
    expect(getByText(/used this password before/i)).toBeInTheDocument();
  });
});
