import React from 'react';
import { render, screen } from '@testing-library/react';
import BeefPage from '../apps/beef/index';

jest.mock('next/image', () => ({
  __esModule: true,
  default: function MockedImage(props: React.ImgHTMLAttributes<HTMLImageElement>) {
    const { src, alt, priority, sizes, placeholder, ...rest } = props;
    return <img src={typeof src === 'string' ? src : ''} alt={alt ?? ''} {...rest} />;
  },
}));

describe('BeEF page chrome', () => {
  test('renders summary metrics and timeline badges', () => {
    render(<BeefPage />);

    expect(screen.queryAllByText(/Active hooks/i).length).toBeGreaterThan(0);
    expect(screen.queryAllByText(/Campaign status/i).length).toBeGreaterThan(0);
    expect(screen.queryAllByText(/Last check-in/i).length).toBeGreaterThan(0);

    expect(screen.queryAllByText('Recon').length).toBeGreaterThan(0);
    expect(screen.queryAllByText('Delivery').length).toBeGreaterThan(0);
    expect(screen.queryAllByText('Post-Exploitation').length).toBeGreaterThan(0);
  });

  test('shows severity chips with relative timestamps', () => {
    render(<BeefPage />);

    expect(screen.queryAllByText('Informational').length).toBeGreaterThan(0);
    expect(screen.queryAllByText('Warning').length).toBeGreaterThan(0);
    expect(screen.queryAllByText('Critical').length).toBeGreaterThan(0);

    expect(screen.queryAllByText('+0s').length).toBeGreaterThan(0);
    expect(screen.queryAllByText('+2s').length).toBeGreaterThan(0);
    expect(screen.queryAllByText('+6s').length).toBeGreaterThan(0);
    expect(screen.queryAllByText(/6s ago/).length).toBeGreaterThan(0);
  });
});
