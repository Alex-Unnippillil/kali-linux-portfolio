import { act, fireEvent, render, screen } from '@testing-library/react';
import Tour, { TOUR_PRESETS } from '../components/system/Tour';

const STORAGE_KEY = 'system-tour.mode';

describe('System Tour pacing', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    window.sessionStorage.clear();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it('auto-advances detailed steps by default', () => {
    render(<Tour />);

    expect(
      screen.getByRole('heading', { name: TOUR_PRESETS.detailed[0].title })
    ).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(TOUR_PRESETS.detailed[0].duration);
    });

    expect(
      screen.getByRole('heading', { name: TOUR_PRESETS.detailed[1].title })
    ).toBeInTheDocument();
  });

  it('switches to fast mode and persists selection for the session', () => {
    const { unmount } = render(<Tour />);

    fireEvent.click(screen.getByRole('button', { name: 'Fast' }));

    expect(
      screen.getByRole('heading', { name: TOUR_PRESETS.fast[0].title })
    ).toBeInTheDocument();
    expect(window.sessionStorage.getItem(STORAGE_KEY)).toBe('fast');

    unmount();

    render(<Tour />);

    expect(
      screen.getByRole('heading', { name: TOUR_PRESETS.fast[0].title })
    ).toBeInTheDocument();
  });

  it('renders progress dots for each step and allows direct navigation', () => {
    render(<Tour />);

    const dots = screen.getAllByRole('button', { name: /go to step/i });
    expect(dots).toHaveLength(TOUR_PRESETS.detailed.length);

    fireEvent.click(
      screen.getByRole('button', {
        name: `Go to step 3: ${TOUR_PRESETS.detailed[2].title}`,
      })
    );

    expect(
      screen.getByText(TOUR_PRESETS.detailed[2].description)
    ).toBeInTheDocument();
  });
});
