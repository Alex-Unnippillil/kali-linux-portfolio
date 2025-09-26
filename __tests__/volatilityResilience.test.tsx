import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('../public/demo-data/volatility/plugins.json', () => []);

describe('Volatility demo resilience', () => {
  test('PluginBrowser renders with empty plugin dataset', () => {
    const PluginBrowser = require('../components/apps/volatility/PluginBrowser').default;
    render(<PluginBrowser />);

    expect(screen.getByText(/educational use only/i)).toBeInTheDocument();
    expect(screen.queryByText('pslist')).not.toBeInTheDocument();
  });

  test('PluginWalkthrough provides fallback content without plugins', () => {
    const PluginWalkthrough =
      require('../apps/volatility/components/PluginWalkthrough').default;
    render(<PluginWalkthrough />);

    expect(screen.getByText(/No plugin data available/i)).toBeInTheDocument();
  });
});
