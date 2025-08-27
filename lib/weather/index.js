export const DEFAULT_LOCATION = {
  name: 'New York',
  latitude: 40.7128,
  longitude: -74.0060,
};

export async function getForecast({ latitude, longitude }) {
  const params = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    current_weather: 'true',
    hourly: 'temperature_2m,precipitation_probability',
    daily:
      'weathercode,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max',
    timezone: 'auto',
  });
  const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch forecast');
  return res.json();
}
