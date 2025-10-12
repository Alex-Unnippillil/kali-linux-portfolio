import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import useBlackjackPersistence, {
  DEFAULT_BANKROLL,
  BANKROLL_STORAGE_KEY,
  HIGH_SCORE_STORAGE_KEY,
  MUTED_STORAGE_KEY,
} from '../components/apps/blackjack/usePersistence';

describe('useBlackjackPersistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const TestComponent = () => {
    const { bankroll, setBankroll, highScore, recordHighScore, resetProgress, muted, setMuted } =
      useBlackjackPersistence();

    return (
      <div>
        <div data-testid="bankroll">{bankroll}</div>
        <div data-testid="high">{highScore}</div>
        <div data-testid="muted">{muted ? 'muted' : 'sound'}</div>
        <button type="button" onClick={() => setBankroll(1200)}>
          set-bankroll
        </button>
        <button type="button" onClick={() => recordHighScore(1200)}>
          record-high
        </button>
        <button type="button" onClick={() => recordHighScore(900)}>
          lower-high
        </button>
        <button type="button" onClick={resetProgress}>
          reset
        </button>
        <button type="button" onClick={() => setMuted(true)}>
          mute
        </button>
      </div>
    );
  };

  it('persists bankroll, high score, and mute state', async () => {
    const user = userEvent.setup();
    render(<TestComponent />);

    expect(screen.getByTestId('bankroll').textContent).toBe(String(DEFAULT_BANKROLL));
    expect(screen.getByTestId('high').textContent).toBe(String(DEFAULT_BANKROLL));

    await user.click(screen.getByText('set-bankroll'));
    expect(screen.getByTestId('bankroll').textContent).toBe('1200');
    expect(localStorage.getItem(BANKROLL_STORAGE_KEY)).toBe('1200');

    await user.click(screen.getByText('record-high'));
    expect(screen.getByTestId('high').textContent).toBe('1200');
    expect(localStorage.getItem(HIGH_SCORE_STORAGE_KEY)).toBe('1200');

    await user.click(screen.getByText('lower-high'));
    expect(screen.getByTestId('high').textContent).toBe('1200');

    await user.click(screen.getByText('mute'));
    expect(screen.getByTestId('muted').textContent).toBe('muted');
    expect(localStorage.getItem(MUTED_STORAGE_KEY)).toBe('true');

    await user.click(screen.getByText('reset'));
    expect(screen.getByTestId('bankroll').textContent).toBe(String(DEFAULT_BANKROLL));
    expect(screen.getByTestId('high').textContent).toBe(String(DEFAULT_BANKROLL));
  });
});
