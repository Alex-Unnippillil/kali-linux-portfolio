import { RenderResult, act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import DataRetentionPanel from '../components/common/DataRetentionPanel';
import TasksManagerProvider from '../components/common/TasksManager';
import DataRetentionProvider from '../components/common/DataRetentionProvider';
import { DAY_MS } from '../utils/dataRetention';

describe('DataRetentionPanel', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  const renderPanel = async (): Promise<RenderResult> => {
    let rendered: RenderResult | null = null;
    await act(async () => {
      rendered = render(
        <TasksManagerProvider>
          <DataRetentionProvider>
            <DataRetentionPanel />
          </DataRetentionProvider>
        </TasksManagerProvider>,
      );
    });
    return rendered!;
  };

  test('manual purge removes expired trash and supports undo', async () => {
    const now = Date.now();
    const stale = { id: 'old', title: 'Old', closedAt: now - 20 * DAY_MS };
    const fresh = { id: 'new', title: 'New', closedAt: now - 2 * DAY_MS };
    localStorage.setItem('window-trash', JSON.stringify([stale, fresh]));

    await renderPanel();
    act(() => {
      jest.runOnlyPendingTimers();
    });

    const select = await screen.findByLabelText('Retention TTL for Trash Bin');
    act(() => {
      fireEvent.change(select, { target: { value: String(7 * DAY_MS) } });
    });

    const purgeButton = screen.getByRole('button', { name: /Run purge now/i });
    act(() => {
      fireEvent.click(purgeButton);
    });

    await waitFor(() => {
      expect(screen.getByText(/Last purge/)).toBeInTheDocument();
    });

    const remaining = JSON.parse(localStorage.getItem('window-trash') || '[]');
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe('new');

    const undoButton = screen.getByRole('button', { name: /Undo purge/i });
    act(() => {
      fireEvent.click(undoButton);
    });

    await waitFor(() => {
      const restored = JSON.parse(localStorage.getItem('window-trash') || '[]');
      expect(restored).toHaveLength(2);
    });

    expect(screen.getByText(/Recent retention activity/)).toBeInTheDocument();
  });
});
