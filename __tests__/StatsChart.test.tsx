import React from 'react';
import { render } from '@testing-library/react';

import StatsChart from '../components/StatsChart';

describe('StatsChart', () => {
  it('renders a snapshot for populated values', () => {
    const { container } = render(<StatsChart count={1200000} time={420} />);

    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders a snapshot when values are zero', () => {
    const { container } = render(<StatsChart count={0} time={0} />);

    expect(container.firstChild).toMatchSnapshot();
  });
});
