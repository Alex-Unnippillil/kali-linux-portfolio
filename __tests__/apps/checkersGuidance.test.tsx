import React from 'react';
import { render, screen } from '@testing-library/react';
import CheckersPage from '../../apps/checkers';

class MockWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  // eslint-disable-next-line class-methods-use-this, @typescript-eslint/no-empty-function
  postMessage() {}
  // eslint-disable-next-line class-methods-use-this, @typescript-eslint/no-empty-function
  terminate() {}
}

describe('Checkers guidance panel', () => {
  beforeEach(() => {
    // @ts-ignore
    global.Worker = MockWorker;
  });

  afterEach(() => {
    // @ts-ignore
    delete global.Worker;
  });

  it('renders briefing copy and telemetry counters', () => {
    render(<CheckersPage />);

    expect(screen.getByText(/Match briefing/i)).toBeInTheDocument();
    expect(screen.getByText(/It's Red's move./i)).toBeInTheDocument();
    expect(screen.getByText(/Tap the Hint button/i)).toBeInTheDocument();
    expect(screen.getByText(/Forced capture is active/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Captures left/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Moves to draw/i).length).toBeGreaterThan(0);
  });
});
