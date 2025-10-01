import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import ResultViewer from '../components/ResultViewer';

jest.mock('../utils/preheat', () => {
  const notifyInteraction = jest.fn();
  const scheduler = {
    schedule: jest.fn((task: () => void) => {
      task();
      return () => undefined;
    }),
    cancel: jest.fn(),
    cancelAll: jest.fn(),
    notifyInteraction,
    getBudget: jest.fn(() => 10),
    getStats: jest.fn(() => ({ tasksRun: 0, canceled: 0, pending: 0, lastINP: 0 })),
  };
  return {
    __esModule: true,
    default: scheduler,
    createPreheater: jest.fn(() => scheduler),
  };
});

import preheater from '../utils/preheat';

const schedulerMock = preheater as unknown as {
  schedule: jest.Mock;
  notifyInteraction: jest.Mock;
};

describe('ResultViewer preheating', () => {
  beforeEach(() => {
    schedulerMock.schedule.mockClear();
    schedulerMock.notifyInteraction.mockClear();
  });

  it('leverages idle preheating for cache hits', async () => {
    const data = [
      { id: 2, value: 20, label: 'Row Two' },
      { id: 1, value: 10, label: 'Row One' },
      { id: 3, value: 30, label: 'Row Three' },
    ];

    render(<ResultViewer data={data} />);

    const viewer = screen.getByLabelText('result viewer');
    expect(schedulerMock.schedule).toHaveBeenCalled();

    const parsedTab = screen.getByRole('tab', { name: /parsed/i });
    await act(async () => {
      fireEvent.click(parsedTab);
    });

    const filterInput = screen.getByLabelText('Filter rows');
    await act(async () => {
      fireEvent.pointerDown(filterInput);
      fireEvent.focus(filterInput);
      fireEvent.change(filterInput, { target: { value: 'row' } });
    });

    const sortButton = screen.getByRole('button', { name: /Sort by id/i });
    await act(async () => {
      fireEvent.pointerDown(sortButton);
      fireEvent.click(sortButton);
    });

    await waitFor(() => {
      const hits = Number(viewer.getAttribute('data-cache-hits'));
      const misses = Number(viewer.getAttribute('data-cache-misses'));
      expect(hits).toBeGreaterThan(misses);
    });
    await act(async () => {
      fireEvent.pointerDown(viewer);
    });
    expect(schedulerMock.notifyInteraction).toHaveBeenCalled();
  });
});
