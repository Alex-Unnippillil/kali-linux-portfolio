import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import PluginBrowser from '../components/apps/volatility/PluginBrowser';

describe('Volatility PluginBrowser', () => {
  test('filters plugins and shows output', () => {
    render(<PluginBrowser />);
    // disclaimer is visible
    expect(
      screen.getByText(/educational use only/i)
    ).toBeInTheDocument();

    // initially all plugins are listed
    expect(screen.getByText('pslist')).toBeInTheDocument();
    expect(screen.getByText('netscan')).toBeInTheDocument();
    expect(screen.getByText('malfind')).toBeInTheDocument();

    // filter by category
    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'Network' },
    });
    expect(screen.getByText('netscan')).toBeInTheDocument();
    expect(screen.queryByText('pslist')).toBeNull();

    // display plugin output
    fireEvent.click(screen.getByText('netscan'));
    expect(screen.getByText(/Proto LocalAddr/)).toBeInTheDocument();
  });
});
