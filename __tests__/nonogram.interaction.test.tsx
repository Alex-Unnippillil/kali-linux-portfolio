import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import Nonogram from '@apps/nonogram';

jest.mock('react-ga4', () => ({ event: jest.fn() }));

describe('nonogram interactions', () => {
  beforeEach(() => {
    (global.fetch as any) = jest.fn(() =>
      Promise.resolve({
        json: () =>
          Promise.resolve({
            width: 2,
            height: 1,
            rows: [[1]],
            cols: [[1], [1]],
            id: 'test',
          }),
      })
    );
    localStorage.clear();
  });

  test('supports pencil marks and highlights contradictions', async () => {
    render(<Nonogram />);
    let cells = await screen.findAllByRole('gridcell');
    fireEvent.click(screen.getByText('Pencil'));
    fireEvent.click(cells[0]);
    await waitFor(() => expect(cells[0]).toHaveTextContent('·'));

    fireEvent.click(screen.getByText('Fill'));
    cells = screen.getAllByRole('gridcell');
    fireEvent.click(cells[0]);
    fireEvent.click(cells[1]);

    await waitFor(() => expect(cells[0]).toHaveClass('bg-red-200'));
    await waitFor(() => expect(cells[1]).toHaveClass('bg-red-200'));
  });
});
