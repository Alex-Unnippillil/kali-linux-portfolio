import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import SnapshotManager from '../../../components/apps/snapshot-manager';
import { Desktop } from '../../../components/screen/desktop';
import {
  resetSnapshotStore,
  triggerPreUpdateHooks,
} from '../../../utils/snapshotStore';

jest.mock('react-ga4', () => ({ event: jest.fn(), send: jest.fn() }));

jest.mock('../../../utils/snapshotStore', () => {
  const actual = jest.requireActual('../../../utils/snapshotStore');
  return {
    ...actual,
    triggerPreUpdateHooks: jest.fn((event) => actual.triggerPreUpdateHooks(event)),
  };
});

describe('Snapshot Manager', () => {
  beforeEach(() => {
    resetSnapshotStore();
  });

  it('creates snapshots through the UI', async () => {
    await act(async () => {
      render(<SnapshotManager />);
    });

    expect(screen.getByText('Baseline install')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Name this snapshot'), {
      target: { value: 'Manual snapshot' },
    });
    fireEvent.click(screen.getByRole('button', { name: /create snapshot/i }));

    expect(await screen.findByText('Manual snapshot')).toBeInTheDocument();
  });

  it('warns about open files before rolling back', async () => {
    await act(async () => {
      render(<SnapshotManager />);
    });

    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);

    fireEvent.click(screen.getAllByRole('button', { name: /rollback/i })[0]);

    expect(confirmSpy).toHaveBeenCalled();
    const message = confirmSpy.mock.calls[0]?.[0] as string;
    expect(message).toContain('Open files flagged for closure');
    expect(message).toContain('incident-response.md');
    expect(message).toContain('Target completion under 2 minutes');
    confirmSpy.mockRestore();

    expect(
      screen.getByText(/Rollback in progress for/i),
    ).toBeInTheDocument();

    expect(
      await screen.findByText(/Rollback complete for/i, {}, { timeout: 5000 }),
    ).toBeInTheDocument();
  });

  it('invokes pre-update hooks when desktop opens plugin manager', () => {
    const desktop = new Desktop();
    jest.spyOn(desktop, 'setState').mockImplementation(() => {});
    jest.spyOn(desktop, 'focus').mockImplementation(() => {});
    jest.spyOn(desktop, 'saveSession').mockImplementation(() => {});
    (triggerPreUpdateHooks as jest.Mock).mockClear();

    desktop.openApp('plugin-manager');

    expect(triggerPreUpdateHooks).toHaveBeenCalledWith({
      type: 'open-app',
      appId: 'plugin-manager',
    });
  });
});
