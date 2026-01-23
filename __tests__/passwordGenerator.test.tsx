import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import PasswordGenerator from '../apps/password_generator';

describe('PasswordGenerator', () => {
  it('generates password of specified length', () => {
    const { getByText, getAllByLabelText, getByTestId } = render(<PasswordGenerator />);
    fireEvent.change(getAllByLabelText(/Length/i)[0], { target: { value: '8' } });
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
    const { getAllByLabelText, getAllByText } = render(<PasswordGenerator />);
    const initial = getAllByText(/bits/i)[0].textContent;
    fireEvent.change(getAllByLabelText(/Length/i)[0], { target: { value: '20' } });
    const updated = getAllByText(/bits/i)[0].textContent;
    expect(updated).not.toBe(initial);
  });

  it('applies preset configuration', () => {
    const { getByRole, getAllByLabelText } = render(<PasswordGenerator />);
    fireEvent.click(getByRole('button', { name: /High security/i }));
    expect((getAllByLabelText(/Length/i)[0] as HTMLInputElement).value).toBe('20');
    expect((getAllByLabelText(/Symbols/i)[0] as HTMLInputElement).checked).toBe(true);
    expect((getAllByLabelText(/Numbers/i)[0] as HTMLInputElement).checked).toBe(true);
  });

  it('updates entropy label when presets change', () => {
    const { getByRole, getAllByText } = render(<PasswordGenerator />);
    const initial = getAllByText(/bits/i)[0].textContent;
    fireEvent.click(getByRole('button', { name: /Memorable/i }));
    const afterPreset = getAllByText(/bits/i)[0].textContent;
    expect(afterPreset).not.toBe(initial);
    expect(getAllByText(/Weak/i).length).toBeGreaterThan(0);
  });
});
