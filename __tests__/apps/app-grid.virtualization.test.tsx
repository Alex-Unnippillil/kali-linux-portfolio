import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

jest.mock('react-virtualized-auto-sizer', () => ({ children }: { children: (size: { width: number; height: number }) => React.ReactNode }) =>
  children({ width: 1024, height: 480 })
);

jest.mock('../../apps.config', () =>
  Array.from({ length: 150 }, (_, index) => ({
    id: `virtual-${index}`,
    title: `Virtual App ${index + 1}`,
    icon: '/icons/mock.svg',
  }))
);

import AppGrid from '../../components/apps/app-grid';
import appsList from '../../apps.config';

const LARGE_DATASET = appsList as Array<{ id: string; title: string; icon: string }>;

const globalScope = globalThis as typeof globalThis & { ResizeObserver?: typeof ResizeObserver };

if (typeof globalScope.ResizeObserver === 'undefined') {
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }

  globalScope.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;
}

const noop = () => {};

describe('AppGrid virtualization', () => {
  it('virtualizes large datasets by limiting rendered cells', async () => {
    render(<AppGrid openApp={noop} />);
    const grid = await screen.findByRole('grid', { name: /applications/i });
    await screen.findByLabelText('Virtual App 1');

    const cells = grid.querySelectorAll('[role="gridcell"]');
    expect(cells.length).toBeLessThan(LARGE_DATASET.length);
    expect(grid).toHaveAttribute('aria-rowcount', String(Math.ceil(LARGE_DATASET.length / 8)));
  });

  it('supports keyboard navigation across virtualized items', async () => {
    const user = userEvent.setup();
    render(<AppGrid openApp={noop} />);
    const grid = await screen.findByRole('grid', { name: /applications/i });
    const firstApp = await screen.findByLabelText('Virtual App 1');
    firstApp.focus();
    expect(document.activeElement).toBe(firstApp);

    await user.keyboard('{End}');
    await waitFor(() => {
      expect(grid).toHaveAttribute('aria-activedescendant', 'app-virtual-149');
      expect(document.getElementById('app-virtual-149')).toBeTruthy();
    });

    await waitFor(() => {
      expect(document.activeElement?.id).toBe('app-virtual-149');
    });
    expect(document.activeElement).toHaveAttribute('data-app-id', 'virtual-149');
  });
});
