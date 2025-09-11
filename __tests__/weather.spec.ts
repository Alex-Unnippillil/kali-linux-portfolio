import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import WeatherWidget from '../apps/weather_widget';

describe('WeatherWidget error handling', () => {
  beforeEach(() => {
    // Prevent background interval from creating open handles
    jest.spyOn(global, 'setInterval').mockImplementation(() => 0 as any);
    // Mock fetch: first call fails, next calls succeed
    (global as any).fetch = jest
      .fn()
      .mockRejectedValueOnce(new Error('network fail'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          main: { temp: 15, feels_like: 10 },
          weather: [{ description: 'Sunny', icon: '01d' }],
          sys: { sunrise: 1000, sunset: 2000 },
        }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ list: [] }) });
    localStorage.clear();
  });

  afterEach(() => {
    (setInterval as unknown as jest.SpyInstance).mockRestore?.();
  });

  it('shows friendly error then recovers on retry', async () => {
    const { container } = render(React.createElement(WeatherWidget));
    await waitFor(() => container.querySelector('#city-search'));
    const cityInput = container.querySelector('#city-search') as HTMLInputElement;
    const apiInput = container.querySelector('#api-key-input') as HTMLInputElement;
    const saveBtn = container.querySelector('#save-api-key') as HTMLButtonElement;
    const errorEl = container.querySelector('#error-message') as HTMLElement;
    const tempEl = container.querySelector('.temp') as HTMLElement;
    const widget = container.querySelector('#weather') as HTMLElement;

    cityInput.value = 'Paris';
    apiInput.value = 'key';
    fireEvent.click(saveBtn); // first attempt fails

    await waitFor(() => {
      expect(errorEl.textContent).toContain('Unable to fetch weather data');
    });

    fireEvent.click(saveBtn); // retry succeeds
    await waitFor(() => expect((fetch as jest.Mock).mock.calls.length).toBe(3));
    fireEvent.animationEnd(widget);
    await waitFor(() => expect(errorEl.textContent).toBe(''));
    expect(tempEl.textContent).toBe('15°C');
  });
});
