import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import JohnApp from '../apps/john';

describe('JohnApp', () => {
  it('renders mode cards with descriptions and example commands', () => {
    render(<JohnApp />);

    expect(
      screen.getByText(
        'Point John at a known candidate to validate a password quickly.'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText('john --format=raw-md5 --single sample.hash')
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Generate short keyspaces in memory for a classroom-safe brute-force.'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText('john --incremental=Lower demo.hash')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Replay curated workshop lists to simulate fast cracks.')
    ).toBeInTheDocument();
    expect(
      screen.getByText('john --wordlist=training.txt --format=raw-md5 demo.hash')
    ).toBeInTheDocument();

    expect(screen.getByText('Cracked hashes')).toBeInTheDocument();
    expect(screen.getByText('Average speed')).toBeInTheDocument();
    expect(screen.getByText('Hints remaining')).toBeInTheDocument();
  });

  it('runs the simulated cracking workflow when Start is pressed', async () => {
    jest.useFakeTimers();

    render(<JohnApp />);
    const startButton = screen.getByRole('button', { name: 'Start' });

    fireEvent.click(startButton);
    expect(startButton).toBeDisabled();

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    await waitFor(() => {
      expect(screen.getByText('Some hashes failed to crack.')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(startButton).not.toBeDisabled();
    });

    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });
});
