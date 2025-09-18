import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProgressBar from '../components/base/ProgressBar';

describe('ProgressBar', () => {
  it('renders multi-step progress with ETA', () => {
    render(
      <ProgressBar
        progress={42}
        label="Downloading"
        metadata={{
          step: { current: 2, total: 3, label: 'Copying data' },
          detail: '21 MB of 50 MB',
          etaSeconds: 75,
        }}
      />,
    );
    expect(screen.getByText('Downloading')).toBeInTheDocument();
    expect(
      screen.getByText('Step 2 of 3 – Copying data'),
    ).toBeInTheDocument();
    expect(screen.getByText('21 MB of 50 MB')).toBeInTheDocument();
    expect(screen.getByText('ETA 1m 15s')).toBeInTheDocument();
    expect(screen.getByText('42%')).toBeInTheDocument();
  });

  it('shows fallback message when ETA unavailable', () => {
    render(
      <ProgressBar
        progress={10}
        metadata={{
          step: { current: 1, total: 2 },
          etaSeconds: null,
        }}
      />,
    );
    expect(screen.getByText('Step 1 of 2')).toBeInTheDocument();
    expect(screen.getByText('ETA pending')).toBeInTheDocument();
  });
});
