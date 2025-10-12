import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';

import PasswordGenerator from '../apps/password_generator';

describe('PasswordGenerator', () => {
  const originalClipboard = navigator.clipboard;
  let writeTextMock: jest.Mock;

  beforeEach(() => {
    writeTextMock = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: writeTextMock,
      },
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    if (originalClipboard) {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: originalClipboard,
      });
    } else {
      delete (navigator as { clipboard?: unknown }).clipboard;
    }
  });

  it('recalculates strength when entropy thresholds change', async () => {
    render(<PasswordGenerator />);

    const uppercaseToggle = screen.getByLabelText('Include uppercase characters');
    const numbersToggle = screen.getByLabelText('Include numbers');
    const symbolsToggle = screen.getByLabelText('Include symbols');
    const manualEntry = screen.getByLabelText('Manual entry') as HTMLInputElement;

    await waitFor(() => expect(screen.getByText('Guarded')).toBeInTheDocument());

    fireEvent.click(uppercaseToggle);
    fireEvent.click(numbersToggle);
    fireEvent.change(manualEntry, { target: { value: '4' } });

    await waitFor(() => expect(screen.getByText('Weak')).toBeInTheDocument());

    fireEvent.click(uppercaseToggle);
    fireEvent.change(manualEntry, { target: { value: '12' } });

    await waitFor(() => expect(screen.getByText('Guarded')).toBeInTheDocument());

    fireEvent.click(numbersToggle);
    fireEvent.click(symbolsToggle);
    fireEvent.change(manualEntry, { target: { value: '20' } });

    await waitFor(() => expect(screen.getByText('Strong')).toBeInTheDocument());
  });

  it('copies the generated password to the clipboard', async () => {
    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.42);

    render(<PasswordGenerator />);

    fireEvent.click(screen.getByRole('button', { name: /generate/i }));

    const passwordField = screen.getByLabelText('Generated password') as HTMLInputElement;
    expect(passwordField.value).not.toEqual('');

    fireEvent.click(screen.getByRole('button', { name: /copy/i }));

    await waitFor(() => expect(writeTextMock).toHaveBeenCalledWith(passwordField.value));
    await waitFor(() => expect(screen.getByText('Copied!')).toBeInTheDocument());

    randomSpy.mockRestore();
  });
});

