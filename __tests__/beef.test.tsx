import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Beef from '../components/apps/beef';

const dismissGuide = () => {
  const closeGuide = screen.queryByRole('button', { name: /close/i });
  if (closeGuide) {
    fireEvent.click(closeGuide);
  }
};

describe('BeEF app', () => {
  test('advances through lab steps to payload builder', () => {
    render(<Beef />);
    dismissGuide();

    fireEvent.click(screen.getByRole('button', { name: /begin/i }));
    // move through sandbox, simulated hook and demo module steps
    fireEvent.click(screen.getByRole('button', { name: /^next$/i }));
    fireEvent.click(screen.getByRole('button', { name: /^next$/i }));
    fireEvent.click(screen.getByRole('button', { name: /^next$/i }));

    expect(screen.getByText(/Payload Builder/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Payloads run locally in a sandbox and never touch the network./i)
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /copy/i })).toBeInTheDocument();
  });

  test('runs deterministic demo modules and records log output', () => {
    render(<Beef />);
    dismissGuide();

    fireEvent.click(screen.getByRole('button', { name: /begin/i }));
    fireEvent.click(screen.getByRole('button', { name: /^next$/i }));
    fireEvent.click(screen.getByRole('button', { name: /^next$/i }));

    expect(screen.getByText(/Run Demo Module/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/module/i), {
      target: { value: 'detect-plugins' },
    });
    fireEvent.click(screen.getByRole('button', { name: /run module/i }));

    expect(screen.getByText(/ran against local demo state only/i)).toBeInTheDocument();
    expect(screen.getByText(/Hook \/ Module Graph/i)).toBeInTheDocument();
  });

  test('can reset lab back to disclaimer', () => {
    render(<Beef />);
    dismissGuide();

    fireEvent.click(screen.getByRole('button', { name: /begin/i }));
    // advance to final step
    for (let i = 0; i < 4; i += 1) {
      fireEvent.click(screen.getByRole('button', { name: /^next$/i }));
    }
    fireEvent.click(screen.getByRole('button', { name: /reset lab/i }));
    expect(screen.getByText(/Disclaimer/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Use these security tools only in environments where you have explicit authorization./i)
    ).toBeInTheDocument();
  });
});
