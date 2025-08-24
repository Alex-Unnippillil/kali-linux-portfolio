import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import Weather from '@components/apps/weather';

// Mock chart components which rely on canvas
jest.mock('react-chartjs-2', () => ({
  Line: () => <div data-testid="line-chart" />,
  Bar: () => <div data-testid="bar-chart" />,
}));

const mockGeolocation = {
  getCurrentPosition: jest.fn(),
};

beforeEach(() => {
  // @ts-ignore
  global.navigator.geolocation = mockGeolocation;
  mockGeolocation.getCurrentPosition.mockReset();
  // @ts-ignore
  global.fetch = jest.fn();
});

afterEach(() => {
  jest.resetAllMocks();
});

const mockWeather = {
  current_weather: { temperature: 20, time: '2024-05-01T00:00' },
  hourly: {
    time: Array.from({ length: 24 }, (_, i) => `2024-05-01T${String(i).padStart(2, '0')}:00`),
    temperature_2m: Array(24).fill(20),
  },
  daily: {
    time: ['2024-05-01', '2024-05-02'],
    temperature_2m_max: [25, 26],
    temperature_2m_min: [15, 16],
  },
};

describe('Weather app', () => {
  it('fetches and displays weather data', async () => {
    mockGeolocation.getCurrentPosition.mockImplementationOnce((success: any) =>
      success({ coords: { latitude: 10, longitude: 20 } })
    );

    // @ts-ignore
    (fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => mockWeather });

    render(<Weather />);

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith('/api/weather?lat=10&lon=20&units=metric')
    );

    expect(
      await screen.findByText(/Current temperature: 20°C/)
    ).toBeInTheDocument();
  });

  it('handles geolocation errors', () => {
    mockGeolocation.getCurrentPosition.mockImplementationOnce((_: any, error: any) =>
      error({ message: 'denied' })
    );

    render(<Weather />);
    expect(screen.getByText('denied')).toBeInTheDocument();
  });
});

