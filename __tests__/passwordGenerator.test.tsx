import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import PasswordGenerator from '../apps/password_generator';

describe('PasswordGenerator', () => {
  it('generates password of specified length', async () => {
    const { getByText, getByTestId } = render(<PasswordGenerator />);
    await waitFor(() => expect(getByText('Generate')).not.toBeDisabled());
    const form = getByText('Generate').closest('form')!;
    fireEvent.submit(form);
    await waitFor(() => expect((getByTestId('password-display') as HTMLInputElement).value).not.toBe(''));
    const value = (getByTestId('password-display') as HTMLInputElement).value;
    expect(value).toHaveLength(12);
  });

  it('copies password to clipboard', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    // @ts-ignore
    Object.assign(navigator, { clipboard: { writeText } });
    const { getByText, getByTestId } = render(<PasswordGenerator />);
    await waitFor(() => expect(getByText('Generate')).not.toBeDisabled());
    const form = getByText('Generate').closest('form')!;
    fireEvent.submit(form);
    await waitFor(() => expect((getByTestId('password-display') as HTMLInputElement).value).not.toBe(''));
    const value = (getByTestId('password-display') as HTMLInputElement).value;
    fireEvent.click(getByText('Copy'));
    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(value);
    });
  });

  it('requires at least one character type', async () => {
    const { getByLabelText, getByText } = render(<PasswordGenerator />);
    await waitFor(() => expect(getByText('Generate')).not.toBeDisabled());
    fireEvent.click(getByLabelText(/Lowercase/i));
    fireEvent.click(getByLabelText(/Uppercase/i));
    fireEvent.click(getByLabelText(/Numbers/i));
    const form = getByText('Generate').closest('form')!;
    fireEvent.submit(form);
    await waitFor(() => expect(getByText('Generate')).toBeDisabled());
    expect(getByText('Select at least one character type')).toBeInTheDocument();
  });
});
