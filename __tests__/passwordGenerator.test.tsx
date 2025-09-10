import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import PasswordGenerator from '../apps/password_generator';

describe('PasswordGenerator', () => {
  it('generates password of specified length', () => {
    const { getByText, getByLabelText, getByTestId } = render(<PasswordGenerator />);
    fireEvent.change(getByLabelText(/Length/i), { target: { value: '8' } });
    fireEvent.click(getByText('Generate'));
    const value = (getByTestId('password-display') as HTMLInputElement).value;
    expect(value).toHaveLength(8);
  });

  it('copies password to clipboard', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    // @ts-expect-error Clipboard API not available in tests
    Object.assign(navigator, { clipboard: { writeText } });
    const { getByText, getByTestId } = render(<PasswordGenerator />);
    fireEvent.click(getByText('Generate'));
    const value = (getByTestId('password-display') as HTMLInputElement).value;
    fireEvent.click(getByText('Copy'));
    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(value);
    });
  });

  it('updates entropy when options change', () => {
    const { getByLabelText, getByText } = render(<PasswordGenerator />);
    const initial = getByText(/Entropy/i).textContent;
    fireEvent.change(getByLabelText(/Length/i), { target: { value: '20' } });
    const updated = getByText(/Entropy/i).textContent;
    expect(updated).not.toBe(initial);
  });
});
