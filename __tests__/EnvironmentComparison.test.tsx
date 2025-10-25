import React from 'react';
import { render, screen } from '@testing-library/react';
import EnvironmentComparison from '../components/apps/environment-comparison';

describe('EnvironmentComparison', () => {
  it('renders environment headers', () => {
    render(<EnvironmentComparison />);
    expect(screen.getByText('Bare Metal')).toBeInTheDocument();
    expect(screen.getByText('VM')).toBeInTheDocument();
    expect(screen.getByText('WSL')).toBeInTheDocument();
    expect(screen.getByText('Cloud')).toBeInTheDocument();
  });
});
