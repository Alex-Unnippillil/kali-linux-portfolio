import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import Memory from '@components/apps/memory';
import { FLIP_BACK_DELAY } from '@components/apps/memory_utils';

jest.mock('@components/apps/memory_utils', () => ({
  THEME_PACKS: { fruits: ['A', 'B'] },
  createDeck: () => [
    { id: 0, value: 'A' },
    { id: 1, value: 'B' },
    { id: 2, value: 'A' },
    { id: 3, value: 'B' },
  ],
  MATCH_PAUSE: 600,
  FLIP_BACK_DELAY: 200,
}));

describe('Memory game', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('detects matches and updates score', () => {
    const { getAllByRole, getByText } = render(<Memory />);
    const cards = getAllByRole('button');
    fireEvent.click(cards[0]);
    fireEvent.click(cards[2]);
    act(() => {
      jest.runAllTimers();
    });
    expect(getByText(/Score: 10/)).toBeInTheDocument();
  });

  it('flips unmatched cards back after delay', () => {
    const { getAllByRole } = render(<Memory />);
    const cards = getAllByRole('button');
    fireEvent.click(cards[0]);
    fireEvent.click(cards[1]);
    const firstInner = cards[0].firstChild as HTMLElement;
    expect(firstInner).toHaveStyle('transform: rotateY(180deg)');
    act(() => {
      jest.advanceTimersByTime(FLIP_BACK_DELAY);
    });
    expect(firstInner).toHaveStyle('transform: rotateY(0deg)');
  });
});
