import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ConnectFour from '../components/apps/connect-four';

beforeAll(() => {
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  // @ts-ignore
  global.ResizeObserver = ResizeObserverMock;
});

beforeEach(() => {
  window.localStorage.clear();
  window.localStorage.setItem('settings:quality', JSON.stringify(0));
  // @ts-ignore
  global.Worker = undefined;
});

describe('connect four app', () => {
  it('supports confirm move on touch-style flow', async () => {
    window.localStorage.setItem('connect_four:mode', JSON.stringify('local'));
    window.localStorage.setItem('connect_four:confirm_move', JSON.stringify(true));
    render(<ConnectFour />);

    await waitFor(() => expect(screen.getByText(/local match/i)).toBeInTheDocument());

    const col1 = screen.getByRole('button', { name: /column 1/i });
    fireEvent.click(col1);
    expect(screen.getByTestId('connect-four-cell-5-0')).toHaveAttribute('data-token', '');

    fireEvent.click(col1);
    expect(screen.getByTestId('connect-four-cell-5-0')).toHaveAttribute('data-token', 'red');
  });

  it('keyboard arrows and enter place a disc', async () => {
    window.localStorage.setItem('connect_four:mode', JSON.stringify('local'));
    render(<ConnectFour />);

    await waitFor(() => expect(screen.getByText(/local match/i)).toBeInTheDocument());

    const board = screen.getByLabelText(/connect four board/i);
    fireEvent.keyDown(board, { key: 'ArrowLeft' });
    fireEvent.keyDown(board, { key: 'Enter' });

    expect(screen.getByTestId('connect-four-cell-5-2')).toHaveAttribute('data-token', 'red');
  });

  it('best-of-3 match tracks winner and score', async () => {
    window.localStorage.setItem('connect_four:mode', JSON.stringify('local'));
    window.localStorage.setItem('connect_four:match_mode', JSON.stringify('best_of_3'));
    render(<ConnectFour />);

    await waitFor(() => expect(screen.getByText(/match:/i)).toBeInTheDocument());

    const col1 = screen.getByRole('button', { name: /column 1/i });
    const col2 = screen.getByRole('button', { name: /column 2/i });
    const col3 = screen.getByRole('button', { name: /column 3/i });
    const col4 = screen.getByRole('button', { name: /column 4/i });

    // red win #1
    fireEvent.click(col1); fireEvent.click(col1);
    fireEvent.click(col2); fireEvent.click(col2);
    fireEvent.click(col3); fireEvent.click(col3);
    fireEvent.click(col4);
    fireEvent.click(screen.getByRole('button', { name: /restart/i }));

    // red win #2
    fireEvent.click(col1); fireEvent.click(col1);
    fireEvent.click(col2); fireEvent.click(col2);
    fireEvent.click(col3); fireEvent.click(col3);
    fireEvent.click(col4);

    expect(screen.getByText(/match winner/i)).toBeInTheDocument();
  });

  it('cpu moves with worker fallback when Worker is unavailable', async () => {
    window.localStorage.setItem('connect_four:mode', JSON.stringify('cpu'));
    window.localStorage.setItem('connect_four:human_token', JSON.stringify('red'));
    window.localStorage.setItem('connect_four:confirm_move', JSON.stringify(false));
    render(<ConnectFour />);

    await waitFor(() => expect(screen.getByText(/you:/i)).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /column 1/i }));

    await waitFor(() => {
      expect(document.querySelectorAll('[data-token="yellow"]').length).toBeGreaterThan(0);
    });
  });

  it('uses worker when present and handles malformed response', async () => {
    class WorkerMock {
      private handler: ((event: MessageEvent) => void) | null = null;
      addEventListener(type: string, cb: any) {
        if (type === 'message') this.handler = cb;
      }
      removeEventListener() {}
      postMessage(payload: any) {
        setTimeout(() => {
          this.handler?.({ data: { taskId: payload.taskId, column: 'bad' } } as MessageEvent);
          this.handler?.({ data: { taskId: payload.taskId, column: 0 } } as MessageEvent);
        }, 5);
      }
      terminate() {}
    }
    // @ts-ignore
    global.Worker = WorkerMock;

    window.localStorage.setItem('connect_four:mode', JSON.stringify('cpu'));
    window.localStorage.setItem('connect_four:human_token', JSON.stringify('red'));
    window.localStorage.setItem('connect_four:confirm_move', JSON.stringify(false));
    render(<ConnectFour />);

    await waitFor(() => expect(screen.getByText(/you:/i)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /column 1/i }));

    await waitFor(() => {
      expect(document.querySelectorAll('[data-token="yellow"]').length).toBeGreaterThan(0);
    });
  });
});
