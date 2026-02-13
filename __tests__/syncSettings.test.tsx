import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import SyncSettings, { SyncTarget } from '../components/common/SyncSettings';
import {
  fetchGistSnapshot,
  updateGistSnapshot,
} from '../services/sync/gistClient';

jest.mock('../services/sync/gistClient', () => {
  const actual = jest.requireActual('../services/sync/gistClient');
  return {
    ...actual,
    fetchGistSnapshot: jest.fn(),
    updateGistSnapshot: jest.fn(),
  };
});

const fetchGistSnapshotMock = fetchGistSnapshot as jest.MockedFunction<
  typeof fetchGistSnapshot
>;
const updateGistSnapshotMock = updateGistSnapshot as jest.MockedFunction<
  typeof updateGistSnapshot
>;

describe('SyncSettings', () => {

  const createTarget = (overrides: Partial<SyncTarget> = {}): SyncTarget => ({
    id: 'settings',
    label: 'Settings JSON',
    gistFilename: 'settings.json',
    getLocalSnapshot: jest.fn().mockResolvedValue('{"theme":"dark"}'),
    applyRemoteSnapshot: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  });

  const renderComponent = (targets: SyncTarget[] = [createTarget()]) => {
    render(<SyncSettings targets={targets} />);
    fireEvent.change(screen.getByLabelText(/GitHub token/i), {
      target: { value: 'ghp_test' },
    });
    fireEvent.change(screen.getByLabelText(/Gist ID/i), {
      target: { value: 'gist123' },
    });
    return targets;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows diff preview before applying remote changes', async () => {
    const [target] = renderComponent();
    fetchGistSnapshotMock.mockResolvedValue({
      files: {
        'settings.json': {
          filename: 'settings.json',
          content: '{"theme":"light"}',
        },
      },
    });

    fireEvent.click(screen.getByRole('button', { name: /preview remote changes/i }));

    const diff = await screen.findByLabelText('Diff for Settings JSON');
    expect(diff.textContent).toContain('@@');
    expect(fetchGistSnapshotMock).toHaveBeenCalledWith({
      gistId: 'gist123',
      token: 'ghp_test',
    });
    expect((target.applyRemoteSnapshot as jest.Mock)).not.toHaveBeenCalled();

    await waitFor(() => expect(screen.getByRole('button', { name: /apply remote changes/i })).not.toBeDisabled());

    fireEvent.click(screen.getByRole('button', { name: /apply remote changes/i }));

    await waitFor(() =>
      expect(target.applyRemoteSnapshot as jest.Mock).toHaveBeenCalledWith('{"theme":"light"}')
    );
  });

  it('pushes selected targets to the gist', async () => {
    renderComponent();
    updateGistSnapshotMock.mockResolvedValue(undefined);

    fireEvent.click(screen.getByRole('button', { name: /push local changes/i }));

    await waitFor(() => expect(updateGistSnapshotMock).toHaveBeenCalledTimes(1));
    expect(updateGistSnapshotMock).toHaveBeenCalledWith({
      gistId: 'gist123',
      token: 'ghp_test',
      files: {
        'settings.json': { content: '{"theme":"dark"}' },
      },
    });
    expect(fetchGistSnapshotMock).not.toHaveBeenCalled();
  });

  it('surfaces errors from the Gist API during preview', async () => {
    renderComponent();
    fetchGistSnapshotMock.mockRejectedValue(new Error('No access'));

    fireEvent.click(screen.getByRole('button', { name: /preview remote changes/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('No access');
  });
});
