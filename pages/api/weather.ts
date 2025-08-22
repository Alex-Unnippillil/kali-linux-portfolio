export const runtime = 'edge';

export default async function handler(req: Request): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');
  const city = searchParams.get('city');
  const units = searchParams.get('units') || 'metric';
  const apiKey = process.env.OPENWEATHER_API_KEY;

  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'missing api key' }), { status: 500 });
  }

  try {
    let latitude = lat;
    let longitude = lon;

    if (!latitude || !longitude) {
      if (!city) {
        return new Response(JSON.stringify({ error: 'missing location' }), { status: 400 });
      }
      const geoRes = await fetch(
        `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&appid=${apiKey}`
      );
      const geoData = await geoRes.json();
      if (!geoData[0]) {
        return new Response(JSON.stringify({ error: 'city not found' }), { status: 404 });
      }
      latitude = geoData[0].lat;
      longitude = geoData[0].lon;
    }

    const weatherRes = await fetch(
      `https://api.openweathermap.org/data/3.0/onecall?lat=${latitude}&lon=${longitude}&units=${units}&appid=${apiKey}`
    );
    const weather = await weatherRes.json();

    return new Response(JSON.stringify(weather), {
      status: 200,
      headers: {
        'content-type': 'application/json',
        'cache-control': 's-maxage=600',
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'failed to fetch weather' }), { status: 500 });
  }
}
