import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

jest.mock('../utils/analytics', () => ({ logEvent: jest.fn() }));

import SnapshotControls from '../components/base/SnapshotControls';
import {
  SnapshotData,
  clearAllSnapshots,
} from '../utils/appSnapshots';
import { logEvent } from '../utils/analytics';

describe('SnapshotControls', () => {
  const captured: SnapshotData = {
    fields: [
      { key: 'input', kind: 'text', value: 'value', selector: '[name="input"]' },
    ],
    results: [{ key: 'result', value: '42' }],
    payload: { note: 'demo' },
  };

  beforeEach(() => {
    clearAllSnapshots();
    localStorage.clear();
    jest.clearAllMocks();
  });

  it('creates, lists, restores, and deletes snapshots', async () => {
    const capture = jest.fn().mockResolvedValue(captured);
    const restore = jest.fn();
    const user = userEvent.setup();

    render(
      <SnapshotControls
        appId="ui-app"
        title="UI App"
        capture={capture}
        restore={restore}
      />,
    );

    const trigger = screen.getByRole('button', { name: /manage snapshots/i });
    await user.click(trigger);

    const nameInput = screen.getByLabelText(/name/i);
    const notesInput = screen.getByLabelText(/notes/i);
    await user.type(nameInput, 'Baseline state');
    await user.type(notesInput, 'before edits');

    const saveButton = screen.getByRole('button', { name: /save snapshot/i });
    await user.click(saveButton);

    expect(capture).toHaveBeenCalledTimes(1);

    const summary = await screen.findByTestId('snapshot-summary');
    expect(summary.textContent).toMatch(/Last captured/);

    const listItem = await screen.findByText('Baseline state');
    const container = listItem.closest('li');
    expect(container).not.toBeNull();

    const restoreButton = within(container as HTMLElement).getByRole('button', { name: /restore/i });
    await user.click(restoreButton);
    expect(restore).toHaveBeenCalledTimes(1);
    expect(restore.mock.calls[0][0].data.fields[0].value).toBe('value');

    await user.click(trigger);

    const refreshedItem = await screen.findByText('Baseline state');
    const refreshedContainer = refreshedItem.closest('li');
    expect(refreshedContainer).not.toBeNull();

    const deleteButton = within(refreshedContainer as HTMLElement).getByRole('button', { name: /delete/i });
    await user.click(deleteButton);
    expect(screen.queryByText('Baseline state')).not.toBeInTheDocument();
    expect(await screen.findByText(/snapshots will appear/i)).toBeInTheDocument();

    expect(logEvent).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'Snapshot', action: 'create' }),
    );
    expect(logEvent).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'Snapshot', action: 'restore' }),
    );
    expect(logEvent).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'Snapshot', action: 'delete' }),
    );
  });
});
