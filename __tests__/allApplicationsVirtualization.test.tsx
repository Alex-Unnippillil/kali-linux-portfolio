import React from 'react';
import { render, screen, within, fireEvent } from '@testing-library/react';
import AllApplications from '../components/screen/all-applications';

beforeAll(() => {
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  // @ts-expect-error test environment polyfill
  global.ResizeObserver = ResizeObserverMock;
  if (!window.HTMLElement.prototype.scrollTo) {
    window.HTMLElement.prototype.scrollTo = () => {};
  }
});

describe('AllApplications virtualization', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const createApp = (index: number) => ({
    id: `custom-${index}`,
    title: `Utility ${index}`,
    icon: '/icons/app.png',
  });

  it('uses a virtualized grid when additional apps exceed the threshold', async () => {
    const apps = Array.from({ length: 40 }, (_, index) => createApp(index));
    render(
      <AllApplications
        apps={apps}
        games={[]}
        openApp={jest.fn()}
        headingId="test-all-apps-title"
      />,
    );
    const summary = screen.getByText('Additional Apps').closest('summary');
    expect(summary).not.toBeNull();
    if (summary) {
      fireEvent.click(summary);
    }
    const virtualGrid = await screen.findByTestId('virtual-grid-folder-other');
    expect(virtualGrid).toBeInTheDocument();
    const grid = within(virtualGrid).getByRole('grid');
    expect(grid).toHaveAttribute('aria-label', 'Additional Apps applications');
    expect(grid).toHaveAttribute('aria-describedby');
  });

  it('renders a static grid when the dataset is small', async () => {
    const apps = Array.from({ length: 6 }, (_, index) => createApp(index));
    render(
      <AllApplications
        apps={apps}
        games={[]}
        openApp={jest.fn()}
        headingId="test-all-apps-title"
      />,
    );
    expect(
      screen.queryByTestId('virtual-grid-folder-other'),
    ).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Search applications'), {
      target: { value: 'Utility' },
    });
    const details = screen.getByText('Additional Apps').closest('details');
    expect(details).not.toBeNull();
    if (!details) {
      throw new Error('Additional Apps folder not found');
    }
    expect(within(details).getByRole('grid')).toBeInTheDocument();
  });
});
