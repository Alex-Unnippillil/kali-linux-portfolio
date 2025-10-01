import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import WelcomeTour from '../components/common/WelcomeTour';
import { WelcomeTourProvider, useWelcomeTour } from '../hooks/useWelcomeTour';
import usePrefersReducedMotion from '../hooks/usePrefersReducedMotion';

jest.mock('../hooks/usePrefersReducedMotion', () => ({
  __esModule: true,
  default: jest.fn(() => false),
}));

const mockedUsePrefersReducedMotion = usePrefersReducedMotion as jest.MockedFunction<
  typeof usePrefersReducedMotion
>;

const renderWithProvider = (children: React.ReactNode) =>
  render(<WelcomeTourProvider>{children}</WelcomeTourProvider>);

describe('WelcomeTour', () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockedUsePrefersReducedMotion.mockReturnValue(false);
  });

  afterEach(() => {
    mockedUsePrefersReducedMotion.mockReset();
  });

  it('persists progress between mounts', () => {
    const { unmount } = renderWithProvider(<WelcomeTour />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Step 1 of/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Next/i }));
    expect(screen.getByText(/Step 2 of/i)).toBeInTheDocument();

    unmount();

    renderWithProvider(<WelcomeTour />);
    expect(screen.getByText(/Step 2 of/i)).toBeInTheDocument();
  });

  it('can restart the tour after skipping', () => {
    let controls: ReturnType<typeof useWelcomeTour> | null = null;

    const Controller = () => {
      controls = useWelcomeTour();
      return null;
    };

    renderWithProvider(
      <>
        <WelcomeTour />
        <Controller />
      </>,
    );

    fireEvent.click(screen.getByRole('button', { name: /Skip welcome tour/i }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Resume welcome tour/i })).toBeInTheDocument();

    act(() => {
      controls?.restartTour();
    });

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Step 1 of/i)).toBeInTheDocument();
  });

  it('respects reduced motion preference', () => {
    mockedUsePrefersReducedMotion.mockReturnValue(true);

    renderWithProvider(<WelcomeTour />);

    expect(screen.getByRole('dialog')).toHaveAttribute('data-reduced-motion', 'true');
  });
});
