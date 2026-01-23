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

    expect(screen.getAllByText(/Active hooks/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Campaign status/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Last check-in/i).length).toBeGreaterThan(0);

    expect(screen.getAllByText('Recon').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Delivery').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Post-Exploitation').length).toBeGreaterThan(0);
  });

  test('shows severity chips with relative timestamps', () => {
    render(<BeefPage />);

    expect(screen.getByText('Informational')).toBeInTheDocument();
    expect(screen.getByText('Warning')).toBeInTheDocument();
    expect(screen.getByText('Critical')).toBeInTheDocument();

    expect(screen.getByText('+0s')).toBeInTheDocument();
    expect(screen.getByText('+2s')).toBeInTheDocument();
    expect(screen.getByText('+6s')).toBeInTheDocument();
    expect(screen.getAllByText(/6s ago/).length).toBeGreaterThan(0);
  });
});
