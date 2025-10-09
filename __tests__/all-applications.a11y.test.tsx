import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import AllApplications from '../components/screen/all-applications';

jest.mock('next/image', () => {
  const MockedImage = (props: any) => <img {...props} alt={props.alt || ''} />;
  MockedImage.displayName = 'MockedImage';
  return MockedImage;
});

describe('All applications grid accessibility', () => {
  const APPS = Array.from({ length: 6 }, (_, index) => ({
    id: `app-${index + 1}`,
    title: `App ${index + 1}`,
    icon: './icon.png',
  }));

  beforeEach(() => {
    window.localStorage?.clear?.();
  });

  test('exposes grid semantics with positional metadata', async () => {
    render(<AllApplications apps={APPS} games={[]} openApp={jest.fn()} />);

    const grid = await screen.findByRole('grid', { name: 'Group 1 apps' });
    expect(grid).toBeInTheDocument();
    expect(grid).toHaveAttribute('aria-labelledby');

    const tiles = Array.from(grid.querySelectorAll('[data-roving-focus="true"]'));
    expect(tiles).toHaveLength(6);
    tiles.forEach((tile, index) => {
      expect(tile).toHaveAttribute('aria-setsize', '6');
      expect(tile).toHaveAttribute('aria-posinset', String(index + 1));
    });

    expect(tiles[0]).toHaveAttribute('tabindex', '0');
    tiles.slice(1).forEach((tile) => {
      expect(tile).toHaveAttribute('tabindex', '-1');
    });
  });

  test('supports roving focus with arrow keys across the grid', async () => {
    render(<AllApplications apps={APPS} games={[]} openApp={jest.fn()} />);

    const grid = await screen.findByRole('grid', { name: 'Group 1 apps' });
    const tiles = Array.from(grid.querySelectorAll('[data-roving-focus="true"]'));

    tiles[0].focus();
    fireEvent.keyDown(tiles[0], { key: 'ArrowRight' });
    expect(document.activeElement).toBe(tiles[1]);
    expect(tiles[1]).toHaveAttribute('tabindex', '0');
    expect(tiles[0]).toHaveAttribute('tabindex', '-1');

    fireEvent.keyDown(tiles[1], { key: 'ArrowDown' });
    expect(document.activeElement).toBe(tiles[4]);
    expect(tiles[4]).toHaveAttribute('tabindex', '0');
    expect(tiles[1]).toHaveAttribute('tabindex', '-1');

    fireEvent.keyDown(tiles[4], { key: 'ArrowUp' });
    expect(document.activeElement).toBe(tiles[1]);
  });
});
