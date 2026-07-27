import { act, render, screen } from '@testing-library/react';

import WeatherAppPage from '../pages/apps/weather.jsx';

describe('WeatherAppPage layout and loading states', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it('stacks segmented controls vertically by default for narrow layouts', () => {
    render(<WeatherAppPage />);

    const citySelector = screen.getByRole('radiogroup', { name: /choose a forecast city/i });
    const unitSelector = screen.getByRole('radiogroup', { name: /toggle temperature unit/i });

    expect(citySelector.className).toContain('flex-col');
    expect(unitSelector.className).toContain('flex-col');
  });

  it('renders skeleton cards while loading and reveals content after fetch completes', () => {
    render(<WeatherAppPage />);

    expect(screen.getByTestId('current-conditions-skeleton')).toBeInTheDocument();
    expect(screen.getByTestId('hourly-forecast-skeleton')).toBeInTheDocument();
    expect(screen.getByTestId('weather-highlights-skeleton')).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(400);
    });

    expect(screen.queryByTestId('current-conditions-skeleton')).not.toBeInTheDocument();
    expect(screen.queryByTestId('hourly-forecast-skeleton')).not.toBeInTheDocument();
    expect(screen.queryByTestId('weather-highlights-skeleton')).not.toBeInTheDocument();

    expect(screen.getByText(/current conditions/i)).toBeInTheDocument();
    expect(screen.getByText(/hourly forecast/i)).toBeInTheDocument();
    expect(screen.getByText(/atmospheric highlights/i)).toBeInTheDocument();
  });
});

