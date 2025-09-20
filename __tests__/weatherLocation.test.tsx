import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import WeatherApp from '../apps/weather';

describe('Weather app location modal', () => {
  const originalGeolocation = navigator.geolocation;

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    if (originalGeolocation) {
      Object.defineProperty(navigator, 'geolocation', {
        value: originalGeolocation,
        configurable: true,
      });
    } else {
      delete (navigator as any).geolocation;
    }
    localStorage.clear();
  });

  it('requests geolocation and stores a location when permission is granted', async () => {
    const getCurrentPosition = jest.fn(
      (
        success: PositionCallback,
        _error?: PositionErrorCallback | null,
      ) => {
        success({
          coords: { latitude: 51.5, longitude: -0.12 },
        } as unknown as GeolocationPosition);
      },
    );

    Object.defineProperty(navigator, 'geolocation', {
      value: { getCurrentPosition },
      configurable: true,
    });

    jest.spyOn(global, 'fetch').mockResolvedValue({
      json: async () => ({
        current_weather: { temperature: 20, weathercode: 1 },
        daily: { time: [], temperature_2m_max: [], weathercode: [] },
      }),
    } as unknown as Response);

    render(<WeatherApp />);

    await waitFor(() => expect(getCurrentPosition).toHaveBeenCalled());

    await screen.findByText(
      /Last location: Current Location \(51\.50, -0\.12\)/i,
    );
    expect(screen.getByText('Current Location')).toBeInTheDocument();

    const stored = localStorage.getItem('weather-last-location');
    expect(stored).toContain('51.5');
  });

  it('falls back to manual entry when geolocation is denied', async () => {
    const getCurrentPosition = jest.fn(
      (
        _success: PositionCallback,
        error?: PositionErrorCallback | null,
      ) => {
        error?.({ message: 'Permission denied' } as unknown as GeolocationPositionError);
      },
    );

    Object.defineProperty(navigator, 'geolocation', {
      value: { getCurrentPosition },
      configurable: true,
    });

    jest.spyOn(global, 'fetch').mockResolvedValue({
      json: async () => ({
        current_weather: { temperature: 20, weathercode: 1 },
        daily: { time: [], temperature_2m_max: [], weathercode: [] },
      }),
    } as unknown as Response);

    render(<WeatherApp />);

    const errorMessage = await screen.findByText(/permission denied/i);
    expect(errorMessage).toBeInTheDocument();

    const nameInput = screen.getByPlaceholderText(/city name/i);
    fireEvent.change(nameInput, { target: { value: 'Testville' } });
    fireEvent.change(screen.getByPlaceholderText(/latitude/i), {
      target: { value: '10' },
    });
    fireEvent.change(screen.getByPlaceholderText(/longitude/i), {
      target: { value: '20' },
    });

    fireEvent.click(
      screen.getByRole('button', { name: /save manual location/i }),
    );

    await screen.findByText(/Last location: Testville \(10\.00, 20\.00\)/i);
    expect(screen.getByText('Testville')).toBeInTheDocument();

    expect(localStorage.getItem('weather-manual-city-entry')).toContain(
      'Testville',
    );
    expect(localStorage.getItem('weather-last-location')).toContain('Testville');
  });
});
