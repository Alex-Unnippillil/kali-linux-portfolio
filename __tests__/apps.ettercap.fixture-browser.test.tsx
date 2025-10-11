import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';

import FixtureBrowser from '../apps/ettercap/components/FixtureBrowser';
import networkFixtures from '../components/apps/ettercap/fixtures';

describe('FixtureBrowser', () => {
  it('filters flows by host text', () => {
    render(
      <FixtureBrowser
        fixtures={networkFixtures}
        selectedId={networkFixtures[0].id}
      />,
    );

    const table = screen.getByRole('table', { name: /fixture flows/i });
    expect(within(table).getAllByRole('row')).toHaveLength(
      networkFixtures[0].flows.length + 1,
    );

    const hostFilter = screen.getByPlaceholderText('Filter by host or detail');
    fireEvent.change(hostFilter, { target: { value: '172.16.0.50' } });

    const rows = within(table).getAllByRole('row');
    expect(rows).toHaveLength(4);
    expect(within(table).getAllByText('172.16.0.50').length).toBeGreaterThan(0);
    expect(within(table).queryByText('00:00:01.214')).toBeNull();
  });

  it('filters by protocol and shows fallback notice', () => {
    render(
      <FixtureBrowser
        fixtures={networkFixtures}
        selectedId={networkFixtures[1].id}
      />,
    );

    const protocolFilter = screen.getByLabelText(/protocol filter/i);
    fireEvent.change(protocolFilter, { target: { value: 'TLS' } });
    const table = screen.getByRole('table', { name: /fixture flows/i });
    expect(within(table).getAllByText('TLS').length).toBeGreaterThan(0);

    const hostFilter = screen.getByPlaceholderText('Filter by host or detail');
    fireEvent.change(hostFilter, { target: { value: 'no-match' } });
    expect(
      screen.getByText(/No flows matched the filters; showing the full capture instead/i),
    ).toBeInTheDocument();
  });
});
