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

  it('copies password to clipboard and shows success toast', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    // @ts-ignore
    Object.assign(navigator, { clipboard: { writeText } });
    const { getByText, getByTestId, findByText } = render(<PasswordGenerator />);
    fireEvent.click(getByText('Generate'));
    const value = (getByTestId('password-display') as HTMLInputElement).value;
    fireEvent.click(getByText('Copy'));
    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(value);
    });
    expect(await findByText('Password copied to clipboard')).toBeInTheDocument();
  });

  it('prompts manual copy when clipboard write fails', async () => {
    const writeText = jest.fn().mockRejectedValue(new Error('denied'));
    // @ts-ignore
    Object.assign(navigator, { clipboard: { writeText } });
    const { getByText, findByText } = render(<PasswordGenerator />);
    fireEvent.click(getByText('Generate'));
    fireEvent.click(getByText('Copy'));
    expect(await findByText('Press Ctrl+C to copy')).toBeInTheDocument();
  });
});
