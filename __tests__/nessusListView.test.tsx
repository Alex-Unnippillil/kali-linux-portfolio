import React from 'react';
import { render, screen } from '@testing-library/react';
import ListView from '../apps/nessus/components/ListView';
import type { Plugin } from '../apps/nessus/types';

describe('Nessus plugin list view', () => {
  const samplePlugin: Plugin = {
    id: 42,
    name: 'Sample plugin',
    severity: 'High',
    cwe: ['79'],
    cve: ['2023-1234'],
    tags: ['demo'],
  };

  it('renders skeleton while loading', () => {
    render(
      <ListView
        plugins={[]}
        loading
        hasMore={false}
        onScroll={() => {}}
      />
    );

    const section = screen.getByLabelText('Plugin feed');
    expect(section).toHaveAttribute('aria-busy', 'true');
    expect(section.querySelector('[aria-hidden="true"]')).toBeInTheDocument();
  });

  it('renders plugin cards when data is available', () => {
    render(
      <ListView
        plugins={[samplePlugin]}
        loading={false}
        hasMore={false}
        onScroll={() => {}}
      />
    );

    const section = screen.getByLabelText('Plugin feed');
    expect(section).toHaveAttribute('aria-busy', 'false');
    expect(screen.getByText('Sample plugin')).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument();
  });

  it('shows an empty state message when no plugins remain after filtering', () => {
    render(
      <ListView
        plugins={[]}
        loading={false}
        hasMore={false}
        onScroll={() => {}}
      />
    );

    expect(
      screen.getByText('No results match the selected filters.')
    ).toBeInTheDocument();
  });

  it('announces when more results are available', () => {
    render(
      <ListView
        plugins={[samplePlugin]}
        loading={false}
        hasMore
        onScroll={() => {}}
      />
    );

    expect(
      screen.getByText('Scroll to load more...')
    ).toBeInTheDocument();
  });
});
