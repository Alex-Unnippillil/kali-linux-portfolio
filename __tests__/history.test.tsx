import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { CSSProperties, Key, ReactElement, ReactNode } from 'react';

jest.mock('react-virtualized-auto-sizer', () => ({
  __esModule: true,
  default: function AutoSizerMock({
    children,
  }: {
    children: (size: { width: number; height: number }) => ReactNode;
  }) {
    return children({ width: 800, height: 600 });
  },
}));

jest.mock('react-window', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const React = require('react');
  return {
    FixedSizeList: ({
      itemCount,
      itemData,
      itemKey,
      children,
    }: {
      itemCount: number;
      itemData: any;
      itemKey?: (index: number, data: any) => Key;
      children: ({
        index,
        style,
        data,
      }: {
        index: number;
        style: CSSProperties;
        data: any;
      }) => ReactElement;
    }) => (
      <div data-testid="virtual-list">
        {Array.from({ length: itemCount }).map((_, index) => {
          const element = children({ index, style: {}, data: itemData });
          const key =
            typeof itemKey === 'function'
              ? itemKey(index, itemData)
              : element.key ?? index;
          return React.cloneElement(element, { key });
        })}
      </div>
    ),
  };
});

import HistoryApp from '../apps/history';

const JOURNAL_KEY = 'desktop-journal';

beforeEach(() => {
  localStorage.clear();
});

function setJournal(entries: unknown[]) {
  localStorage.setItem(JOURNAL_KEY, JSON.stringify(entries));
}

describe('History app', () => {
  it('filters entries by app and status', async () => {
    setJournal([
      {
        id: '1',
        appId: 'terminal',
        appName: 'Terminal',
        status: 'success',
        message: 'Command executed',
        timestamp: Date.UTC(2024, 0, 1, 12, 0, 0),
      },
      {
        id: '2',
        appId: 'terminal',
        appName: 'Terminal',
        status: 'error',
        message: 'Command failed',
        timestamp: Date.UTC(2024, 0, 1, 12, 5, 0),
      },
      {
        id: '3',
        appId: 'calculator',
        appName: 'Calculator',
        status: 'info',
        message: 'Calculated 2 + 2',
        timestamp: Date.UTC(2024, 0, 1, 12, 10, 0),
      },
    ]);

    render(<HistoryApp />);

    expect(await screen.findByText('Command executed')).toBeInTheDocument();
    expect(screen.getByText('Calculated 2 + 2')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('App'), {
      target: { value: 'terminal' },
    });

    await waitFor(() => {
      expect(screen.queryByText('Calculated 2 + 2')).not.toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Status'), {
      target: { value: 'error' },
    });

    await waitFor(() => {
      expect(screen.getByText('Command failed')).toBeInTheDocument();
      expect(screen.queryByText('Command executed')).not.toBeInTheDocument();
    });
  });

  it('renders timestamps in UTC format', async () => {
    setJournal([
      {
        id: 'ts-entry',
        appId: 'terminal',
        appName: 'Terminal',
        status: 'success',
        message: 'Ran uptime',
        timestamp: Date.UTC(2024, 2, 5, 9, 30, 45),
      },
    ]);

    render(<HistoryApp />);

    expect(await screen.findByTestId('history-timestamp')).toHaveTextContent(
      '2024-03-05 09:30:45 UTC',
    );
  });

  it('clears history after confirmation', async () => {
    setJournal([
      {
        id: 'a',
        appId: 'terminal',
        appName: 'Terminal',
        status: 'info',
        message: 'Session opened',
        timestamp: Date.UTC(2024, 0, 1, 10, 0, 0),
      },
    ]);

    render(<HistoryApp />);

    fireEvent.click(await screen.findByRole('button', { name: /clear history/i }));

    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toHaveTextContent('Clear history?');

    fireEvent.click(within(dialog).getByRole('button', { name: 'Clear' }));

    await waitFor(() => {
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });

    expect(localStorage.getItem(JOURNAL_KEY)).toBeNull();
    expect(
      screen.getByText(
        'No history yet. Interact with desktop apps to populate the journal.',
      ),
    ).toBeInTheDocument();
  });
});
