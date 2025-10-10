import React from 'react';
import { render, screen } from '@testing-library/react';
import UbuntuApp from '../../components/base/ubuntu_app';

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, ...props }: { src: string; alt: string; [key: string]: unknown }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} {...props} />
  ),
}));

describe('UbuntuApp status badges', () => {
  const baseProps = {
    id: 'test-app',
    name: 'Test App',
    icon: '/icon.png',
    openApp: jest.fn(),
  };

  it('renders a running badge when the app is active', () => {
    render(<UbuntuApp {...baseProps} isRunning />);

    const badge = screen.getByTestId('ubuntu-app-status-badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute('data-variant', 'running');
    expect(screen.getByText('Status: Running')).toBeInTheDocument();
  });

  it('renders a minimized badge when the app is minimized', () => {
    render(<UbuntuApp {...baseProps} isRunning isMinimized />);

    const badge = screen.getByTestId('ubuntu-app-status-badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute('data-variant', 'minimized');
    expect(screen.getByText('Status: Running (minimized)')).toBeInTheDocument();
  });

  it('hides the badge when the app is not running', () => {
    render(<UbuntuApp {...baseProps} />);

    expect(screen.queryByTestId('ubuntu-app-status-badge')).not.toBeInTheDocument();
    expect(screen.queryByText(/Status:/)).not.toBeInTheDocument();
  });
});
