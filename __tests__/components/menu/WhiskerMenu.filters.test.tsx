import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

import WhiskerMenu from '../../../components/menu/WhiskerMenu';

describe('WhiskerMenu category filters', () => {
  beforeAll(() => {
    const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
    // @ts-expect-error override for tests
    window.requestAnimationFrame = (callback: FrameRequestCallback) => {
      callback(now());
      return 0;
    };
    // @ts-expect-error override for tests
    window.cancelAnimationFrame = () => {};
  });

  const openMenu = async () => {
    render(<WhiskerMenu />);
    fireEvent.click(screen.getByRole('button', { name: /applications/i }));
    await screen.findByTestId('whisker-menu-dropdown');
    await screen.findByRole('searchbox', { name: /search applications/i });
  };

  it('filters apps when a category chip is selected', async () => {
    await openMenu();

    const gamesChip = await screen.findByRole('button', { name: 'Games' });
    fireEvent.click(gamesChip);

    await screen.findByRole('button', { name: '2048' });
    expect(screen.queryByRole('button', { name: 'Firefox' })).not.toBeInTheDocument();
  });

  it('combines category filters with the search query', async () => {
    await openMenu();

    const gamesChip = await screen.findByRole('button', { name: 'Games' });
    fireEvent.click(gamesChip);

    const searchInput = await screen.findByRole('searchbox', { name: /search applications/i });
    fireEvent.change(searchInput, { target: { value: 'snake' } });

    await screen.findByRole('button', { name: 'Snake' });
    expect(screen.queryByRole('button', { name: '2048' })).not.toBeInTheDocument();
  });
});
