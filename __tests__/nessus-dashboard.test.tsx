import { render, screen } from '@testing-library/react';
import NessusDashboard from '../pages/nessus-dashboard';

describe('Nessus dashboard summary', () => {
  test('displays severity cards', () => {
    render(<NessusDashboard />);
    expect(screen.getByText('Nessus Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Critical')).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument();
    expect(screen.getByText('Medium')).toBeInTheDocument();
    expect(screen.getByText('Low')).toBeInTheDocument();
  });
});
