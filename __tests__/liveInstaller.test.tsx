import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import LiveInstaller from '../components/apps/live-installer';

describe('LiveInstaller app', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders data-loss warnings and documentation links', () => {
    render(<LiveInstaller />);

    expect(screen.getByText(/Data loss warning/i)).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /official Kali USB installer guide/i }),
    ).toBeInTheDocument();
  });

  it('applies sensible defaults for device, persistence size, and filesystem', () => {
    render(<LiveInstaller />);

    const deviceRadio = screen.getByLabelText(/Portable SSD/i) as HTMLInputElement;
    expect(deviceRadio).toBeChecked();

    const nextButton = screen.getByRole('button', { name: /Next/i });
    fireEvent.click(nextButton);

    const slider = screen.getByRole('slider', { name: /Persistent storage size/i }) as HTMLInputElement;
    expect(slider.value).toBe('8');

    fireEvent.click(nextButton);

    const filesystemRadio = screen.getByLabelText(/ext4/i) as HTMLInputElement;
    expect(filesystemRadio).toBeChecked();
  });

  it('completes verification after a successful retry', async () => {
    jest.useFakeTimers();
    render(<LiveInstaller />);

    let nextButton = screen.getByRole('button', { name: /Next/i });
    fireEvent.click(nextButton);
    nextButton = screen.getByRole('button', { name: /Next/i });
    fireEvent.click(nextButton);

    const goToSimulationButton = screen.getByRole('button', { name: /Next/i });
    fireEvent.click(goToSimulationButton);

    const startSimulation = screen.getByRole('button', { name: /Start simulation/i });
    fireEvent.click(startSimulation);

    await act(async () => {
      jest.advanceTimersByTime(8000);
    });

    await screen.findByRole('button', { name: /Start verification/i });

    const startVerificationButton = screen.getByRole('button', { name: /Start verification/i });
    fireEvent.click(startVerificationButton);

    await act(async () => {
      jest.advanceTimersByTime(1500);
    });

    expect(screen.getByText(/Verification failed/i)).toBeInTheDocument();

    const retryButton = screen.getByRole('button', { name: /Retry verification/i });
    fireEvent.click(retryButton);

    await act(async () => {
      jest.advanceTimersByTime(1500);
    });

    expect(screen.getByText(/All checks passed/i)).toBeInTheDocument();
    const finishButton = screen.getByRole('button', { name: /Finish/i });
    expect(finishButton).not.toBeDisabled();
  });
});
