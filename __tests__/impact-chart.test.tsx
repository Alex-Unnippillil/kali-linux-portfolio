import { render, screen } from '@testing-library/react';
import ImpactChart from '../components/ImpactChart';

describe('ImpactChart', () => {
  it('renders accessible chart with data source', () => {
    render(<ImpactChart />);
    expect(
      screen.getByRole('img', { name: /vulnerability impact metrics/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/Data source:/i)).toBeInTheDocument();
  });
});
