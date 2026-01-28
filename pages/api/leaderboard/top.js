export default async function handler(
  req,
  res,
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).end('Method Not Allowed');
    return;
  }

  const game = typeof req.query.game === 'string' ? req.query.game : '2048';
  const limit = Number(req.query.limit ?? 10);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.warn('Leaderboard read disabled: missing Supabase env');
    res.status(503).json([]);
    return;
  }

  try {
    const query = encodeURI(`game=eq.${game}`);
    const resp = await fetch(
      `${url}/rest/v1/leaderboard?select=username,score,game&${query}&order=score.desc&limit=${limit}`,
      {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
      },
    );
    if (!resp.ok) {
      const errorText = await resp.text();
      console.error('Supabase REST error:', errorText);
      res
        .status(500)
        .json({ error: errorText || 'Failed to fetch leaderboard' });
      return;
    }
    const data = await resp.json();
    res.status(200).json(data ?? []);
  } catch (err) {
    console.error('Leaderboard fetch failed:', err);
    res.status(500).json({ error: err.message });
  }
}
