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
    // @ts-ignore
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
    const initial = getByText(/Entropy:/i).textContent;
    fireEvent.change(getByLabelText(/Length/i), { target: { value: '20' } });
    const updated = getByText(/Entropy:/i).textContent;
    expect(updated).not.toBe(initial);
  });

  it('applies preset configuration', () => {
    const { getByRole, getByLabelText } = render(<PasswordGenerator />);
    fireEvent.click(getByRole('button', { name: /High security/i }));
    expect((getByLabelText(/Length/i) as HTMLInputElement).value).toBe('20');
    expect((getByLabelText(/Symbols/i) as HTMLInputElement).checked).toBe(true);
    expect((getByLabelText(/Numbers/i) as HTMLInputElement).checked).toBe(true);
  });

  it('updates entropy label when presets change', () => {
    const { getByRole, getByText } = render(<PasswordGenerator />);
    const initial = getByText(/Entropy:/i).textContent;
    fireEvent.click(getByRole('button', { name: /Memorable/i }));
    const afterPreset = getByText(/Entropy:/i).textContent;
    expect(afterPreset).not.toBe(initial);
    expect(getByText(/Entropy:/i)).toHaveTextContent(/Weak/i);
  });
});
