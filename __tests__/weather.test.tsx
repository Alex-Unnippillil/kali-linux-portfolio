import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import Weather from '../components/apps/weather';

describe('Weather app', () => {
  beforeEach(() => {
    localStorage.clear();
    // reset navigator.onLine
    Object.defineProperty(window.navigator, 'onLine', {
      value: true,
      configurable: true,
    });
  });

  test('unit toggle converts values', () => {
    const { getByTestId } = render(<Weather />);
    const temp = getByTestId('current-temp');
    expect(temp.textContent).toBe('21°C');
    fireEvent.click(getByTestId('toggle-unit'));
    expect(temp.textContent).toBe('70°F');
  });

  test('demo renders without network', () => {
    // simulate fetch missing
    // @ts-ignore
    global.fetch = undefined;
    const { getByText } = render(<Weather />);
    expect(getByText('Demo City')).toBeInTheDocument();
  });

  test('favorite persists', async () => {
    const forecast = {
      current_weather: { temperature: 10 },
      daily: {
        time: ['2023-01-01'],
        temperature_2m_max: [15],
        temperature_2m_min: [5],
        sunrise: ['2023-01-01T07:00'],
        sunset: ['2023-01-01T17:00'],
      },
    };
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        json: () =>
          Promise.resolve({ results: [{ name: 'Paris', latitude: 1, longitude: 2 }] }),
      })
      .mockResolvedValueOnce({ json: () => Promise.resolve(forecast) });

    const { getByPlaceholderText, getByText, getByLabelText, unmount, getByTestId } = render(
      <Weather />
    );
    fireEvent.change(getByPlaceholderText('Search city...'), {
      target: { value: 'Paris' },
    });
    fireEvent.click(getByText('Search'));
    await waitFor(() => expect(getByText('Paris')).toBeInTheDocument());
    fireEvent.click(getByLabelText('favorite'));
    await waitFor(() =>
      expect(JSON.parse(localStorage.getItem('weather-favs') || '[]')[0].name).toBe(
        'Paris'
      )
    );
    unmount();

    const { getByTestId: getByTestId2 } = render(<Weather />);
    const favs = getByTestId2('favorites');
    expect(favs.textContent).toContain('Paris');
  });

  test('offline shows cached data', async () => {
    const forecast = {
      current_weather: { temperature: 10 },
      daily: {
        time: ['2023-01-01'],
        temperature_2m_max: [15],
        temperature_2m_min: [5],
        sunrise: ['2023-01-01T07:00'],
        sunset: ['2023-01-01T17:00'],
      },
    };
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        json: () =>
          Promise.resolve({ results: [{ name: 'Paris', latitude: 1, longitude: 2 }] }),
      })
      .mockResolvedValueOnce({ json: () => Promise.resolve(forecast) });

    const { getByPlaceholderText, getByText, getByTestId, unmount } = render(<Weather />);
    fireEvent.change(getByPlaceholderText('Search city...'), {
      target: { value: 'Paris' },
    });
    fireEvent.click(getByText('Search'));
    await waitFor(() => expect(getByTestId('now-card')).toBeInTheDocument());
    unmount();

    // simulate offline
    Object.defineProperty(window.navigator, 'onLine', {
      value: false,
      configurable: true,
    });
    // @ts-ignore
    global.fetch = undefined;

    const { getByText: getByText2 } = render(<Weather />);
    expect(getByText2('Paris')).toBeInTheDocument();
  });
});
