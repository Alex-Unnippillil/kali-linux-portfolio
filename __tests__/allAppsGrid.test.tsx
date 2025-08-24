import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import AllApps from '@apps/all-apps';
import * as NextRouter from 'next/router';

jest.mock('../apps.config', () => ({
  __esModule: true,
  default: [
    { id: 'alpha', title: 'Alpha', icon: '/alpha.svg' },
    { id: 'beta', title: 'Beta', icon: '/beta.svg' },
  ],
  games: [
    { id: 'gamma', title: 'Gamma', icon: '/gamma.svg' },
  ],
}));

const push = jest.fn();
const prefetch = jest.fn();
jest.spyOn(NextRouter, 'useRouter').mockReturnValue({ push, prefetch } as any);

describe('AllApps component', () => {
  beforeEach(() => {
    push.mockReset();
    prefetch.mockReset();
  });

  it('filters apps by search term', () => {
    const { getByPlaceholderText, queryByText } = render(<AllApps />);
    const input = getByPlaceholderText('Search...');
    fireEvent.change(input, { target: { value: 'Alpha' } });
    expect(queryByText('Alpha')).toBeInTheDocument();
    expect(queryByText('Beta')).not.toBeInTheDocument();
  });

  it('prefetches app on hover', () => {
    const { getByText } = render(<AllApps />);
    const target = getByText('Alpha').closest('[data-grid-item]')!;
    fireEvent.mouseEnter(target);
    expect(prefetch).toHaveBeenCalledWith('/apps/alpha');
  });
});
