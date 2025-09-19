import { render, screen, waitFor } from '@testing-library/react';
import React, { useEffect } from 'react';
import KillSwitchGate from '../components/common/KillSwitchGate';
import { KILL_SWITCH_IDS } from '../lib/flags';

describe('KillSwitchGate', () => {
  const originalHydra = process.env.NEXT_PUBLIC_KILL_HYDRA;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    if (originalHydra === undefined) {
      delete process.env.NEXT_PUBLIC_KILL_HYDRA;
    } else {
      process.env.NEXT_PUBLIC_KILL_HYDRA = originalHydra;
    }
  });

  it('renders children when the kill switch is inactive', async () => {
    delete process.env.NEXT_PUBLIC_KILL_HYDRA;
    const workerSpy = jest.fn();

    function WorkerComponent() {
      useEffect(() => {
        workerSpy();
      }, []);
      return <div>Hydra simulation</div>;
    }

    render(
      <KillSwitchGate
        appId="hydra"
        appTitle="Hydra"
        killSwitchId={KILL_SWITCH_IDS.hydra}
      >
        {() => <WorkerComponent />}
      </KillSwitchGate>,
    );

    await waitFor(() => {
      expect(workerSpy).toHaveBeenCalled();
    });

    expect(screen.getByText('Hydra simulation')).toBeInTheDocument();
    expect(screen.queryByText('Hydra is temporarily disabled')).not.toBeInTheDocument();
  });

  it('shows maintenance stub and prevents worker start when the kill switch is active', async () => {
    process.env.NEXT_PUBLIC_KILL_HYDRA = 'true';
    const workerSpy = jest.fn();

    function WorkerComponent() {
      useEffect(() => {
        workerSpy();
      }, []);
      return <div>Hydra simulation</div>;
    }

    render(
      <KillSwitchGate
        appId="hydra"
        appTitle="Hydra"
        killSwitchId={KILL_SWITCH_IDS.hydra}
      >
        {() => <WorkerComponent />}
      </KillSwitchGate>,
    );

    await waitFor(() => {
      expect(screen.getByText('Hydra is temporarily disabled')).toBeInTheDocument();
    });

    expect(workerSpy).not.toHaveBeenCalled();
    expect(
      screen.getByText(
        'Hydra brute-force simulator is paused while credential policies are audited.',
      ),
    ).toBeInTheDocument();
    const link = screen.getByRole('link', { name: 'View incident log' });
    expect(link).toHaveAttribute('href', expect.stringContaining('#hydra'));
  });
});
