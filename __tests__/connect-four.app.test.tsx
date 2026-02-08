import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ConnectFour from '../components/apps/connect-four';

beforeAll(() => {
  class ResizeObserverMock {
    observe() { }
    unobserve() { }
    disconnect() { }
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
  it('drops a disc in the correct cell', async () => {
    window.localStorage.setItem('connect_four:mode', JSON.stringify('local'));
    render(<ConnectFour />);

    await waitFor(() => {
      expect(screen.getByText(/local match/i)).toBeInTheDocument();
    });

    const columnButton = screen.getByRole('button', { name: /column 1/i });
    fireEvent.click(columnButton);

    const cell = screen.getByTestId('connect-four-cell-5-0');
    expect(cell).toHaveAttribute('data-token', 'red');
  });

  it('detects a win and updates the status', async () => {
    window.localStorage.setItem('connect_four:mode', JSON.stringify('local'));
    render(<ConnectFour />);

    await waitFor(() => {
      expect(screen.getByText(/local match/i)).toBeInTheDocument();
    });

    const col1 = screen.getByRole('button', { name: /column 1/i });
    const col2 = screen.getByRole('button', { name: /column 2/i });
    const col3 = screen.getByRole('button', { name: /column 3/i });
    const col4 = screen.getByRole('button', { name: /column 4/i });

    fireEvent.click(col1); // red
    fireEvent.click(col1); // yellow
    fireEvent.click(col2); // red
    fireEvent.click(col2); // yellow
    fireEvent.click(col3); // red
    fireEvent.click(col3); // yellow
    fireEvent.click(col4); // red wins

    expect(screen.getAllByText(/wins\./i).length).toBeGreaterThan(0);
  });

  it('undo restores the previous state', async () => {
    window.localStorage.setItem('connect_four:mode', JSON.stringify('local'));
    render(<ConnectFour />);

    await waitFor(() => {
      expect(screen.getByText(/local match/i)).toBeInTheDocument();
    });

    const col1 = screen.getByRole('button', { name: /column 1/i });
    const col2 = screen.getByRole('button', { name: /column 2/i });

    fireEvent.click(col1);
    fireEvent.click(col2);

    fireEvent.click(screen.getByRole('button', { name: /undo/i }));

    const cell = screen.getByTestId('connect-four-cell-5-1');
    expect(cell).toHaveAttribute('data-token', '');
  });

  it('CPU move arrives after the player move', async () => {
    window.localStorage.setItem('connect_four:mode', JSON.stringify('cpu'));
    window.localStorage.setItem('connect_four:human_token', JSON.stringify('red'));
    window.localStorage.setItem('connect_four:human_starts', JSON.stringify(true));
    window.localStorage.setItem('settings:difficulty', JSON.stringify('easy'));

    render(<ConnectFour />);

    await waitFor(() => {
      expect(screen.getByText(/You:/i)).toBeInTheDocument();
    });

    const columnButton = screen.getByRole('button', { name: /column 1/i });
    fireEvent.click(columnButton);

    const before = document.querySelectorAll('[data-token="yellow"]');
    expect(before.length).toBe(0);

    await waitFor(() => {
      const after = document.querySelectorAll('[data-token="yellow"]');
      expect(after.length).toBeGreaterThan(0);
    }, { timeout: 5000 });
  });
});
