import React from 'react';
import { render, screen } from '@testing-library/react';
import VCardPage from '../pages/qr/vcard';

jest.mock('qrcode', () => ({
  toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,'),
  toString: jest.fn().mockResolvedValue('<svg></svg>'),
}));

describe('QR vCard form attributes', () => {
  it('configures input fields for mobile keyboards', () => {
    render(<VCardPage />);

    const nameInput = screen.getByLabelText(/full name/i);
    expect(nameInput).toHaveAttribute('inputmode', 'text');
    expect(nameInput).toHaveAttribute('autocomplete', 'name');
    expect(nameInput).toHaveAttribute('autocorrect', 'off');

    const orgInput = screen.getByLabelText(/organization/i);
    expect(orgInput).toHaveAttribute('inputmode', 'text');
    expect(orgInput).toHaveAttribute('autocomplete', 'organization');
    expect(orgInput).toHaveAttribute('autocorrect', 'off');

    const phoneInput = screen.getByLabelText(/phone/i);
    expect(phoneInput).toHaveAttribute('inputmode', 'tel');
    expect(phoneInput).toHaveAttribute('autocomplete', 'tel');
    expect(phoneInput).toHaveAttribute('autocorrect', 'off');

    const emailInput = screen.getByLabelText(/email/i);
    expect(emailInput).toHaveAttribute('inputmode', 'email');
    expect(emailInput).toHaveAttribute('autocomplete', 'email');
    expect(emailInput).toHaveAttribute('autocorrect', 'off');
  });
});
