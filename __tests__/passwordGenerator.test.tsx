import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PasswordGenerator from '../apps/password_generator';

describe('PasswordGenerator', () => {
  beforeEach(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: jest.fn().mockResolvedValue(undefined) },
    });
  });

  afterEach(() => {
    delete (navigator as Navigator & { clipboard?: unknown }).clipboard;
  });

  const passwordField = () => screen.getByLabelText(/generated password/i) as HTMLInputElement;

  it('generates a password of the requested length', async () => {
    render(<PasswordGenerator />);

    fireEvent.change(screen.getByLabelText(/manual entry/i), { target: { value: '8' } });
    await userEvent.click(screen.getByRole('button', { name: /generate/i }));

    expect(passwordField().value).toHaveLength(8);
  });

  it('applies preset configuration selections', async () => {
    const user = userEvent.setup();
    render(<PasswordGenerator />);

    await user.click(screen.getByRole('button', { name: /high security/i }));

    const manualInput = screen.getByLabelText(/manual entry/i) as HTMLInputElement;
    expect(manualInput.value).toBe('20');
    expect((screen.getByLabelText(/include symbols/i) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText(/include numbers/i) as HTMLInputElement).checked).toBe(true);
  });

  it('recalculates strength indicators when configuration changes', async () => {
    const user = userEvent.setup();
    render(<PasswordGenerator />);

    expect(screen.getByText(/medium/i)).toBeInTheDocument();

    const manualInput = screen.getByLabelText(/manual entry/i);
    fireEvent.change(manualInput, { target: { value: '20' } });

    const symbolsToggle = screen.getByLabelText(/include symbols/i);
    await user.click(symbolsToggle);

    expect(screen.getByText(/strong/i)).toBeInTheDocument();

    fireEvent.change(manualInput, { target: { value: '4' } });

    const uppercaseToggle = screen.getByLabelText(/include uppercase/i);
    const numbersToggle = screen.getByLabelText(/include numbers/i);
    await user.click(symbolsToggle);
    await user.click(uppercaseToggle);
    await user.click(numbersToggle);

    expect(screen.getByText(/weak/i)).toBeInTheDocument();
  });

  it('updates the strength badge when presets change', async () => {
    const user = userEvent.setup();
    render(<PasswordGenerator />);

    expect(screen.getByText(/medium/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /memorable/i }));

    expect(screen.getByText(/weak/i)).toBeInTheDocument();
  });

  it('writes the generated password to the clipboard', async () => {
    const user = userEvent.setup();
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    render(<PasswordGenerator />);

    await user.click(screen.getByRole('button', { name: /generate/i }));

    expect(passwordField().value).not.toEqual('');

    await user.click(screen.getByRole('button', { name: /copy/i }));

    expect(writeText).toHaveBeenCalledWith(passwordField().value);
    expect(screen.getByText(/copied!/i)).toBeInTheDocument();
  });
});
