import type { NextApiRequest, NextApiResponse } from 'next';
import { setupUrlGuard } from '../../lib/urlGuard';
setupUrlGuard();

interface WeatherApiResponse {
  current_weather: {
    temperature: number;
    [key: string]: unknown;
  };
  hourly: {
    temperature_2m: number[];
  };
  daily: {
    temperature_2m_max: number[];
    temperature_2m_min: number[];
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { lat, lon, units } = req.query;
  if (!lat || !lon) {
    res.status(400).json({ error: 'Missing latitude or longitude' });
    return;
  }

  const temperature_unit = units === 'imperial' ? 'fahrenheit' : 'celsius';

  // Request current weather, hourly temps and a 7 day forecast from Open-Meteo
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current_weather=true&hourly=temperature_2m` +
    `&daily=temperature_2m_max,temperature_2m_min&forecast_days=7` +
    `&temperature_unit=${temperature_unit}&timezone=auto`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      const text = await response.text();
      res
        .status(response.status)
        .json({ error: text || 'Weather API request failed' });
      return;
    }
    const data: WeatherApiResponse = await response.json();

    // Cache for 10 minutes at the edge; clients can also cache
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate');
    res.status(200).json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    res.status(500).json({ error: message });
  }
}
