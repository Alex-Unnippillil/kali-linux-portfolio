import React from 'react';
import { render } from '@testing-library/react';
import WordSearch from '../apps/word_search';
import { useRouter } from 'next/router';

jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}));

describe('word search selection', () => {
  it('prevents default text selection on drag', () => {
    (useRouter as jest.Mock).mockReturnValue({
      query: { seed: 'seed', words: 'CAT,DOG' },
      pathname: '/',
      replace: jest.fn(),
    });
    const { container } = render(<WordSearch />);
    const cell = container.querySelector('.grid > div') as HTMLElement;
    const event = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    cell.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });
});
