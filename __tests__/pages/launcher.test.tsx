import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import LauncherPage from '../../pages/launcher';

describe('LauncherPage', () => {
  test('filters applications as the user types', async () => {
    const user = userEvent.setup();
    render(<LauncherPage />);

    const searchBox = screen.getByRole('searchbox', { name: /search applications/i });
    await user.type(searchBox, 'chrome');

    await waitFor(() => {
      expect(screen.getByRole('gridcell', { name: /open google chrome/i })).toBeInTheDocument();
    });

    expect(screen.queryByRole('gridcell', { name: /open spotify/i })).not.toBeInTheDocument();
  });

  test('supports keyboard navigation between tiles', async () => {
    const user = userEvent.setup();
    render(<LauncherPage />);

    const tiles = await screen.findAllByRole('gridcell');
    await waitFor(() => {
      expect(tiles[0]).toHaveFocus();
    });

    await user.keyboard('{ArrowRight}');
    const updatedTiles = screen.getAllByRole('gridcell');
    await waitFor(() => {
      expect(updatedTiles[1]).toHaveFocus();
    });

    await user.keyboard('{End}');
    const finalTiles = screen.getAllByRole('gridcell');
    await waitFor(() => {
      expect(finalTiles[finalTiles.length - 1]).toHaveFocus();
    });
  });
});
