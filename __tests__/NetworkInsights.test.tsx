import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import NetworkInsights from '../apps/resource-monitor/components/NetworkInsights';

import type { FetchEntry } from '../lib/fetchProxy';

const mockOnFetchProxy = jest.fn();
const mockGetActiveFetches = jest.fn();
const mockExportMetrics = jest.fn();

let historySeed: FetchEntry[] = [];

jest.mock('../lib/fetchProxy', () => ({
  __esModule: true,
  getActiveFetches: (...args: unknown[]) => mockGetActiveFetches(...args),
  onFetchProxy: (...args: unknown[]) => mockOnFetchProxy(...args),
}));

jest.mock('../apps/resource-monitor/export', () => ({
  __esModule: true,
  exportMetrics: (...args: unknown[]) => mockExportMetrics(...args),
}));

jest.mock('../hooks/usePersistentState', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: jest.fn(() => {
      const [state, setState] = React.useState(historySeed);
      const clear = jest.fn(() => setState([]));
      return [state, setState, jest.fn(), clear] as const;
    }),
  };
});

describe('NetworkInsights', () => {
  beforeEach(() => {
    historySeed = [];
    mockGetActiveFetches.mockReset();
    mockOnFetchProxy.mockReset();
    mockExportMetrics.mockReset();
    mockGetActiveFetches.mockReturnValue([]);
    mockOnFetchProxy.mockReturnValue(() => {});
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('shows a success badge after exporting metrics', () => {
    historySeed = [
      {
        id: 1,
        url: '/api/demo',
        method: 'GET',
        startTime: 0,
        duration: 120,
        status: 200,
      },
    ];

    render(<NetworkInsights />);

    fireEvent.click(screen.getByRole('button', { name: /export/i }));

    expect(mockExportMetrics).toHaveBeenCalledTimes(1);
    const exported = mockExportMetrics.mock.calls[0][0] as FetchEntry[];
    expect(exported).toHaveLength(historySeed.length);
    expect(exported[0]).toMatchObject(historySeed[0]);
    expect(screen.getByText(/metrics exported/i)).toBeInTheDocument();
  });

  it('filters the history list by method and status', () => {
    historySeed = [
      {
        id: 1,
        url: '/api/users',
        method: 'GET',
        startTime: 0,
        duration: 80,
        status: 200,
      },
      {
        id: 2,
        url: '/api/users',
        method: 'POST',
        startTime: 10,
        duration: 150,
        status: 201,
      },
      {
        id: 3,
        url: '/api/users/123',
        method: 'DELETE',
        startTime: 20,
        duration: 90,
        status: 404,
      },
    ];

    render(<NetworkInsights />);

    const methodSelect = screen.getByLabelText(/method/i);
    const statusSelect = screen.getByLabelText(/status/i);

    expect(screen.getAllByTestId('history-item')).toHaveLength(3);

    fireEvent.change(methodSelect, { target: { value: 'POST' } });
    let items = screen.getAllByTestId('history-item');
    expect(items).toHaveLength(1);
    expect(items[0]).toHaveTextContent('POST');

    fireEvent.change(methodSelect, { target: { value: 'all' } });
    fireEvent.change(statusSelect, { target: { value: '404' } });
    items = screen.getAllByTestId('history-item');
    expect(items).toHaveLength(1);
    expect(items[0]).toHaveTextContent('404');

    fireEvent.change(methodSelect, { target: { value: 'POST' } });
    expect(screen.queryAllByTestId('history-item')).toHaveLength(0);
    expect(screen.getByText(/no requests match/i)).toBeInTheDocument();
  });
});
