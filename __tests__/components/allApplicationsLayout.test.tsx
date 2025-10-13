import React from 'react';
import { render, screen } from '@testing-library/react';
import AllApplications from '../../components/screen/all-applications';

type AppConfig = {
  id: string;
  title: string;
  icon: string;
};

const buildApp = (id: string, title: string): AppConfig => ({
  id,
  title,
  icon: '/icons/test.png',
});

const baseApps: AppConfig[] = [
  buildApp('terminal', 'Terminal'),
  buildApp('files', 'Files'),
  buildApp('settings', 'Settings'),
  buildApp('calculator', 'Calculator'),
];

const findAppButton = async (id: string, name: string) => {
  const candidates = await screen.findAllByRole('button', { name: new RegExp(`^${name}$`, 'i') });
  const match = candidates.find((candidate) => candidate.getAttribute('data-app-id') === id);
  expect(match).toBeTruthy();
  return match!;
};

describe('AllApplications responsive layout', () => {
  beforeEach(() => {
    window.localStorage?.clear();
  });

  it('uses a three to four column grid on mobile breakpoints', async () => {
    render(<AllApplications apps={baseApps} games={[]} openApp={() => {}} />);

    const systemHeading = await screen.findByText('System & Workspace');
    const folderContainer = systemHeading.closest('summary')?.parentElement;
    expect(folderContainer).toBeTruthy();

    const grid = folderContainer?.querySelector('div.mt-4.grid');
    expect(grid).toBeTruthy();
    expect(grid).toHaveClass('grid-cols-3');
    expect(grid).toHaveClass('min-[420px]:grid-cols-4');
    expect(grid).toHaveClass('md:grid-cols-4');

    const terminalButton = await findAppButton('terminal', 'Terminal');
    const tile = terminalButton.closest('div.relative');
    expect(tile).toBeTruthy();
    expect(tile).toHaveClass('aspect-[4/5]');
    expect(tile).toHaveClass('md:aspect-auto');
  });

  it('applies the responsive grid to the favorites section', async () => {
    window.localStorage?.setItem('launcherFavorites', JSON.stringify(['terminal', 'files']));

    render(<AllApplications apps={baseApps} games={[]} openApp={() => {}} />);

    const favoritesRegion = await screen.findByRole('region', { name: /favorites apps/i });
    const grid = favoritesRegion.querySelector('div.mt-4.grid');
    expect(grid).toBeTruthy();
    expect(grid).toHaveClass('grid-cols-3');
    expect(grid).toHaveClass('min-[420px]:grid-cols-4');

    const favoriteTile = await findAppButton('files', 'Files');
    const tileContainer = favoriteTile.closest('div.relative');
    expect(tileContainer).toBeTruthy();
    expect(tileContainer).toHaveClass('aspect-[4/5]');
  });
});
