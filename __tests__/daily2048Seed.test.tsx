import { render, waitFor, screen } from '@testing-library/react';
import Page2048 from '../apps/2048';
import { getDailySeed } from '../utils/dailySeed';

jest.mock('react-ga4', () => ({ event: jest.fn() }));
jest.mock('../utils/dailySeed');

test('daily seed produces identical starting boards', async () => {
  (getDailySeed as jest.Mock).mockResolvedValue('abcd');
  const { container: c1 } = render(<Page2048 />);
  await waitFor(() => {
    const cells = Array.from(c1.querySelectorAll('.grid > div > div'));
    expect(cells.filter((el) => el.textContent).length).toBe(2);
  });
  const board1 = Array.from(c1.querySelectorAll('.grid > div > div')).map((el) => el.textContent);

  const { container: c2 } = render(<Page2048 />);
  await waitFor(() => {
    const cells = Array.from(c2.querySelectorAll('.grid > div > div'));
    expect(cells.filter((el) => el.textContent).length).toBe(2);
  });
  const board2 = Array.from(c2.querySelectorAll('.grid > div > div')).map((el) => el.textContent);

  expect(board2).toEqual(board1);
});

test('renders status bar with key stats', async () => {
  (getDailySeed as jest.Mock).mockResolvedValue('abcd');
  render(<Page2048 />);
  await waitFor(() => {
    expect(screen.getByText(/Score:/)).toBeInTheDocument();
  });
  expect(screen.getByText(/Score:/).textContent).toMatch(/Score: \d+/);
  expect(screen.getByText(/Moves:/).textContent).toContain('0');
  expect(screen.getByText(/Timer:/)).toBeInTheDocument();
  expect(screen.getByText('Board: Classic')).toBeInTheDocument();
});

test('shows overlay when the player wins or loses', async () => {
  (getDailySeed as jest.Mock).mockResolvedValue('abcd');
  const { rerender, queryByRole } = render(<Page2048 testOverrides={{ won: false, lost: false }} />);
  await waitFor(() => {
    expect(screen.getByText(/Score:/)).toBeInTheDocument();
  });
  expect(queryByRole('dialog')).toBeNull();

  rerender(<Page2048 testOverrides={{ won: true, lost: false }} />);
  await waitFor(() => {
    expect(screen.getByRole('dialog')).toHaveTextContent(/Victory!/);
    expect(screen.getByText(/Highest Tile/)).toBeInTheDocument();
  });

  rerender(<Page2048 testOverrides={{ won: false, lost: true }} />);
  await waitFor(() => {
    expect(screen.getByRole('dialog')).toHaveTextContent(/Game Over/);
  });
});
