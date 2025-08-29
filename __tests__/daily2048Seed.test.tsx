import { render, waitFor } from '@testing-library/react';
import Page2048 from '../apps/2048';
import { getDailySeed } from '../utils/dailySeed';

jest.mock('react-ga4', () => ({ event: jest.fn() }));
jest.mock('../utils/dailySeed');

test('daily seed produces identical starting boards', async () => {
  (getDailySeed as jest.Mock).mockResolvedValue('abcd');
  const { container: c1 } = render(<Page2048 />);
  await waitFor(() => {
    expect(c1.querySelectorAll('.grid > div > div').length).toBe(16);
  });
  const board1 = Array.from(c1.querySelectorAll('.grid > div > div')).map((el) => el.textContent);

  const { container: c2 } = render(<Page2048 />);
  await waitFor(() => {
    expect(c2.querySelectorAll('.grid > div > div').length).toBe(16);
  });
  const board2 = Array.from(c2.querySelectorAll('.grid > div > div')).map((el) => el.textContent);

  expect(board2).toEqual(board1);
});
