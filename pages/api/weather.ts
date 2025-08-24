import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { lat, lon, units } = req.query;
  if (!lat || !lon) {
    res.status(400).json({ error: 'Missing latitude or longitude' });
    return;
  }

  const temperature_unit = units === 'imperial' ? 'fahrenheit' : 'celsius';
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m&daily=temperature_2m_max,temperature_2m_min&temperature_unit=${temperature_unit}&timezone=auto`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      const text = await response.text();
      res.status(response.status).json({ error: text || 'Weather API request failed' });
      return;
    }
    const data = await response.json();
    res.status(200).json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Unexpected error' });
  }
}
