import { render, waitFor } from '@testing-library/react';
import Page2048 from '../apps/2048';
import { getDailySeed } from '../utils/dailySeed';

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
