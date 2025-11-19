import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PasswordStrength from '../../../apps/crypto-toolkit/components/PasswordStrength';

describe('PasswordStrength component', () => {
  it('updates entropy and guess metrics on every keystroke within 50ms', async () => {
    const user = userEvent.setup();
    render(<PasswordStrength />);

    const input = screen.getByTestId('password-input') as HTMLInputElement;

    await user.type(input, 'a');
    const firstEntropy = parseFloat(screen.getByTestId('entropy-value').getAttribute('data-raw') ?? '0');
    const firstGuesses = parseFloat(screen.getByTestId('guesses-value').getAttribute('data-raw') ?? '0');

    await user.type(input, 'b');
    const secondEntropy = parseFloat(screen.getByTestId('entropy-value').getAttribute('data-raw') ?? '0');
    const secondGuesses = parseFloat(screen.getByTestId('guesses-value').getAttribute('data-raw') ?? '0');

    await user.type(input, 'c');
    const thirdEntropy = parseFloat(screen.getByTestId('entropy-value').getAttribute('data-raw') ?? '0');
    const thirdGuesses = parseFloat(screen.getByTestId('guesses-value').getAttribute('data-raw') ?? '0');

    expect(firstEntropy).toBeGreaterThanOrEqual(0);
    expect(secondEntropy).not.toBe(firstEntropy);
    expect(thirdEntropy).not.toBe(secondEntropy);

    expect(firstGuesses).toBeGreaterThanOrEqual(0);
    expect(secondGuesses).not.toBe(firstGuesses);
    expect(thirdGuesses).not.toBe(secondGuesses);

    const analysisRuntime = parseFloat(screen.getByTestId('analysis-time').getAttribute('data-raw') ?? '0');
    expect(analysisRuntime).toBeLessThan(50);
  });

  it('never performs network fetches during analysis', async () => {
    const user = userEvent.setup();
    const fetchSpy = jest.spyOn(global, 'fetch');

    render(<PasswordStrength />);

    const input = screen.getByTestId('password-input') as HTMLInputElement;
    await user.type(input, 'Complex#Pass123!');

    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
