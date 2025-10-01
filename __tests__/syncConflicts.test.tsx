import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import SyncConflictManager from '../components/common/SyncConflictManager';
import usePersistentState from '../hooks/usePersistentState';
import {
  clearGistRecord,
  setGistBaseline,
  syncGistContent,
  updateLocalGistContent,
  getGistContent,
} from '../utils/gistSync';

interface HarnessProps {
  onReady?: (setter: (value: string) => void) => void;
}

const PersistentHarness: React.FC<HarnessProps> = ({ onReady }) => {
  const [value, setValue] = usePersistentState<string>('conflict-key', 'base');
  React.useEffect(() => {
    onReady?.(setValue);
  }, [onReady, setValue]);
  return (
    <div>
      <div data-testid="snapshot-value">{value}</div>
      <button type="button" onClick={() => setValue('local change')}>
        local
      </button>
    </div>
  );
};

describe('sync conflict handling', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('resolves snapshot conflict from storage events', async () => {
    localStorage.setItem('conflict-key', JSON.stringify('base'));

    let applyState: ((value: string) => void) | null = null;

    render(
      <>
        <PersistentHarness onReady={(setter) => {
          applyState = setter;
        }} />
        <SyncConflictManager />
      </>,
    );

    const user = userEvent.setup();

    await user.click(screen.getByText('local'));

    await act(async () => {
      window.dispatchEvent(
        new CustomEvent('snapshot-sync-conflict', {
          detail: {
            key: 'conflict-key',
            base: JSON.stringify('base'),
            local: JSON.stringify('local change'),
            incoming: JSON.stringify('incoming change'),
            apply: (merged: string) => {
              const parsed = JSON.parse(merged);
              applyState?.(parsed);
              localStorage.setItem('conflict-key', merged);
            },
          },
        }),
      );
    });

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeInTheDocument();

    await user.click(
      screen.getAllByLabelText('Accept incoming change')[0],
    );
    await user.click(
      screen.getByRole('button', { name: /Apply resolution/i }),
    );

    await waitFor(() =>
      expect(screen.getByTestId('snapshot-value').textContent).toBe(
        'incoming change',
      ),
    );

    expect(localStorage.getItem('conflict-key')).toContain('incoming change');
  });

  test('resolves gist conflicts through dialog', async () => {
    clearGistRecord('demo');
    setGistBaseline('demo', JSON.stringify({ code: 'base' }, null, 2));
    updateLocalGistContent('demo', JSON.stringify({ code: 'local' }, null, 2));

    render(<SyncConflictManager />);

    const user = userEvent.setup();

    let pending: Promise<string> = Promise.resolve('');
    await act(async () => {
      pending = syncGistContent({
        id: 'demo',
        incomingContent: JSON.stringify({ code: 'remote' }, null, 2),
        metadata: { test: true },
      });
    });

    await user.click(await screen.findByLabelText('Keep current value'));
    await user.click(
      screen.getByRole('button', { name: /Apply resolution/i }),
    );

    await expect(pending).resolves.toContain('local');
    expect(getGistContent('demo')).toContain('local');
  });
});

