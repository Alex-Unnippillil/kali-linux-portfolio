import React from 'react';
import { render, screen } from '@testing-library/react';
import BeefPage from '../apps/beef/index';

jest.mock('next/image', () => ({
  __esModule: true,
  default: function MockedImage(props: React.ImgHTMLAttributes<HTMLImageElement>) {
    const { src, alt, ...rest } = props;
    return <img src={typeof src === 'string' ? src : ''} alt={alt ?? ''} {...rest} />;
  },
}));

describe('BeEF page chrome', () => {
  test('renders summary metrics and timeline badges', () => {
    render(<BeefPage />);

    expect(screen.getByText(/Active hooks/i)).toBeInTheDocument();
    expect(screen.getByText(/Campaign status/i)).toBeInTheDocument();
    expect(screen.getByText(/Last check-in/i)).toBeInTheDocument();

    expect(screen.getByText('Recon')).toBeInTheDocument();
    expect(screen.getByText('Delivery')).toBeInTheDocument();
    expect(screen.getByText('Post-Exploitation')).toBeInTheDocument();
  });

  test('shows severity chips with relative timestamps', () => {
    render(<BeefPage />);

    expect(screen.getByText('Informational')).toBeInTheDocument();
    expect(screen.getByText('Warning')).toBeInTheDocument();
    expect(screen.getByText('Critical')).toBeInTheDocument();

    expect(screen.getByText('+0s')).toBeInTheDocument();
    expect(screen.getByText('+2s')).toBeInTheDocument();
    expect(screen.getByText('+6s')).toBeInTheDocument();
    expect(screen.getByText(/6s ago/)).toBeInTheDocument();
  });
});
