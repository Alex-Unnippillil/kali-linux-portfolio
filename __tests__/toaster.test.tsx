import React from 'react';
import { render, screen } from '@testing-library/react';
import Toaster from '../components/system/Toaster';

describe('system toaster', () => {
  it('renders polite live regions for general updates and downloads', () => {
    render(<Toaster />);
    const regions = screen.getAllByRole('status');
    expect(regions).toHaveLength(2);
    regions.forEach((region) => {
      expect(region).toHaveAttribute('aria-live', 'polite');
    });
    const downloadRegion = regions.find((region) => region.id === 'download-live-region');
    const defaultRegion = regions.find((region) => region.id === 'live-region');
    expect(downloadRegion).toBeDefined();
    expect(defaultRegion).toBeDefined();
  });
});
